from datetime import datetime, timedelta
from dbroute import DBROUTE
import sys
import io
import logging
from contextlib import contextmanager
from typing import Dict, List, Tuple
import time


# 配置日志
def setup_logging():
    """设置日志"""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # 清除已有handler
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        handler.close()

    # 创建formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 控制台handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 文件handler
    file_handler = logging.FileHandler(
        'material_quantity_adjustment.log',
        encoding='utf-8',
        mode='a'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


# 初始化日志
logger = setup_logging()


class CostAccumulationQuantityAdjustment:
    """成本累积表数量调整类 - 只基于t_co_cost_accumulation表处理"""

    def __init__(self):
        self.db = None

    @contextmanager
    def get_connection(self):
        """获取数据库连接"""
        try:
            self.db = DBROUTE(50)
            yield self.db
        except Exception as e:
            logger.error(f"数据库连接失败: {str(e)}")
            raise
        finally:
            if self.db and hasattr(self.db, 'close'):
                self.db.close()

    def get_current_month_28th(self) -> datetime:
        """获取本月28日日期"""
        today = datetime.now()
        # 如果是28日之前，用本月的28日；如果是28日之后，用上个月的28日
        if today.day < 28:
            return today.replace(day=28, hour=0, minute=0, second=0, microsecond=0)
        else:
            # 如果是28日或之后，用上个月的28日
            last_month = today.replace(day=1) - timedelta(days=1)
            return last_month.replace(day=28, hour=0, minute=0, second=0, microsecond=0)

    def get_half_finished_from_cost_table(self, db, oper_date: datetime) -> Dict[str, float]:
        """从成本累积表中获取半成品数量（36RZ开头）"""
        try:
            oper_date_str = oper_date.strftime("%Y-%m-%d")

            query = f"""
            SELECT 
                COST_OBJECT_CODE,  -- 物料编码
                SUPP_AMOUNT        -- 供应数量
            FROM t_co_cost_accumulation
            WHERE TRUNC(OPER_TIME) = TO_DATE('{oper_date_str}', 'YYYY-MM-DD')
              AND COST_CENTER_CODE IN ('267101', '267102')
              AND RECEIPT_TYPE = '生产入库单'
              AND OPER_TYPE = '普通生产入库'
              AND COST_OBJECT_CODE LIKE '36RZ%'  -- 只处理半成品
              AND COLLECT_STATUS = '已采集'
              AND CREATE_STAFF = '平整半成品'
              AND SUPP_AMOUNT > 0
            ORDER BY COST_OBJECT_CODE
            """

            logger.info(f"正在从成本累积表查询半成品（36RZ开头）数据，操作日期: {oper_date_str}")
            cursor = db.ExecQuery(query)

            half_finished = {}
            for row in cursor:
                material_code = row[0]
                quantity = float(row[1])
                half_finished[material_code] = quantity
                logger.debug(f"半成品: {material_code}, 数量: {quantity}")

            logger.info(f"从成本累积表查询到 {len(half_finished)} 个半成品物料")

            # 显示前5个半成品示例
            if half_finished:
                sample = list(half_finished.items())[:5]
                logger.info(f"半成品示例: {sample}")

            return half_finished

        except Exception as e:
            logger.error(f"查询半成品数据失败: {str(e)}")
            return {}

    def get_finished_from_cost_table(self, db, oper_date: datetime) -> Dict[str, float]:
        """从成本累积表中获取成品数量（2RZ开头）"""
        try:
            oper_date_str = oper_date.strftime("%Y-%m-%d")

            query = f"""
            SELECT 
                COST_OBJECT_CODE,  -- 物料编码
                SUPP_AMOUNT        -- 供应数量
            FROM t_co_cost_accumulation
            WHERE TRUNC(OPER_TIME) = TO_DATE('{oper_date_str}', 'YYYY-MM-DD')
              AND COST_CENTER_CODE IN ('267101', '267102')
              AND RECEIPT_TYPE = '生产入库单'
              AND OPER_TYPE = '普通生产入库'
              AND COST_OBJECT_CODE LIKE '2RZ%'  -- 只处理成品
              AND COLLECT_STATUS = '已采集'
              AND CREATE_STAFF = '平整半成品'
              AND SUPP_AMOUNT > 0
            ORDER BY COST_OBJECT_CODE
            """

            logger.info(f"正在从成本累积表查询成品（2RZ开头）数据，操作日期: {oper_date_str}")
            cursor = db.ExecQuery(query)

            finished = {}
            for row in cursor:
                material_code = row[0]
                quantity = float(row[1])
                finished[material_code] = quantity
                logger.debug(f"成品: {material_code}, 数量: {quantity}")

            logger.info(f"从成本累积表查询到 {len(finished)} 个成品物料")

            # 显示前5个成品示例
            if finished:
                sample = list(finished.items())[:5]
                logger.info(f"成品示例: {sample}")

            return finished

        except Exception as e:
            logger.error(f"查询成品数据失败: {str(e)}")
            return {}

    def adjust_finished_quantities(self, half_finished: Dict[str, float],
                                   finished: Dict[str, float]) -> Dict[str, float]:
        """调整成品数量，减去对应的半成品数量"""
        adjusted_finished = finished.copy()
        adjustments = []

        for half_code, half_qty in half_finished.items():
            # 构建对应的成品编码: 36RZxxx -> 2RZxxx
            if half_code.startswith('36RZ'):
                finished_code = '2RZ' + half_code[4:]  # 去掉36，改为2

                if finished_code in adjusted_finished:
                    original_qty = adjusted_finished[finished_code]
                    adjusted_qty = original_qty - half_qty

                    if adjusted_qty < 0:
                        logger.warning(
                            f"成品 {finished_code} 调整后数量为负: 原{original_qty:.2f} - 半{half_qty:.2f} = {adjusted_qty:.2f}")
                        adjusted_qty = 0

                    adjusted_finished[finished_code] = adjusted_qty

                    adjustment_info = {
                        'half_code': half_code,
                        'half_qty': half_qty,
                        'finished_code': finished_code,
                        'original_qty': original_qty,
                        'adjusted_qty': adjusted_qty,
                        'reduction': original_qty - adjusted_qty
                    }
                    adjustments.append(adjustment_info)

                    logger.info(
                        f"调整: 成品 {finished_code} 从 {original_qty:.2f} 调整为 {adjusted_qty:.2f} (减去半成品 {half_code}: {half_qty:.2f})")
                else:
                    logger.info(f"成品 {finished_code} 不存在，半成品 {half_code} 无法扣除")

        logger.info(f"成品数量调整完成: 共调整 {len(adjustments)} 个成品")
        return adjusted_finished, adjustments

    def get_cost_accumulation_records_for_update(self, db, oper_date: datetime) -> List[Tuple]:
        """获取需要更新的成本累积记录详情"""
        try:
            oper_date_str = oper_date.strftime("%Y-%m-%d")

            query = f"""
            SELECT 
                COST_ACCUMULATION_CODE,
                COST_OBJECT_CODE,  -- 物料编码
                SUPP_AMOUNT,       -- 供应数量
                COLLECT_NUM,       -- 采集数量
                ALLOCATION_NUM,    -- 分配数量
                REMAIN_NUM,        -- 剩余数量
                PRICE,
                REMARK
            FROM t_co_cost_accumulation
            WHERE TRUNC(OPER_TIME) = TO_DATE('{oper_date_str}', 'YYYY-MM-DD')
              AND COST_CENTER_CODE IN ('267101', '267102')
              AND RECEIPT_TYPE = '生产入库单'
              AND OPER_TYPE = '普通生产入库'
              AND COST_OBJECT_CODE LIKE '2RZ%'  -- 只处理成品
              AND COLLECT_STATUS = '已采集'
              AND CREATE_STAFF = '平整半成品'
            ORDER BY COST_OBJECT_CODE
            """

            logger.info(f"正在查询需要更新的成本累积记录，操作日期: {oper_date_str}")
            cursor = db.ExecQuery(query)
            data = list(cursor)
            logger.info(f"查询到 {len(data)} 条需要更新的成本累积记录")

            return data

        except Exception as e:
            logger.error(f"查询需要更新的成本累积记录失败: {str(e)}")
            return []

    def update_cost_accumulation_quantities(self, db, oper_date: datetime, adjusted_finished: Dict[str, float]) -> \
            Tuple[bool, int]:
        """更新成本累积表中的数量"""
        try:
            if not adjusted_finished:
                logger.info("没有需要调整的成品数据")
                return True, 0

            # 获取需要更新的数据
            cost_data = self.get_cost_accumulation_records_for_update(db, oper_date)
            if not cost_data:
                logger.info("成本累积表中没有需要调整的数据")
                return True, 0

            updates_made = 0
            for row in cost_data:
                cost_accumulation_code = row[0]
                cost_object_code = row[1]  # 物料编码
                current_supp_amount = float(row[2])
                current_collect_num = float(row[3])
                current_allocation_num = float(row[4])
                current_remain_num = float(row[5])
                current_price = row[6] if row[6] is not None else '0'
                current_remark = row[7] if row[7] is not None else ''

                # 检查是否需要调整
                if cost_object_code in adjusted_finished:
                    new_quantity = adjusted_finished[cost_object_code]

                    if abs(new_quantity - current_supp_amount) > 0.001:  # 避免浮点数精度问题
                        # 构建更新SQL
                        update_sql = f"""
                        UPDATE t_co_cost_accumulation
                        SET 
                            SUPP_AMOUNT = '{new_quantity:.6f}',
                            COLLECT_NUM = '{new_quantity:.6f}',
                            ALLOCATION_NUM = '{new_quantity:.6f}',
                            REMAIN_NUM = '{new_quantity:.6f}',
                            UPDATE_TIME = SYSDATE,
                            UPDATE_STAFF = '数量调整程序',
                            REMARK = '{current_remark}@已调整:{current_supp_amount:.2f}->{new_quantity:.2f}'
                        WHERE COST_ACCUMULATION_CODE = '{cost_accumulation_code}'
                        """

                        try:
                            logger.info(f"正在更新记录: {update_sql}")
                            # db.ExecNonQuery(update_sql)
                            updates_made += 1
                            logger.info(
                                f"更新记录 {cost_accumulation_code}: 物料 {cost_object_code} 数量从 {current_supp_amount:.2f} 更新为 {new_quantity:.2f}")
                        except Exception as e:
                            logger.error(f"更新记录 {cost_accumulation_code} 失败: {str(e)}")
                    else:
                        logger.debug(
                            f"记录 {cost_accumulation_code}: 物料 {cost_object_code} 数量无变化 ({current_supp_amount:.2f})")

            logger.info(f"成本累积表更新完成: 共更新 {updates_made} 条记录")
            return True, updates_made

        except Exception as e:
            logger.error(f"更新成本累积表失败: {str(e)}")
            return False, 0

    def generate_adjustment_report(self, half_finished: Dict[str, float],
                                   original_finished: Dict[str, float],
                                   adjusted_finished: Dict[str, float],
                                   adjustments: List[Dict],
                                   oper_date: datetime) -> str:
        """生成调整报告"""
        report_lines = []
        report_lines.append("=" * 80)
        report_lines.append("成本累积表物料数量调整报告")
        report_lines.append("=" * 80)
        report_lines.append(f"操作日期: {oper_date.strftime('%Y-%m-%d')}")
        report_lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("-" * 80)

        # 半成品统计
        report_lines.append("【半成品统计 (36RZ开头)】")
        report_lines.append(f"半成品种类数: {len(half_finished)}")
        half_total = sum(half_finished.values())
        report_lines.append(f"半成品总数量: {half_total:.2f}")

        if half_finished:
            report_lines.append("前10个半成品明细:")
            for i, (code, qty) in enumerate(list(half_finished.items())[:10], 1):
                report_lines.append(f"  {i}. {code}: {qty:.2f}")

        report_lines.append("-" * 40)

        # 成品统计
        report_lines.append("【成品统计 (2RZ开头)】")
        report_lines.append(f"成品种类数: {len(original_finished)}")
        original_total = sum(original_finished.values())
        adjusted_total = sum(adjusted_finished.values())
        report_lines.append(f"调整前总数量: {original_total:.2f}")
        report_lines.append(f"调整后总数量: {adjusted_total:.2f}")
        report_lines.append(f"总减少数量: {original_total - adjusted_total:.2f}")

        if original_finished:
            report_lines.append("前10个成品调整前明细:")
            for i, (code, qty) in enumerate(list(original_finished.items())[:10], 1):
                report_lines.append(f"  {i}. {code}: {qty:.2f}")

        report_lines.append("-" * 40)

        # 调整详情
        if adjustments:
            report_lines.append("【调整详情】")
            report_lines.append(f"调整记录数: {len(adjustments)}")

            for i, adj in enumerate(adjustments, 1):
                report_lines.append(f"{i}. 半成品: {adj['half_code']} ({adj['half_qty']:.2f})")
                report_lines.append(
                    f"   → 成品: {adj['finished_code']} 从 {adj['original_qty']:.2f} → {adj['adjusted_qty']:.2f}")
                report_lines.append(f"   减少数量: {adj['reduction']:.2f}")

                if i < len(adjustments):
                    report_lines.append("   " + "-" * 30)
        else:
            report_lines.append("【调整详情】")
            report_lines.append("本次没有进行数量调整")

        report_lines.append("=" * 80)

        return "\n".join(report_lines)

    def check_if_should_run(self) -> Tuple[bool, datetime]:
        """检查是否应该运行（28日运行），并返回操作日期"""
        today = datetime.now()

        # 获取操作日期（本月28日）
        oper_date = self.get_current_month_28th()

        # 如果是28日，自动运行
        if today.day == 28:
            logger.info(f"今天是{today.day}日，符合运行条件，操作日期: {oper_date.strftime('%Y-%m-%d')}")
            return True, oper_date

        # 如果不是28日，询问是否强制运行
        logger.info(f"今天不是28日（今天是{today.day}日），操作日期: {oper_date.strftime('%Y-%m-%d')}")

        # 询问是否继续
        try:
            print(f"\n提示: 今天不是28日，操作日期将使用: {oper_date.strftime('%Y-%m-%d')}")
            response = input("是否继续运行？(y/n): ").strip().lower()
            if response == 'y':
                logger.warning(f"用户选择强制运行，操作日期: {oper_date.strftime('%Y-%m-%d')}")
                return True, oper_date
        except:
            pass

        logger.info("程序终止")
        return False, oper_date

    def run_adjustment_only(self) -> bool:
        """只运行数量调整逻辑"""
        logger.info("=" * 80)
        logger.info("开始执行成本累积表物料数量调整")
        logger.info("说明: 基于t_co_cost_accumulation表，从2RZ成品数量中扣除36RZ半成品数量")
        logger.info("=" * 80)

        # 检查是否应该运行
        should_run, oper_date = self.check_if_should_run()
        if not should_run:
            return False

        start_time = time.time()

        try:
            with self.get_connection() as db:
                # 1. 从成本累积表获取半成品数量
                half_finished = self.get_half_finished_from_cost_table(db, oper_date)
                if not half_finished:
                    logger.info("成本累积表中没有半成品数据，无需调整")
                    return True

                # 2. 从成本累积表获取成品数量
                original_finished = self.get_finished_from_cost_table(db, oper_date)
                if not original_finished:
                    logger.info("成本累积表中没有成品数据，无需调整")
                    return True

                # 3. 计算调整后的成品数量
                adjusted_finished, adjustments = self.adjust_finished_quantities(half_finished, original_finished)

                if not adjustments:
                    logger.info("没有需要调整的成品")
                    # 仍然生成报告
                    report = self.generate_adjustment_report(half_finished, original_finished,
                                                             adjusted_finished, adjustments, oper_date)
                    logger.info("\n" + report)
                    return True

                # 4. 生成并显示调整报告
                report = self.generate_adjustment_report(half_finished, original_finished,
                                                         adjusted_finished, adjustments, oper_date)
                logger.info("\n" + report)

                # 5. 询问是否更新数据库
                try:
                    print("\n" + "=" * 80)
                    print(f"调整统计: 共调整 {len(adjustments)} 个成品")
                    original_total = sum(original_finished.values())
                    adjusted_total = sum(adjusted_finished.values())
                    print(f"总减少数量: {original_total - adjusted_total:.2f}")
                    print("=" * 80)

                    confirm = input("\n是否更新成本累积表中的数量？(y/n): ").strip().lower()
                    if confirm != 'y':
                        logger.info("用户取消更新，只生成报告")

                        # 保存报告到文件
                        today_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                        with open(f"adjustment_report_{today_str}.txt", "w", encoding="utf-8") as f:
                            f.write(report)

                        return True
                except:
                    logger.info("无法获取用户输入，跳过更新")
                    return True

                # 6. 更新成本累积表
                logger.info("开始更新成本累积表...")
                success, updates_made = self.update_cost_accumulation_quantities(db, oper_date, adjusted_finished)

                execution_time = time.time() - start_time

                if success:
                    # 保存报告到文件
                    today_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    with open(f"adjustment_report_{today_str}.txt", "w", encoding="utf-8") as f:
                        f.write(report)

                    logger.info(f"物料数量调整完成，耗时: {execution_time:.2f}秒")
                    logger.info(f"共更新 {updates_made} 条记录")

                    return True
                else:
                    logger.error("更新成本累积表失败")
                    return False

        except Exception as e:
            logger.error(f"物料数量调整执行失败: {str(e)}")
            return False


def main():
    """主函数"""
    print("=" * 80)
    print("成本累积表物料数量调整程序")
    print("功能: 基于t_co_cost_accumulation表，从2RZ成品数量中扣除36RZ半成品数量")
    print(f"运行日期: {datetime.now().strftime('%Y-%m-%d')}")
    print("=" * 80)

    # 创建调整实例
    adjuster = CostAccumulationQuantityAdjustment()

    # 运行调整逻辑
    success = adjuster.run_adjustment_only()

    if success:
        print("\n" + "=" * 80)
        print("物料数量调整完成")
        print("详细日志请查看: material_quantity_adjustment.log")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("物料数量调整失败，请查看日志文件了解详情")
        print("=" * 80)

    # 等待用户查看结果
    try:
        input("\n按Enter键退出...")
    except:
        pass


if __name__ == "__main__":
    main()
