import base64
import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd

class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))

    # 根据过滤条件生成sql,并获取数据
    def service(self):
        personFid = self.json_obj

        sql = f""" select top 1 '011980' from MAIN.dbo.tbSession记录 
                """

        routeDB = DBROUTE(37)  # 数据库连接
        reslist = routeDB.ExecQuery(sql)

        if not reslist:
            return {"status": 1, "msg": "Employee not found.", "data": {}}

        # 构造一个更具结构的 JSON
        formatted_result = {
                "status": 0,
                "msg": "成功",
                "data": [
                    {
                        "工资编号": row[0]
                    } for row in reslist
                ]
            }

        # 返回员工信息
        return formatted_result
