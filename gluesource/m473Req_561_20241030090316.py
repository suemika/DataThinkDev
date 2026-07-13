import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd
from flask import request, jsonify


def encode_handle(str_data):
    if str_data is None:
        return None
    return str_data.encode('latin1').decode('gbk')


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))

    def service(self):

        try:
            # SQL 查询语句
            sql = f"""WITH OrderedResults AS (SELECT 工资编号,
                               姓名,
                               性别,
                               民族,
                               DATEDIFF(YEAR, 出生年月, GETDATE()) -
                               IIF(MONTH(出生年月) > MONTH(GETDATE()) OR
                                   (MONTH(出生年月) = MONTH(GETDATE()) AND DAY(出生年月) > DAY(GETDATE())), 1,
                                   0) AS                         年龄,
                               身份证号,
                               入厂时间,
                               IIF(离职时间 IS NULL,
                                   CAST(CAST(DATEDIFF(DAY, 入厂时间, GETDATE()) / 365.0 AS DECIMAL(10, 1)) AS VARCHAR(10)) +
                                   N'年',
                                   CAST(CAST(DATEDIFF(DAY, 入厂时间, 离职时间) / 365.0 AS DECIMAL(10, 1)) AS VARCHAR(10)) +
                                   N'年')                        工作年限,
                               员工状态,
                               ISNULL(籍贯, N'无')               籍贯,
                               ISNULL(学历, N'无')               学历,
                               ISNULL(毕业院校, N'无')           毕业院校,
                               ISNULL(所学专业, N'无')           所学专业,
                               SUBSTRING(毕业时间, 0, 5) + N'年' 毕业时间,
                               从事职种,
                               ISNULL(政治面貌, N'无')           政治面貌,
                               培养单位,
                               车间或科室,
                               岗位,
                               ISNULL(现聘职称, N'无')              现聘职称,
                               ISNULL(聘任时间, '')              聘任时间,
                               ISNULL(职称资格, '')              职称资格,
                               ISNULL(资格取得时间, '')          资格取得时间,
                               ISNULL(B.婚恋状况, N'无')            婚恋状况,
                               ISNULL(B.MBTI性格测试类型, N'无')    MBTI性格测试类型,
                               单位,Fpersonid
                        FROM 人资部信息系统.dbo.CID_BI_大学生EAS信息 A
                                 LEFT JOIN 人资部信息系统.dbo.CID_RZ_信息 B ON A.ID = B.pid )
SELECT *
FROM OrderedResults
ORDER BY 姓名
                    """

            routeDB = DBROUTE(37)  # 数据库连接
            reslist = routeDB.ExecQuery(sql)
            # 构造一个更具结构的 JSON
            formatted_result = {
                "status": 0,
                "msg": "成功",
                "data": [
                    {
                        "工资编号": row[0],
                        "姓名": row[1],
                        "性别": row[2],
                        "民族": row[3],
                        "年龄": row[4],
                        "身份证号": row[5],
                        "入厂时间": row[6],
                        "工作年限": row[7],
                        "员工状态": row[8],
                        "籍贯": row[9],
                        "学历": row[10],
                        "毕业院校": row[11],
                        "所学专业": row[12],
                        "毕业时间": row[13],
                        "从事职种": row[14],
                        "政治面貌": row[15],
                        "培养单位": row[16],
                        "车间或科室": row[17],
                        "岗位": row[18],
                        "现聘职称": row[19],
                        "聘任时间": row[20],
                        "职称资格": row[21],
                        "资格取得时间": row[22],
                        "婚恋状况": row[23],
                        "MBTI性格测试类型": row[24],
                        "单位": row[25],
                        "Fpersonid": row[26]
                    } for row in reslist
                ]
            }

            return formatted_result
        except Exception as e:
            return jsonify({"status": 1, "msg": "系统异常！", "data": {}})
