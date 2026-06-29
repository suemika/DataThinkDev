from datetime import datetime, timedelta
from dbroute import DBROUTE
import sys
import io

# 设置标准输出编码为UTF-8，确保能正确处理中文字符
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def get_all_materials(mes_db):
    """
    从数据库中获取所有物料信息

    参数:
        mes_db: 数据库连接对象

    返回:
        包含(物料编码, 物料名称, 规格)的元组列表
        如果出错则返回空列表
    """
    # 查询所有以'14'开头的物料信息，创建时间在2025年之后的
    all_materials_query = """
        SELECT DISTINCT C_MAT_CODE, c_mat_name, c_wth || '*' || C_THK 
        FROM t_bpes_rmw 
        WHERE C_MAT_CODE LIKE '14%' AND D_CREATE_TIME >= TO_DATE('2025-01-01', 'yyyy-mm-dd')
        GROUP BY C_MAT_CODE, c_mat_name, c_wth || '*' || C_THK
    """
    try:
        return mes_db.ExecQuery(all_materials_query)
    except Exception as e:
        print(f"获取所有物料信息时出错: {e}")
        return []


def get_daily_inventory(mes_db, date, material_code,specification):
    """
    获取指定日期指定物料的入库和出库数据

    参数:
        mes_db: 数据库连接对象
        date: 查询日期(格式: 'YYYY-MM-DD')
        material_code: 物料编码

    返回:
        (入库重量, 出库重量) 元组
    """
    # 入库查询 - 计算理论重量
    incoming_query = f"""
        SELECT 
            ROUND(SUM(t.n_wgt_theory), 4) AS 理重
        FROM 
            t_bpes_rmw t
        LEFT JOIN 
            t_spes_stove_main m ON t.c_stove_no = m.c_stove AND (m.c_sw18 != '删除' OR m.c_sw18 IS NULL)
        WHERE 
            t.c_is_delete = '否'
            AND t.c_is_hot IS NOT NULL  
            AND C_MAT_CODE = '{material_code}' and   c_wth || '*' || C_THK = '{specification}'
            AND t.D_CREATE_TIME >= TO_DATE('{date}', 'yyyy-mm-dd')  
            AND t.D_CREATE_TIME < TO_DATE('{date}', 'yyyy-mm-dd') + 1 
    """

    # 出库查询 - 计算实际重量
    outgoing_query = f"""
        SELECT 
            ROUND(SUM(m.C_BILLET_WGT), 4) AS 实重
        FROM 
            t_bpes_rmw t
        LEFT JOIN 
            t_tpes_main m ON t.c_slab_no = m.c_slab_no
            AND m.c_state NOT IN ('上料', '回炉', '出炉剔除', '炉前剔除')
        WHERE 
            t.c_state = '已出库'
            AND t.c_is_delete = '否' 
            AND C_MAT_CODE = '{material_code}' and   c_wth || '*' || C_THK = '{specification}'
            AND m.D_DISCHARGE_TIME >= TO_DATE('{date}', 'yyyy-mm-dd')  
            AND m.D_DISCHARGE_TIME < TO_DATE('{date}', 'yyyy-mm-dd') + 1  
    """

    try:
        # 执行查询并处理结果
        incoming_result = mes_db.ExecQuery(incoming_query)
        outgoing_result = mes_db.ExecQuery(outgoing_query)

        # 处理可能为NULL的结果
        incoming_weight = float(incoming_result[0][0]) if incoming_result and incoming_result[0][0] else 0.0
        outgoing_weight = float(outgoing_result[0][0]) if outgoing_result and outgoing_result[0][0] else 0.0

        return incoming_weight, outgoing_weight
    except Exception as e:
        print(f"查询 {material_code} 在 {date} 的出入库数据时出错: {e}")
        return 0.0, 0.0


def get_previous_day_ending_stock(mes_db, date_str, material_code,specification):
    """
    获取指定物料在前一工作日的期末库存

    参数:
        mes_db: 数据库连接对象
        date_str: 当前日期(格式: 'YYYY-MM-DD')
        material_code: 物料编码

    返回:
        前一日的期末库存值，如果没有记录则返回0.0
    """
    query = f"""
        SELECT ending_stock
        FROM wz_inventory
        WHERE material_code = '{material_code}'  AND specification = '{specification}'
          AND inventory_date = (
              SELECT MAX(inventory_date)
              FROM wz_inventory
              WHERE material_code = '{material_code}'  AND specification = '{specification}'
                AND inventory_date < '{date_str}' 
                AND ending_stock IS NOT NULL
          )
    """

    try:
        result = mes_db.ExecQuery(query)
        if result:
            return float(result[0][0]) if result[0][0] is not None else 0.0
    except Exception as e:
        print(f"获取 {material_code} 在 {date_str} 前一天的期末库存时出错: {e}")

    return 0.0


def get_cumulative_inventory(mes_db, material_code, date_str, specification):
    """
    计算从当月29日(或上月29日)到指定日期的累计入库和出库量

    参数:
        mes_db: 数据库连接对象
        material_code: 物料编码
        date_str: 截止日期(格式: 'YYYY-MM-DD')

    返回:
        (累计入库量, 累计出库量) 元组
    """
    current_date = datetime.strptime(date_str, '%Y-%m-%d')

    # 确定累计计算的起始日期(每月29日开始计算)
    if current_date.month == 1:
        start_date = f"{current_date.year - 1}-12-29"
    else:
        # 特殊处理2月份(考虑闰年)
        if current_date.month == 3 and current_date.day == 1:
            # 闰年判断
            if (current_date.year % 4 == 0 and current_date.year % 100 != 0) or (current_date.year % 400 == 0):
                start_date = f"{current_date.year}-02-29"
            else:
                start_date = date_str
        elif current_date.month == 3 and current_date.day == 29:
            start_date = date_str
        elif current_date.month == 3 and current_date.day < 29:
            start_date = f"{current_date.year}-{current_date.month:02d}-01"
        elif current_date.month == 3 and current_date.day > 29:
            start_date = f"{current_date.year}-{current_date.month:02d}-29"
        else:
            start_date = f"{current_date.year}-{current_date.month - 1:02d}-29"

    # 查询累计入库量
    incoming_query = f"""
        SELECT SUM(incoming_weight) FROM wz_inventory  
        WHERE inventory_date >= '{start_date}' AND inventory_date <= '{date_str}' 
        AND material_code = '{material_code}' AND specification = '{specification}'
    """

    # 查询累计出库量
    outgoing_query = f"""
        SELECT SUM(outgoing_weight) FROM wz_inventory  
        WHERE inventory_date >= '{start_date}' AND inventory_date <= '{date_str}' 
        AND material_code = '{material_code}' AND specification = '{specification}'
    """

    try:
        incoming_cumulative = mes_db.ExecQuery(incoming_query)[0][0] or 0.0
        outgoing_cumulative = mes_db.ExecQuery(outgoing_query)[0][0] or 0.0
    except Exception as e:
        print(f"获取 {material_code} 截至 {date_str} 的累计库存时出错: {e}")
        incoming_cumulative, outgoing_cumulative = 0.0, 0.0

    return incoming_cumulative, outgoing_cumulative


def update_inventory(mes_db, date_str, material_code, material_name, specification):
    """
    更新指定日期和物料的库存信息

    参数:
        mes_db: 数据库连接对象
        date_str: 日期字符串(格式: 'YYYY-MM-DD')
        material_code: 物料编码
        material_name: 物料名称
        specification: 规格

    返回:
        更新后的期末库存值
    """
    # 获取当日出入库数据
    incoming_weight, outgoing_weight = get_daily_inventory(mes_db, date_str, material_code,specification)

    # 获取前一日库存作为期初库存
    initial_stock = get_previous_day_ending_stock(mes_db, date_str, material_code, specification)

    # 计算累计出入库量
    incoming_cumulative, outgoing_cumulative = get_cumulative_inventory(mes_db, material_code, date_str, specification)

    # 检查记录是否已存在
    check_query = f"""
        SELECT COUNT(*) FROM wz_inventory
        WHERE inventory_date = '{date_str}' AND material_code = '{material_code}' AND specification = '{specification}'
    """

    try:
        record_exists = mes_db.ExecQuery(check_query)[0][0] > 0

        # 如果记录已存在，先删除
        if record_exists:
            delete_query = f"""
                DELETE FROM wz_inventory 
                WHERE inventory_date = '{date_str}' AND material_code = '{material_code}' AND specification = '{specification}'
            """
            mes_db.ExecNonQuery(delete_query)

        # 计算期末库存 = 期初 + 入库 - 出库
        final_stock = round(initial_stock + incoming_weight - outgoing_weight, 4)

        # 插入新记录
        insert_query = f"""
            INSERT INTO wz_inventory (
                inventory_date, incoming_weight, outgoing_weight, 
                initial_stock, ending_stock, material_code, 
                material_name, specification, incoming_cumulative, 
                outgoing_cumulative
            ) VALUES (
                '{date_str}', {incoming_weight}, {outgoing_weight}, 
                {initial_stock}, {final_stock}, '{material_code}', 
                '{material_name}', '{specification}', {incoming_cumulative}, 
                {outgoing_cumulative}
            )
        """
        mes_db.ExecNonQuery(insert_query)

        # 打印操作日志
        print(f"更新记录: 日期: {date_str}, 物料: {material_code}({material_name}), "
              f"规格: {specification}, 入库: {incoming_weight}, 出库: {outgoing_weight}, "
              f"期初: {initial_stock}, 期末: {final_stock}, "
              f"入库累计: {incoming_cumulative}, 出库累计: {outgoing_cumulative}")

        return final_stock
    except Exception as e:
        print(f"更新 {material_code} 在 {date_str} 的库存信息时出错: {e}")
        return initial_stock


def query():
    """
    主查询函数，处理最近2天的库存数据
    """
    # 设置查询日期范围(最近2天)

    start_date = datetime.now() - timedelta(days=2)
    start_date = start_date.strftime('%Y-%m-%d')

    # start_date = '2025-01-01'
    # 获取昨天日期作为结束日期
    yesterday = datetime.now() - timedelta(days=1)
    end_date = yesterday.strftime('%Y-%m-%d')

    # 连接数据库
    mes_db = DBROUTE(52)  # 使用适当的数据库连接参数

    # 获取所有物料信息
    all_materials = get_all_materials(mes_db)

    if not all_materials:
        print("未获取到任何物料信息，程序终止")
        return

    # 按日期循环处理
    current_date = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    while current_date <= end:
        date_str = current_date.strftime('%Y-%m-%d')
        print(f"\n正在处理 {date_str} 的库存数据...")

        # 对每个物料更新库存
        for material_code, material_name, specification in all_materials:
            update_inventory(mes_db, date_str, material_code, material_name, specification)

        current_date += timedelta(days=1)

    print("\n库存数据更新完成")


if __name__ == '__main__':
    query()
