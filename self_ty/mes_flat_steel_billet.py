from datetime import datetime, timedelta
from dbroute import DBROUTE
import sys
import io
import uuid
import time
import logging
from contextlib import contextmanager
from typing import Dict, Any, Optional

# 首先修复标准输出编码
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer,
        encoding='utf-8',
        errors='replace',
        line_buffering=True
    )

if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer,
        encoding='utf-8',
        errors='replace',
        line_buffering=True
    )


# 配置日志（重点修复编码问题）
def setup_logging():
    """设置日志，确保中文正常显示"""
    # 获取根logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # 清除所有已有的handler
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        handler.close()

    # 创建formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 控制台handler - 使用当前sys.stdout的编码
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # 文件handler - 明确指定UTF-8编码
    try:
        file_handler = logging.FileHandler(
            'cost_accumulation.log',
            encoding='utf-8',
            mode='w'  # 每次运行重新创建，避免追加时的编码问题
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"创建文件日志失败: {e}")

    logger.addHandler(console_handler)

    return logger


# 初始化日志
logger = setup_logging()

# 设置标准输出编码为UTF-8
sys.stdout = io.TextIOWrapper(
    open(sys.stdout.fileno(), 'wb', 0),
    encoding='utf-8',
    write_through=True
)


class Config:
    """配置类"""
    # 常量定义
    COMMON_FIELDS = (
        "COST_ACCUMULATION_CODE, COST_CENTER_CODE, COST_CENTER_NAME, MATERIAL_CODE, "
        "MATERIAL_NAME, H2O_COEF, METER_UNIT_CODE, METER_UNIT_NAME, SUPP_AMOUNT, "
        "OPER_TYPE, RECEIPT_TYPE, TRANS_TYPE, OPER_TIME, STEEL_GRADE, WAREHOUSE_CODE, "
        "WAREHOUSE_NAME, SUPPLY_STOCK_ORG_CODE, SUPPLY_STOCK_ORG_NAME, "
        "NEED_STOCK_ORG_CODE, NEED_STOCK_ORG_NAME, COST_OBJECT_CODE, "
        "COST_OBJECT_NAME, COST_ORG_CODE, COST_ORG_NAME, STATUS"
    )

    # 成本中心配置
    COST_CENTER_CONFIG = {
        '267101': {  # 1780热连轧板卷车间
            'name': '1780热连轧板卷车间',
            'inventory_config': {
                'warehouse_code': '3226',
                'warehouse_name': '板卷半成品仓库',
                'material_code_field': 'PZ_CODE',
                'material_name_field': 'MATERIAL_NAME',
                'cost_object_code': 'PZ_CODE',
                'cost_object_name': 'MATERIAL_NAME',
                'join_condition': "INNER JOIN T_BPES_STOCK_REAL@IMES_PES1 s1 ON s1.item_no = A.item_no and s1.press_status = '是'"  #
            },
            'stock_real_config': {
                'warehouse_code': '3103',
                'warehouse_name': '三炼钢产品库',
                'is_hot_rolling': True,
                'material_field': 'C_BILLET_MAT_ID',
                'material_name_field': 'MATE_NAME'
            }
        },
        '267102': {  # 平整线
            'name': '平整线',
            'inventory_config': {
                'warehouse_code': '3225',
                'warehouse_name': '板卷仓库',
                'material_code_field': 'MATE_CODE',
                'material_name_field': 'CAS.MATE_NAME',
                'cost_object_code': 'CAS.MATE_CODE',
                'cost_object_name': 'CAS.MATE_NAME',
                'join_condition': "INNER JOIN T_SD_PROD_STOCK_REAL@IMES_PMS s1 ON s1.item_no = A.item_no AND s1.STOCKTYPE='平整'"  # 保持原样
            },
            'stock_real_config': {
                'warehouse_code': '3226',
                'warehouse_name': '板卷半成品仓库',
                'is_hot_rolling': False,
                'material_field': 'PZ_CODE',
                'material_name_field': 'MATERIAL_NAME'
            }
        }
    }

    # 通用配置
    COMMON_VALUES = {
        'org_code': '10019904',
        'org_name': '轧钢厂',
        'company_code': '2000',
        'company_name': '石横特钢集团有限公司',
        'status': '生效',
        'usage_code': '500101',
        'usage_name': '车间—生产领料'
    }

    # 通用配置
    COMMON_VALUES2 = {
        'org_code': '10019903',
        'org_name': '炼钢厂',
        'company_code': '2000',
        'company_name': '石横特钢集团有限公司',
        'status': '生效',
        'usage_code': '500101',
        'usage_name': '车间—生产领料'
    }


class SQLBuilder:
    """SQL构建器"""

    @staticmethod
    def get_oper_time_sql() -> str:
        """获取操作时间SQL"""
        today = datetime.now()
        oper_time = today.replace(day=28, hour=0, minute=0, second=0, microsecond=0)
        return f"TO_TIMESTAMP('{oper_time.strftime('%Y-%m-%d %H:%M:%S.%f')}', 'YYYY-MM-DD HH24:MI:SS.FF')"

    @staticmethod
    def build_base_query(join_condition: str, weight_field: str, material_field: str) -> str:
        """构建基础查询"""
        return f"""
        SELECT 
            A.MATE_CODE,
            A.MATE_NAME,
            NVL(ma.MATERIAL_NAME,'**未配置-物料表**') MATERIAL_NAME,
            A.STEEL_GRADE_NAME, 
            A.PZ_CODE, 
            SUM({weight_field}) AS wgt
        FROM t_sd_prod_stock_in A
        {join_condition}
        LEFT JOIN T_MD_MATERIAL ma ON A.{material_field} = ma.MATERIAL_CODE
        WHERE A.PZ_CODE IS NOT NULL
            AND TRUNC(A.PZ_CODE_TIME, 'MM') = TRUNC(SYSDATE, 'MM')
            AND {weight_field} > 0
        GROUP BY  
            A.MATE_CODE, A.MATE_NAME, NVL(ma.MATERIAL_NAME,'**未配置-物料表**'), 
            A.STEEL_GRADE_NAME, A.{material_field}, A.PZ_CODE
        """

    @staticmethod
    def build_hot_rolling_query() -> str:
        """构建热轧查询"""
        return """
               SELECT A.MATE_CODE, \
                      me.MATERIAL_NAME    AS MATE_NAME, \
                      A.STEEL_GRADE_NAME, \
                      A.PZ_CODE, \
                      NVL(ma.MATERIAL_NAME,'**未配置-物料表**') MATERIAL_NAME, \
                      m.C_BILLET_MAT_ID, \
                      SUM(m.c_billet_wgt) AS wgt
               FROM t_sd_prod_stock_in A
                        INNER JOIN T_TPES_MAIN@IMES_PES1 m
                                   ON m.c_coil_no = SUBSTR(a.item_no, 1, 11)
                                       AND m.c_billet_wgt > 0
                        LEFT JOIN T_MD_MATERIAL ma ON A.PZ_CODE = ma.MATERIAL_CODE
                        INNER JOIN T_MD_MATERIAL me ON m.C_BILLET_MAT_ID = me.MATERIAL_CODE
               WHERE A.PZ_CODE IS NOT NULL
                 AND TRUNC(A.PZ_CODE_TIME, 'MM') = TRUNC(SYSDATE, 'MM')
               GROUP BY A.MATE_CODE, \
                        me.MATERIAL_NAME, \
                        A.STEEL_GRADE_NAME, \
                        A.PZ_CODE, \
                        NVL(ma.MATERIAL_NAME,'**未配置-物料表**'), \
                        m.C_BILLET_MAT_ID \
               """


class DatabaseManager:
    """数据库管理器"""

    @contextmanager
    def get_connection(self):
        """获取数据库连接（上下文管理器）"""
        db = None
        try:
            db = DBROUTE(50)
            yield db
        except Exception as e:
            logger.error(f"数据库连接失败: {str(e)}")
            raise
        finally:
            if db and hasattr(db, 'close'):
                db.close()

    def execute_with_retry(self, db, query: str, operation: str, max_retries: int = 3) -> bool:
        """带重试的SQL执行"""
        for attempt in range(max_retries):
            try:
                logger.info(f"开始执行SQL: {query}")
                db.ExecNonQuery(query)
                logger.info(f"{operation} - 第{attempt + 1}次尝试成功")
                return True
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"{operation} - 最终失败: {str(e)}")
                    raise
                logger.warning(f"{operation} - 第{attempt + 1}次尝试失败: {str(e)}")
                time.sleep(2 ** attempt)  # 指数退避
        return False


class CostAccumulationService:
    """成本累积服务类"""

    def __init__(self):
        self.db_manager = DatabaseManager()
        self.sql_builder = SQLBuilder()
        self.config = Config()

    def delete_old_data(self, db) -> bool:
        """删除旧数据"""
        oper_time_sql = self.sql_builder.get_oper_time_sql()
        logger.info("开始删除旧数据...")

        delete_sql = f"""
        DELETE FROM t_co_cost_accumulation  
        WHERE 
            CREATE_STAFF = '平整半成品'
            AND OPER_TIME = {oper_time_sql}
            AND COLLECT_STATUS = '已采集'
        """

        return self.db_manager.execute_with_retry(db, delete_sql, "删除旧数据")

    def insert_inventory(self, db, cost_center_code: str, cost_center_config: Dict[str, Any]) -> bool:
        """插入生产入库单"""
        logger.info(f"开始插入生产入库单 - 成本中心: {cost_center_config['name']}")

        oper_time_sql = self.sql_builder.get_oper_time_sql()
        inventory_config = cost_center_config['inventory_config']

        # 对于平整线，使用简化查询
        if cost_center_code == '267102':
            # 使用您提供的简化查询
            simplified_query = """
                               SELECT A.MATE_CODE,
                                      A.MATE_NAME,
                                      NVL(ma.MATERIAL_NAME, '**未配置-物料表**') MATERIAL_NAME,
                                      A.STEEL_GRADE_NAME,
                                      A.PZ_CODE,
                                      SUM(act_weight) AS                         wgt
                               FROM t_sd_prod_stock_in A
                                        LEFT JOIN T_MD_MATERIAL ma ON A.MATE_CODE = ma.MATERIAL_CODE
                               WHERE A.PZ_CODE IS NOT NULL
                                 AND TRUNC(A.PZ_CODE_TIME, 'MM') = TRUNC(SYSDATE, 'MM')
                                 AND (is_cancel is null or is_cancel = '否')
                                 AND stock_in_type in ('生产入库', '改判入库')
                               GROUP BY A.MATE_CODE, A.MATE_NAME, NVL(ma.MATERIAL_NAME, '**未配置-物料表**'),
                                        A.STEEL_GRADE_NAME, A.PZ_CODE \
                               """

            insert_sql = f"""
            INSERT INTO t_co_cost_accumulation(
                {self.config.COMMON_FIELDS},
                COLLECT_NUM, COLLECT_STAFF, COLLECT_TIME, COLLECT_STATUS,
                ALLOCATION_NUM, REMAIN_NUM, ALLOCATION_RULE, PRICE, REMARK,
                CREATE_STAFF, CREATE_TIME, SUPP_ATTRI_CODE, SUPP_ATTRI_NAME
            )
            SELECT 
                '待结附带@' || SYS_GUID(),
                '{cost_center_code}', '{cost_center_config['name']}',
                CAS.MATE_CODE, CAS.MATE_NAME,
                '0.00000000', 'dun', '吨', '0.00000000',
                '普通生产入库', '生产入库单', '完工合格入库', {oper_time_sql},
                STEEL_GRADE_NAME, '{inventory_config['warehouse_code']}', '{inventory_config['warehouse_name']}',
                '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
                '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
                CAS.PZ_CODE, NVL(CAS.MATERIAL_NAME, '**未配置-物料表**'),
                '{self.config.COMMON_VALUES['company_code']}', '{self.config.COMMON_VALUES['company_name']}',
                '{self.config.COMMON_VALUES['status']}',
                CAS.wgt, '平整半成品', SYSDATE, '已采集', '0.00000000',
                CAS.wgt, '', '0.00000000',
                'SCRKD@{cost_center_config['name']}' || TO_CHAR(SYSDATE, 'YYYY-MM') || '@' || CAS.PZ_CODE || '@实重',
                '平整半成品', SYSDATE, '', ''
            FROM ({simplified_query}) cas
            """
        else:
            # 其他成本中心保持原有逻辑
            join_condition = inventory_config.get('join_condition')
            if not join_condition:
                join_condition = "INNER JOIN T_SD_PROD_STOCK_REAL@IMES_PMS s1 ON s1.item_no = A.item_no AND s1.STOCKTYPE='平整'"

            subquery = self.sql_builder.build_base_query(
                join_condition=join_condition,
                weight_field="s1.stock_in_act_weight",
                material_field=inventory_config['material_code_field']
            )

            insert_sql = f"""
            INSERT INTO t_co_cost_accumulation(
                {self.config.COMMON_FIELDS},
                COLLECT_NUM, COLLECT_STAFF, COLLECT_TIME, COLLECT_STATUS,
                ALLOCATION_NUM, REMAIN_NUM, ALLOCATION_RULE, PRICE, REMARK,
                CREATE_STAFF, CREATE_TIME, SUPP_ATTRI_CODE, SUPP_ATTRI_NAME
            )
            SELECT 
                '待结附带@' || SYS_GUID(),
                '{cost_center_code}', '{cost_center_config['name']}',
                {inventory_config['material_code_field']}, {inventory_config['material_name_field']},
                '0.00000000', 'dun', '吨', '0.00000000',
                '普通生产入库', '生产入库单', '完工合格入库', {oper_time_sql},
                STEEL_GRADE_NAME, {inventory_config['warehouse_code']}, '{inventory_config['warehouse_name']}',
                '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
                '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
                {inventory_config['cost_object_code']}, {inventory_config['cost_object_name']},
                '{self.config.COMMON_VALUES['company_code']}', '{self.config.COMMON_VALUES['company_name']}',
                '{self.config.COMMON_VALUES['status']}',
                CAS.wgt, '平整半成品', SYSDATE, '已采集', '0.00000000',
                CAS.wgt, '', '0.00000000',
                'SCRKD@{cost_center_config['name']}' || TO_CHAR(SYSDATE, 'YYYY-MM') || '@' || CAS.PZ_CODE || '@实重',
                '平整半成品', SYSDATE, '', ''
            FROM ({subquery}) cas
            """

        return self.db_manager.execute_with_retry(db, insert_sql, f"插入生产入库单-{cost_center_config['name']}")

    def insert_stock_real_normal(self, db, cost_center_code: str, cost_center_config: Dict[str, Any]) -> bool:
        """插入平整线领料出库单"""
        logger.info(f"开始插入 - 领料出库单 - 成本中心: {cost_center_config['name']}")

        oper_time_sql = self.sql_builder.get_oper_time_sql()
        stock_config = cost_center_config['stock_real_config']

        # 构建子查询
        subquery = self.sql_builder.build_base_query(
            join_condition="INNER JOIN T_BPES_STOCK_REAL@IMES_PES1 s1 ON s1.item_no = A.item_no and s1.press_status = '是'",
            weight_field="s1.stock_in_act_weight",
            material_field=stock_config['material_field']
        )

        insert_sql = f"""
        INSERT INTO t_co_cost_accumulation(
            {self.config.COMMON_FIELDS},
            USAGE_CODE, USAGE_NAME, COLLECT_NUM, COLLECT_STAFF, COLLECT_TIME, COLLECT_STATUS,
            ALLOCATION_NUM, REMAIN_NUM, ALLOCATION_RULE, PRICE, REMARK,
            CREATE_STAFF, CREATE_TIME, SUPP_ATTRI_CODE, SUPP_ATTRI_NAME
        )
        SELECT 
            '待结附带@' || SYS_GUID(),
            '{cost_center_code}', '{cost_center_config['name']}',
            {stock_config['material_field']}, {stock_config['material_name_field']},
            '0.00000000', 'dun', '吨', '0.00000000',
            '普通领料', '领料出库单', '领发料出库-参与生产成本核算', {oper_time_sql},
            STEEL_GRADE_NAME, {stock_config['warehouse_code']}, '{stock_config['warehouse_name']}',
            '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
            '{self.config.COMMON_VALUES['org_code']}', '{self.config.COMMON_VALUES['org_name']}',
            CAS.MATE_CODE, CAS.MATE_NAME,
            '{self.config.COMMON_VALUES['company_code']}', '{self.config.COMMON_VALUES['company_name']}',
            '{self.config.COMMON_VALUES['status']}',
            '{self.config.COMMON_VALUES['usage_code']}', '{self.config.COMMON_VALUES['usage_name']}',
            CAS.wgt, '平整半成品', SYSDATE, '已采集', '0.00000000',
            CAS.wgt, '', '0.00000000',
            'LLCKD@{cost_center_config['name']}' || TO_CHAR(SYSDATE, 'YYYY-MM') || 
            '@{cost_center_config['name']}' || {stock_config['material_field']} || '@' || cas.MATE_CODE,
            '平整半成品', SYSDATE, '', ''
        FROM ({subquery}) cas
        """

        return self.db_manager.execute_with_retry(db, insert_sql, f"插入领料出库单-{cost_center_config['name']}")

    def insert_stock_real_hot_rolling(self, db, cost_center_code: str, cost_center_config: Dict[str, Any]) -> bool:
        """插入热轧领料出库单"""
        logger.info(f"开始插入 - 热轧领料出库单 - 成本中心: {cost_center_config['name']}")

        oper_time_sql = self.sql_builder.get_oper_time_sql()
        stock_config = cost_center_config['stock_real_config']

        # 使用热轧专用查询
        subquery = self.sql_builder.build_hot_rolling_query()

        insert_sql = f"""
        INSERT INTO t_co_cost_accumulation(
            {self.config.COMMON_FIELDS},
            USAGE_CODE, USAGE_NAME, COLLECT_NUM, COLLECT_STAFF, COLLECT_TIME, COLLECT_STATUS,
            ALLOCATION_NUM, REMAIN_NUM, ALLOCATION_RULE, PRICE, REMARK,
            CREATE_STAFF, CREATE_TIME, SUPP_ATTRI_CODE, SUPP_ATTRI_NAME
        )
        SELECT 
            '待结附带@' || SYS_GUID(),
            '{cost_center_code}', '{cost_center_config['name']}',
            C_BILLET_MAT_ID, {stock_config['material_name_field']},
            '0.00000000', 'dun', '吨', '0.00000000',
            '普通领料', '领料出库单', '领发料出库-参与生产成本核算', {oper_time_sql},
            STEEL_GRADE_NAME, {stock_config['warehouse_code']}, '{stock_config['warehouse_name']}',
            '{self.config.COMMON_VALUES2['org_code']}', '{self.config.COMMON_VALUES2['org_name']}',
            '{self.config.COMMON_VALUES2['org_code']}', '{self.config.COMMON_VALUES2['org_name']}',
            PZ_CODE, MATERIAL_NAME,
            '{self.config.COMMON_VALUES2['company_code']}', '{self.config.COMMON_VALUES2['company_name']}',
            '{self.config.COMMON_VALUES2['status']}',
            '{self.config.COMMON_VALUES2['usage_code']}', '{self.config.COMMON_VALUES2['usage_name']}',
            CAS.wgt, '平整半成品', SYSDATE, '已采集', '0.00000000',
            CAS.wgt, '', '0.00000000',
            'LLCKD@{cost_center_config['name']}' || TO_CHAR(SYSDATE, 'YYYY-MM') || 
            '@{cost_center_config['name']}{stock_config['warehouse_name']}@' || 
            {stock_config['material_field']} || '@' || cas.MATE_CODE,
            '平整半成品', SYSDATE, '', ''
        FROM ({subquery}) cas
        """

        return self.db_manager.execute_with_retry(db, insert_sql, f"插入热轧领料出库单-{cost_center_config['name']}")

    def process_cost_center(self, db, cost_center_code: str) -> bool:
        """处理单个成本中心"""
        cost_center_config = self.config.COST_CENTER_CONFIG.get(cost_center_code)
        if not cost_center_config:
            logger.error(f"未知的成本中心代码: {cost_center_code}")
            return False

        try:
            logger.info(f"开始处理成本中心: {cost_center_config['name']}")

            # 插入生产入库单
            if not self.insert_inventory(db, cost_center_code, cost_center_config):
                return False

            # 插入领料出库单
            if cost_center_config['stock_real_config']['is_hot_rolling']:
                success = self.insert_stock_real_hot_rolling(db, cost_center_code, cost_center_config)
            else:
                success = self.insert_stock_real_normal(db, cost_center_code, cost_center_config)

            if success:
                logger.info(f"成本中心 {cost_center_config['name']} 处理完成")
            return success

        except Exception as e:
            logger.error(f"处理成本中心 {cost_center_config['name']} 时出错: {str(e)}")
            return False

    def run(self) -> bool:
        """主运行方法"""
        logger.info("开始执行成本累积数据更新流程")
        start_time = time.time()

        try:
            with self.db_manager.get_connection() as db:
                # 删除旧数据
                if not self.delete_old_data(db):
                    logger.error("删除旧数据失败，终止流程")
                    return False

                # 处理所有成本中心
                cost_centers = ['267101', '267102']  # 可配置的成本中心列表
                all_success = True

                for center_code in cost_centers:
                    if not self.process_cost_center(db, center_code):
                        all_success = False
                        logger.error(f"成本中心 {center_code} 处理失败")
                    # 添加短暂延迟，避免数据库压力
                    time.sleep(1)

                execution_time = time.time() - start_time
                if all_success:
                    logger.info(f"成本累积数据更新完成，总耗时: {execution_time:.2f}秒")
                else:
                    logger.warning(f"成本累积数据更新部分完成，总耗时: {execution_time:.2f}秒")

                return all_success

        except Exception as e:
            logger.error(f"程序执行失败: {str(e)}")
            return False


def main():
    """主函数"""
    service = CostAccumulationService()
    success = service.run()

    if success:
        print("\n" + "=" * 80)
        print("库存数据更新完成")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("库存数据更新失败，请查看日志文件了解详情")
        print("=" * 80)
        sys.exit(1)


if __name__ == '__main__':
    main()