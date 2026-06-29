import json
from main import getUserid, getSessionidd
from dbroute import DBROUTE


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))
        self.routeDB = DBROUTE(51)

    def service(self):
        # 数据库连接初始化
        for data in self.json_obj:
            记录ID = data['记录ID']
            成绩 = data.get('成绩')
            地点 = data.get('地点')
            ID = data['ID']
            wordID = data['工资编号']
            批次ID = 4
            if 地点 is None or 地点 == '':
                return "未添加地点，无法操作！"
            # Check if score is None or empty string
            if 成绩 is None or 成绩 == '-' or 成绩 == '':
                return {"status": 1, "msg": "成绩未设置"}
            try:
                score = float(成绩)
            except (ValueError, TypeError):
                # Handle invalid score format
                return "成绩设置错误"

            # 查询用户根据工资编号获取用户ID
            check_user_sql = f"""
                                                    SELECT ID 
                                                    FROM 精益办.dbo.JYB_用户表 
                                                    WHERE 工资编号 = '{wordID}';
                                                    """
            user_result = self.routeDB.ExecQuery(check_user_sql)  # 执行查询
            user_id = user_result[0][0]  # 获取已有用户的ID

            if score >= 60:

                certification_id = self._get_certification_id(user_id, 批次ID)
                if certification_id:
                    记录ID = certification_id
                else:
                    # 插入新的认证状态记录
                    sql = f"""
                                                            INSERT INTO JYB_用户认证状态记录 (用户_ID, 阶段_ID, 状态, 开始时间,结束时间,操作人) 
                                                            OUTPUT INSERTED.ID
                                                            VALUES ('{user_id}', '{批次ID}', '已通过', GETDATE(),GETDATE(),'{self.userid}');
                                                        """
                    record_id = self.routeDB.ExecQuery(sql)
                    if record_id:
                        记录ID = record_id[0][0]
                    else:
                        return "插入认证状态记录失败！"

                update_sql = f"""UPDATE JYB_用户认证状态记录 SET 状态 = '已完成',结束时间= GETDATE(),操作人='{self.userid}' WHERE ID = '{记录ID}';
                                        """

                self.routeDB.ExecNonQuery(update_sql)

                update_sql = f"""UPDATE JYB_骨干考试信息表 SET 状态 = '已完成',记录ID='{记录ID}', 结果='已通过',updateTime= GETDATE(),操作人='{self.userid}'  WHERE ID = '{ID}';
                                        """
                self.routeDB.ExecNonQuery(update_sql)

        return "上传成功!"

    def _get_certification_id(self, user_id, stage_id):
        """获取用户认证状态记录ID"""
        sql = f"SELECT ID FROM JYB_用户认证状态记录 WHERE 用户_ID = '{user_id}' AND 阶段_ID = '{stage_id}';"
        result = self.routeDB.ExecQuery(sql)
        return result[0][0] if result else None
