import io
import sys

from dbroute import DBROUTE

# 修改标准输出的编码为 utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 数据库连接
db_ES = DBROUTE(4)  # EAS系统数据库
db_JYB = DBROUTE(51)  # 精益办数据库


def add_quotes(value):
    """为字符串添加单引号。如果字符串为None，则返回空字符串的引号表示。"""
    return f"'{value}'" if value is not None else "''"


def encode_handle(str_data):
    if str_data is None:
        return None
    return str_data.encode('latin1').decode('gbk')


def truncate_employee_table():
    """清空员工信息表"""
    truncate_sql = "TRUNCATE TABLE JYB_EmployeeInfo"
    db_JYB.ExecNonQuery(truncate_sql)
    print("已清空JYB_EmployeeInfo表")


def batch_fetch_eas_fids(emp_numbers):
    """批量查询EAS系统中的员工FID（添加打印功能）"""
    if not emp_numbers:
        return {}

    # 构建IN条件，分批次处理避免SQL过长
    batch_size = 500
    fid_map = {}

    for i in range(0, len(emp_numbers), batch_size):
        batch = emp_numbers[i:i + batch_size]
        in_condition = ",".join([f"'{emp}'" for emp in batch])

        query = f"""
        SELECT FNUMBER, fid 
        FROM t_bd_person 
        WHERE FNUMBER IN ({in_condition})
        """
        rows = db_ES.ExecQuery(query)
        fid_map.update({row[0]: row[1] for row in rows})

        # 打印第一批次的前5条FID获取结果
        if i == 0 and rows:
            print("\n从EAS系统获取的FID与工资编号对应关系（前5条）:")
            for j, (fnumber, fid) in enumerate(rows[:5], 1):
                print(f"{j}. 工资编号: {fnumber} → FID: {fid}")

    return fid_map


def fetch_and_combine_employee_data():
    """
    从各系统获取数据并组合成完整的员工信息
    返回: [(工资编号, 姓名, 性别, 年龄, 单位, 职位, 技术等级, 职务, 聘任职称, fid), ...]
    """
    # 1. 从HR系统获取基础数据
    hr_query = """
               SELECT 工资编号, \
                      姓名, \
                      性别,
                      DATEDIFF(YEAR, 出生日期, GETDATE()) -
                      IIF(MONTH(出生日期) > MONTH(GETDATE()) OR 
              (MONTH(出生日期) = MONTH(GETDATE()) AND DAY(出生日期) > DAY(GETDATE())), 1, 0) AS 年龄,
                      REPLACE(REPLACE(单位全称, '石横特钢控股集团有限公司_石横特钢集团_石横特钢集团有限公司_', ''),
                              '石横特钢控股集团有限公司_石横特钢集团_', '')                  AS 单位,
                      职位名称                                                               AS 职位, \
                      技术等级, \
                      职务名称                                                               AS 职务
               FROM [192.168.1.189].[HR系统].[dbo].[BX_tb员工即时信息] a
               WHERE 日期 IN (SELECT MAX (日期) FROM [192.168.1.189].[HR系统].[dbo].[BX_tb员工即时信息])
                 AND LEN(单位全称)
                   > 1 \
               """
    hr_data = db_JYB.ExecQuery(hr_query)

    # 2. 从EAS系统获取技术等级信息
    eas_query = """
                SELECT [工资编号], [技术职务等级名称] AS 技术等级, [职级名称] AS 聘任职称
                FROM [192.168.1.189].[人资部信息系统].[dbo].[EAS员工信息]
                WHERE 日期 IN (SELECT MAX (日期) FROM [192.168.1.189].[人资部信息系统].[dbo].[EAS员工信息]) \
                """
    eas_data = db_JYB.ExecQuery(eas_query)
    eas_dict = {row[0]: (row[1], row[2]) for row in eas_data}

    # 3. 从市场信息库获取职称信息
    market_query = """
                   SELECT [工资编号], 职称, 单位
                   FROM [192.168.1.189].[市场信息库].[dbo].[BD_tb人员信息] \
                   """
    market_data = db_JYB.ExecQuery(market_query)
    market_dict = {row[0]: row[1] for row in market_data}

    # 4. 组合基础数据、技术等级和职称信息
    combined_data = []
    emp_numbers = []

    for row in hr_data:
        emp_id, name, gender, age, unit, position, tech_level, title = row
        processed_unit = process_unit_name(unit)

        # 获取各系统数据
        eas_info = eas_dict.get(emp_id, (None, None))
        market_title = encode_handle(market_dict.get(emp_id, None))

        # 处理职称
        final_title = None if market_title == '科员' else market_title

        combined_data.append((
            emp_id, name, gender, age, processed_unit,
            position, eas_info[0], title, final_title, None  # 先不填充fid
        ))
        emp_numbers.append(emp_id)

    # 5. 批量获取EAS FID
    fid_map = batch_fetch_eas_fids(emp_numbers)

    # 6. 更新组合数据中的fid
    final_data = []
    for emp in combined_data:
        emp_id = emp[0]
        fid = fid_map.get(emp_id)
        final_data.append((
            emp_id, emp[1], emp[2], emp[3], emp[4],
            emp[5], emp[6], emp[7], emp[8], fid
        ))

    # 打印统计信息
    total = len(final_data)
    with_fid = sum(1 for emp in final_data if emp[9] is not None)
    print(f"\n员工数据统计: 总数={total}, 有FID={with_fid}({with_fid / total:.1%}), "
          f"无FID={total - with_fid}({(total - with_fid) / total:.1%})")

    return final_data


def process_unit_name(unit):
    """严格按照原有SQL CASE WHEN逻辑处理单位名称"""
    if unit is None:
        return None

    unit = encode_handle(unit)

    # 肥城石横特钢机械制造有限公司_职工医院 → 职工医院
    if '肥城石横特钢机械制造有限公司_职工医院' in unit:
        return '职工医院'

    # 肥城石横特钢机械制造有限公司 → 机械制造安装公司
    elif '肥城石横特钢机械制造有限公司' in unit:
        return '机械制造安装公司'

    # 石横特钢控股集团有限公司_山东康桥新材料科技有限公司_ → 山东康桥新材料科技有限公司
    elif '石横特钢控股集团有限公司_山东康桥新材料科技有限公司_' in unit:
        return '山东康桥新材料科技有限公司'

    # 包含下划线 → 取第一个下划线前的部分
    elif '_' in unit:
        return unit.split('_')[0]

    # 其他情况 → 原样返回
    else:
        return unit


def batch_insert_employee_data(employee_data):
    """批量插入员工数据（带编码处理）"""
    if not employee_data:
        print("没有员工数据需要插入")
        return

    # 打印即将存储的前5条FID与工资编号对应关系
    print("\n即将存储的FID与工资编号对应关系（前5条）:")
    for i, emp in enumerate(employee_data[:5], 1):
        emp_id, _, _, _, _, _, _, _, _, fid = emp
        print(f"{i}. 工资编号: {emp_id} → FID: {fid}")

    # # 准备批量插入的SQL
    # insert_sql = """
    #              INSERT INTO JYB_EmployeeInfo
    #                  (工资编号, 姓名, 性别, 年龄, 单位, 职位, 技术等级, 职务, 聘任职称, fid)
    #              VALUES \
    #              """
    #
    # # 构建VALUES部分
    # value_rows = []
    # for emp in employee_data:
    #     emp_id, name, gender, age, unit, position, tech_level, title, final_title, fid = emp
    #
    #     # 对所有字符串字段进行编码处理
    #     value_row = f"""(
    #         {add_quotes(encode_handle(emp_id))},
    #         {add_quotes(encode_handle(name))},
    #         {add_quotes(encode_handle(gender))},
    #         {age},
    #         {add_quotes(unit)},
    #         {add_quotes(encode_handle(position))},
    #         {add_quotes(encode_handle(tech_level))},
    #         {add_quotes(encode_handle(title))},
    #         {add_quotes(final_title)},
    #         {add_quotes(fid)}
    #     )"""
    #     value_rows.append(value_row)
    #
    # # 分批次执行插入（避免SQL过长）
    # batch_size = 500
    # for i in range(0, len(value_rows), batch_size):
    #     batch = value_rows[i:i + batch_size]
    #     current_sql = insert_sql + ",\n".join(batch)
    #     try:
    #         db_JYB.ExecNonQuery(current_sql)
    #     except Exception as e:
    #         print(f"插入批次 {i // batch_size + 1} 失败: {str(e)}")
    #         # 可以在这里添加详细的错误日志记录
    #         raise

    print(f"成功批量插入{len(employee_data)}条员工记录")


def insert_test_employee():
    """插入测试人员"""
    # 获取测试模板员工的FID
    test_fid_query = "SELECT fid FROM t_bd_person WHERE FNUMBER ='123456'"
    test_fid = db_ES.ExecQuery(test_fid_query)
    test_fid = test_fid[0][0] if test_fid else None

    # 插入测试人员
    test_emp_sql = f"""
    INSERT INTO JYB_EmployeeInfo1 
    (工资编号, 姓名, 性别, 年龄, 单位, 职位, 技术等级, 聘任职称, 职务, addTime, updateTime, 部门, fid)
    SELECT '123456', '测试人员', 性别, 年龄, 单位, 职位, 技术等级, 职务, 聘任职称, 
           addTime, updateTime, 部门, {add_quotes(test_fid)}
    FROM JYB_EmployeeInfo1 
    WHERE 工资编号 = '011980'
    """
    db_JYB.ExecNonQuery(test_emp_sql)
    print("已插入测试人员记录")


def update_user_status():
    """更新用户状态"""
    # 更新不在职人员备注
    update_sql = """
                 UPDATE JYB_用户表
                 SET 备注       = N'不在职', \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 NOT IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 备注 IS NULL \
                 """
    db_JYB.ExecNonQuery(update_sql)

    # 恢复在职人员备注
    update_sql = """
                 UPDATE JYB_用户表
                 SET 备注       = NULL, \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 备注 IS NOT NULL \
                 """
    db_JYB.ExecNonQuery(update_sql)

    # 更新考试信息表状态
    update_sql = """
                 UPDATE JYB_考试信息表
                 SET 用户状态   = N'不在职', \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 NOT IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 用户状态 IS NULL \
                 """
    db_JYB.ExecNonQuery(update_sql)

    # 更新骨干考试信息表状态
    update_sql = """
                 UPDATE JYB_骨干考试信息表
                 SET 用户状态   = N'不在职', \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 NOT IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 用户状态 IS NULL \
                 """
    db_JYB.ExecNonQuery(update_sql)

    # 恢复在职人员考试状态
    update_sql = """
                 UPDATE JYB_考试信息表
                 SET 用户状态   = NULL, \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 用户状态 = N'不在职' \
                 """
    db_JYB.ExecNonQuery(update_sql)

    # 恢复在职人员骨干考试状态
    update_sql = """
                 UPDATE JYB_骨干考试信息表
                 SET 用户状态   = NULL, \
                     updateTime = GETDATE(), \
                     操作人     = '123456'
                 WHERE 工资编号 IN (SELECT 工资编号 FROM JYB_EmployeeInfo) \
                   AND 用户状态 = N'不在职' \
                 """
    db_JYB.ExecNonQuery(update_sql)

    print("已完成用户状态更新")


def main():
    try:
        print("开始执行员工信息同步流程...")

        # 1. 清空目标表
         # truncate_employee_table()

        # 2. 获取并组合所有员工数据（包括FID）
        employee_data = fetch_and_combine_employee_data()

        # 3. 批量插入员工数据
        batch_insert_employee_data(employee_data)

        # 4. 插入测试人员
        # insert_test_employee()

        # 5. 更新用户状态
        update_user_status()

        print("员工信息同步流程执行完毕")
    except Exception as e:
        print(f"执行过程中发生错误: {str(e)}")
        raise


if __name__ == "__main__":
    main()
