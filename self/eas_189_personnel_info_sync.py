from dbroute import DBROUTE
import sys
import io

# 修改标准输出的编码为 utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def add_quotes(value):
    """为字符串添加单引号。如果字符串为None，则返回空字符串的引号表示。"""
    return f"'{value}'" if value is not None else "''"


def encode_handle(str_data):
    if str_data is None:
        return None
    return str_data.encode('latin1').decode('gbk')


def fetch_eas_data():
    query = """ SELECT  a.fnumber                                                        AS 工资编号,
                a.fname_l2                                                                        AS 姓名,
                CASE WHEN FGender = 1 THEN '男' ELSE '女' END                                     AS 性别,
                g.fname_l2                                                                        AS 民族,
                A.FIDCARDNO                                                                       AS 身份证号,
                TO_CHAR(c.FJoinDate, 'yyyy-mm-dd')                                                AS 入厂时间,
                A.FNATIVEPLACE_L2                                                                 AS 籍贯,
                i.xueli                                                                           AS 学历,
                i.fgraduateschool                                                                 AS 毕业院校,
                i.fspecialty                                                                      AS 所学专业,
                TO_CHAR(i.fgraduatedate, 'yyyy-mm-dd')                                            AS 毕业时间,
                d.CFZHIWU                                                                         AS 从事职种,
                h.fname_l2                                                                        AS 政治面貌,
                e.CFDANWEI                                                                 AS 单位,
                f.FNAME_L2          AS 车间或科室,
                e.fname_l2                                                                        AS 岗位,
                nvl(t.fname_l2, '')                                                               AS 现聘职称,
                nvl(TO_CHAR(q.FConferDate, 'yyyy-mm-dd'), '')                                     AS 聘任时间,
                nvl(r.fname_l2, '')                                                               AS 职称资格,
                nvl(TO_CHAR(w.FObtainDate, 'yyyy-mm-dd'), '')                                     AS 资格取得时间,
                a.fid,
                b.fname_l2,
                e.CFDANWEI AS 培养单位,to_char(A.FBirthday,'yyyy-mm-dd') 出生年月
        FROM t_bd_person a
                 LEFT JOIN T_HR_BDEmployeeType b ON a.FEmployeeTypeID = b.fid
                 LEFT JOIN T_HR_PersonPosition c ON c.FPersonID = a.fid
                 INNER JOIN T_ORG_PositionMember d ON d.FPersonID = a.fid AND d.FISPRIMARY = 1
                 LEFT JOIN T_ORG_Position e ON d.fpositionid = e.fid
                 LEFT JOIN T_ORG_Admin f ON e.FAdminOrgUnitID = f.fid
                 LEFT JOIN T_HR_JobLevel l ON c.fjoblevelid = l.fid
                 LEFT JOIN T_HR_BDTechnicalPost t ON a.FEmployTechPostID = t.fid
                 LEFT JOIN (SELECT fpersonid, b.fname_l2 AS xueli, fgraduateschool, fspecialty, fgraduatedate
                            FROM T_HR_PersonDegree a
                                     LEFT JOIN T_BD_HRDiploma b ON a.fdiploma = b.fid WHERE FIsHighest = 1
                            GROUP BY fpersonid, b.fname_l2, fgraduateschool, fspecialty, fgraduatedate) i ON i.fpersonid = a.fid
                 LEFT JOIN T_BD_HRPolitical h ON a.FPoliticalFaceID = h.FID
                 LEFT JOIN T_BD_HRFolk g ON a.FFolkID = g.FID
                 LEFT JOIN T_HR_PersonTechPost q ON a.fid = q.FPersonID  and q.FIsHighTechnical = 1
                 LEFT JOIN (SELECT DISTINCT FPersonID,MAX(FObtainDate) FObtainDate,FCertifiedCompetencyID FROM T_HR_PersonCertifyCompetency group by FPersonID,FCertifiedCompetencyID) w ON a.fid = w.FPersonID
                 LEFT JOIN T_HR_BDCertifyCompetency r ON w.FCertifiedCompetencyID = r.fid
        WHERE c.CFISDXS = 1  """  # SQL 查询字符串
    eas_db = DBROUTE(4)
    rows = eas_db.ExecQuery(query)
    # 检查 rows 是否为空
    if rows is not None and len(rows) > 0:
        print("fetch_eas_data  ===============> " + str(len(rows)))
    else:
        print("fetch_eas_data  ===============> No data found.")
    return rows


def fetch_189_data():
    query = f"""SELECT 工资编号,
           姓名,
           性别,
           民族,
           身份证号,
           IIF(入厂时间 IS NULL, '', CONVERT(VARCHAR(10), 入厂时间, 21))         入厂时间,
           籍贯,
           学历,
           毕业院校,
           所学专业,
           IIF(毕业时间 IS NULL, '', CONVERT(VARCHAR(10), 毕业时间, 21))         毕业时间,
           从事职种,
           政治面貌,
           单位,
           车间或科室,
           岗位,
           ISNULL(现聘职称, '')                                                           现聘职称,
           IIF(聘任时间 IS NULL, '', CONVERT(VARCHAR(10), 聘任时间, 21))         聘任时间,
           ISNULL(职称资格, '')                                                           职称资格,
           IIF(资格取得时间 IS NULL, '', CONVERT(VARCHAR(10), 资格取得时间, 21)) 资格取得时间,Fpersonid,员工状态,培养单位,出生年月
    FROM 人资部信息系统.DBO.CID_BI_大学生EAS信息 
"""  # SQL 查询字符串
    db = DBROUTE(37)
    rows = db.ExecQuery(query)
    if rows is not None and len(rows) > 0:
        print("fetch_189_data  ===============> " + str(len(rows)))
    else:
        print("fetch_189_data  ===============> No data found.")
    return rows


def is_equal(value1, value2):
    # 将 None 和 '' 视为相等
    if value1 is None:
        value1 = ''
    if value2 is None:
        value2 = ''

    return value1 == value2


def insert_record(db, record):
    insert_record_sql = f"""
        INSERT INTO 人资部信息系统.DBO.CID_BI_大学生EAS信息
        (工资编号, 姓名, 性别, 民族, 身份证号, 入厂时间, 籍贯, 学历, 毕业院校, 所学专业, 毕业时间, 从事职种, 政治面貌, 单位, 车间或科室, 岗位, 现聘职称, 聘任时间, 职称资格, 资格取得时间,Fpersonid, 员工状态, 培养单位,出生年月, addTime, updateTime, 操作人)
        VALUES
         ({', '.join(add_quotes(v) for v in record)}, GETDATE(), GETDATE(), '插入-同步程序')
    """
    db.ExecNonQuery(insert_record_sql)
    print(f"Inserting record with 工资编号: {record[0]}.")


def update_record(db, row_id, updates):
    if updates:
        update_clauses = ", ".join(
            f"{column} = {add_quotes(value)}" for column, value in updates.items() if value is not None)

        if update_clauses:
            update_sql = f"UPDATE 人资部信息系统.DBO.CID_BI_大学生EAS信息 SET {update_clauses}, updateTime = GETDATE(), 操作人 = '更新-同步程序' WHERE 工资编号 = {add_quotes(row_id)}"

            print(f"Updating sql: {update_sql}.")
            db.ExecNonQuery(update_sql)
            print(f"Updating record with 工资编号: {row_id}.")


def engine_data():
    db_189_RZ = DBROUTE(37)
    df_source = fetch_eas_data()  # 获取源数据

    # 一次性获取目标数据库的所有数据
    target_rows = fetch_189_data()  # 采用一个不可能存在的 ID 来确保获取所有行
    # 将 target_rows 转换为字典，方便快速查找
    if target_rows:
        target_dict = {row[0]: row for row in target_rows}  # 以工资编号为键
    else:
        target_dict = {}

    index_to_column = {
        0: '工资编号',
        1: '姓名',
        2: '性别',
        3: '民族',
        4: '身份证号',
        5: '入厂时间',
        6: '籍贯',
        7: '学历',
        8: '毕业院校',
        9: '所学专业',
        10: '毕业时间',
        11: '从事职种',
        12: '政治面貌',
        13: '单位',
        14: '车间或科室',
        15: '岗位',
        16: '现聘职称',
        17: '聘任时间',
        18: '职称资格',
        19: '资格取得时间',
        20: 'Fpersonid',
        21: '员工状态',
        22: '培养单位', 23: '出生年月'
    }

    for row in df_source:
        row_id = row[0]  # Assuming first column is 工资编号

        # 判断目标行是否存在
        target_row = target_dict.get(row_id)

        # 处理为列表形式的 record
        record = [
            row[0], row[1], row[2], row[3],
            row[4], row[5], row[6], row[7],
            row[8], row[9], row[10], row[11],
            row[12], row[13], row[14],
            row[15], row[16], row[17],
            row[18], row[19], row[20], row[21],
            row[22], row[23]
        ]

        if not target_row:  # 如果没有目标行则插入
            insert_record(db_189_RZ, record)
        else:
            # 如果存在，则比较每个字段并更新不同的字段
            updates = {}
            for i in range(len(row)):
                update_data = row[i]
                target_data = target_row[i] if target_row else None  # 从字典获取目标数据

                if not is_equal(update_data, target_data):  # 仅在不同的情况下进行更新
                    updates[index_to_column[i]] = update_data

            update_record(db_189_RZ, row_id, updates)


def fetch_eas_left_data():
    query = """ SELECT DISTINCT a.fnumber                                                                         AS 工资编号,
                b.fname_l2 员工状态,nvl(TO_CHAR(C.FLEFTDATE, 'yyyy-mm-dd'), '') 离职时间,FinService 是否在职,a.fname_l2                                                                        AS 姓名
FROM t_bd_person a
         LEFT JOIN T_HR_BDEmployeeType b
                   ON a.FEmployeeTypeID = b.fid
LEFT JOIN T_HR_PersonPosition c ON c.FPersonID = a.fid
WHERE   c.CFISDXS = 1 AND b.FinService = 2 """  # SQL 查询字符串
    eas_db = DBROUTE(4)
    rows = eas_db.ExecQuery(query)
    # 检查 rows 是否为空
    if rows is not None and len(rows) > 0:
        print("fetch_eas_left_data  ===============> " + str(len(rows)))
    else:
        print("fetch_eas_left_data  ===============> No data found.")
    return rows


def fetch_189_left_data():
    query = f"""SELECT 工资编号,状态 FROM 人资部信息系统.DBO.CID_BI_大学生EAS信息 
"""  # SQL 查询字符串
    db = DBROUTE(37)
    rows = db.ExecQuery(query)
    if rows is not None and len(rows) > 0:
        print("fetch_189_left_data  ===============> " + str(len(rows)))
    else:
        print("fetch_189_left_data  ===============> No data found.")
    return rows


def engine_left_data():
    db_189_RZ = DBROUTE(37)
    df_source = fetch_eas_left_data()  # 获取源数据

    # 一次性获取目标数据库的所有数据
    target_rows = fetch_189_left_data()

    # 如果目标数据为空，直接更新数据
    if df_source:
        target_dict = {row[0]: row for row in df_source}  # 以工资编号为键
        all_ids = {row[0]: row for row in target_rows}  # 使用 '工资编号' 键

        # 遍历目标数据，更新状态
        for row_id in target_dict.keys():
            # 假设有一个大于这个的逻辑定义需要更新员工状态
            matched_row = target_dict.get(row_id)
            if row_id in all_ids:  # 如果这个工资编号不在 189 中
                is_employed = all_ids.get(row_id)[1]
                if matched_row and is_employed == '1':
                    update_employee_status(db_189_RZ, row_id, matched_row)
            else:
                insert_employee_record(db_189_RZ, matched_row)


def insert_employee_record(db, record):
    insert_record_sql = f"""
        INSERT INTO 人资部信息系统.DBO.CID_BI_大学生EAS信息
        (工资编号, 员工状态,离职时间,状态,姓名,addTime,updateTime,操作人)
        VALUES
         ({', '.join(add_quotes(v) for v in record)}, GETDATE(), GETDATE(), '插入-同步程序')
    """
    db.ExecNonQuery(insert_record_sql)
    # print(insert_record_sql)
    print(f"Inserting record with 工资编号: {record[0]}.")


def update_employee_status(db, row_id, left_date):
    if left_date:
        # 假设 left_date 是一个列表，第一个元素是工资编号，第二个元素是员工状态，第三个元素是离职时间
        employee_status = left_date[1]  # 提取员工状态
        departure_date = left_date[2]  # 提取离职时间
        is_employed = left_date[3]  # 提取离职时间
        # 确保字符串被引号包围
        update_sql = f"""
            UPDATE 人资部信息系统.DBO.CID_BI_大学生EAS信息 
            SET 员工状态 = '{employee_status}', 
                离职时间 = '{departure_date}', 
                状态={add_quotes(is_employed)}, 
                updateTime = GETDATE(),
                操作人 = '更新-同步程序' 
            WHERE 工资编号 = {add_quotes(row_id)}
        """

        # print(f"Updating sql: {update_sql}.")
        db.ExecNonQuery(update_sql)
        print(f"update_employee_status  with 工资编号: {row_id}.")


def query():
    engine_data()
    engine_left_data()


if __name__ == '__main__':
    query()
