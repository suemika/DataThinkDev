import json
from main import getUserid, getSessionidd
from dbroute import DBROUTE


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))
        self.routeDB = DBROUTE(51)  # 将数据库连接设为实例变量

    def service(self):
        for data in self.json_obj:
            记录ID = data['记录ID']
            ID = data['ID']
            工资编号 = data['工资编号']
            reason = data['原因']

            if not reason:
                return "原因不能为空"
            # 查询用户的角色
            check_user_sql = f"""
                SELECT 角色, 状态 
                FROM 精益办.dbo.JYB_用户表 
                WHERE 工资编号 = '{工资编号}';
            """
            user_result = self.routeDB.ExecQuery(check_user_sql)  # 执行查询
            if not user_result:
                continue  # 如果没有找到用户，跳过

            # 删除考试信息和用户认证状态记录
            self.routeDB.ExecNonQuery(f"DELETE FROM JYB_用户认证状态记录 WHERE ID = '{记录ID}';")
            # 更新审核状态
            update_sql = f"""
                           UPDATE JYB_审核表 
                           SET 状态 = '审核不通过',原因='{reason}',
                               updateTime = GETDATE(),
                               操作人 = '{self.userid}'  
                           WHERE ID = '{ID}';
                       """
            self.routeDB.ExecNonQuery(update_sql)

        return "操作成功!"
