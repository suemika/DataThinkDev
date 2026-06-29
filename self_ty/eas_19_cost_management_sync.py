from dbroute import DBROUTE
import sys
import io

# 修改标准输出的编码为 utf-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
db_19_AI = DBROUTE(25)


def add_quotes(value):
    """为字符串添加单引号。如果字符串为None，则返回空字符串的引号表示。"""
    return f"'{value}'" if value is not None else "''"


def encode_handle(str_data):
    if str_data is None:
        return None
    return str_data.encode('latin1').decode('gbk')


def fetch_eas_data():
    query = """ SELECT A.FNUMBER ||'_'|| B.FSEQ 单据编号,
    to_char(A.FBIZDATE, 'yyyy-mm-dd') 日期,
       d.FNAME_L2                        物料名称,
       fmodel                            规格型号,
       ROUND(b.CFGUESSPRICE, 4)          单价,
       ROUND(B.FQTY, 4)                  数量,
       c.FNAME_L2                        领料人,case when B.FREMARK = '数智中心研发费' then B.FREMARK ELSE '设备维修费' END 费用类别

FROM T_IM_MaterialReqBill A
         LEFT JOIN T_IM_MaterialReqBillENTRY B ON A.FID = B.FPARENTID
         LEFT join T_BD_Person c on b.FPICKERID = c.fid
         LEFT JOIN T_BD_Material d ON b.FMaterialID = d.fid
WHERE A.CFMATREQPURPID = 'cn8AAAZkUcAwM1xM'
AND A.FBIZDATE >= to_date(to_char(sysdate-6, 'yyyy-mm-dd'), 'yyyy-mm-dd')
  """  # SQL 查询字符串
    eas_db = DBROUTE(4)
    rows = eas_db.ExecQuery(query)
    # 检查 rows 是否为空
    if rows is not None and len(rows) > 0:
        print("fetch_eas_data  ===============> " + str(len(rows)))
    else:
        print("fetch_eas_data  ===============> No data found.")
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
        INSERT INTO 数智化管理.DBO.FY_tb领料清单
        (单据编号,日期, 物料名称, 规格型号, 单价, 数量, 领料人,费用类别, 操作人)
        VALUES
         ({', '.join(add_quotes(v) for v in record)}, '插入-同步程序')
    """
    db.ExecNonQuery(insert_record_sql)
    print(f"Inserting record with 单据编号: {record[0]}.")


def fetch_19_data():
    query = f"""SELECT 单据编号,日期, 物料名称, 规格型号, 单价, 数量, 领料人
    FROM 数智化管理.DBO.FY_tb领料清单 WHERE 日期 >=GETDATE() - 7
"""  # SQL 查询字符串
    rows = db_19_AI.ExecQuery(query)
    if rows is not None and len(rows) > 0:
        print("fetch_19_data  ===============> " + str(len(rows)))
    else:
        print("fetch_19_data  ===============> No data found.")
    return rows



def engine_data():
    df_source = fetch_eas_data()  # 获取源数据

    # 一次性获取目标数据库的所有数据
    target_rows = fetch_19_data()  # 采用一个不可能存在的 ID 来确保获取所有行
    # 将 target_rows 转换为字典，方便快速查找
    if target_rows:
        target_dict = {row[0]: row for row in target_rows}  # 以工资编号为键
    else:
        target_dict = {}

    if  df_source:
        for row in df_source:
            row_id = row[0]  # Assuming first column is 工资编号

            # 判断目标行是否存在
            target_row = target_dict.get(row_id)

            # 处理为列表形式的 record
            record = [
                row[0], row[1], row[2], row[3],
                row[4], row[5], row[6], row[7]
            ]
            if not target_row:  # 如果没有目标行则插入
                insert_record(db_19_AI, record)

def query():
    engine_data()

if __name__ == '__main__':
    query()
