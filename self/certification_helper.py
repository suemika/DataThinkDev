from dbroute import DBROUTE
from main import getUserid




class CertificationHelper:
    def __init__(self, server_id=51):
        """
        认证辅助工具类
        :param server_id: 数据库服务器ID
        """
        self.db = DBROUTE(server_id)

    def _get_certification_id(self, user_id, stage_id):
        """获取用户认证状态记录ID"""
        sql = f"SELECT ID FROM JYB_用户认证状态记录 WHERE 用户_ID = '{user_id}' AND 阶段_ID = '{stage_id}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def _get_stage_id(self, stage_name, role):
        """根据角色和阶段名称获取阶段ID"""
        sql = f"SELECT ID FROM JYB_认证阶段 WHERE 阶段名称 = '{stage_name}' AND 所属纬度 = '{role}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def _get_user_id(self, work_id):
        """根据工资编号查询用户ID"""
        sql = f"SELECT ID FROM 精益办.dbo.JYB_用户表 WHERE 工资编号 = '{work_id}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def _get_user_id_session(self, session):
        """根据工资编号查询用户ID"""
        return getUserid(session)

    def get_user_id_name(self, session):
        # 从数据库中获取员工信息
        work_id = self._get_user_id_session(session)
        db_1 = DBROUTE(1)
        sql = f"SELECT TOP 1 编号及姓名 FROM [Main].[dbo].[View_员工信息] WHERE 编号及姓名 LIKE '%{work_id}%'"
        res_list = db_1.ExecQuery(sql)

        return res_list[0][0] if res_list else None

    def update_or_insert_certification(self, work_id, stage_name, role):
        """
        更新或插入用户认证状态记录
        :param work_id: 工资编号
        :param stage_name: 阶段名称
        :param role: 角色
        :return: 认证记录ID
        """
        stage_id = self._get_stage_id(stage_name, role)
        if not stage_id:
            return None

        user_id = self._get_user_id(work_id)
        if not user_id:
            return None

        certification_id = self._get_certification_id(user_id, stage_id)
        if certification_id:
            return certification_id

        # 插入新的认证状态记录
        sql = f"""
            INSERT INTO JYB_用户认证状态记录 (用户_ID, 阶段_ID, 状态, 开始时间) 
            OUTPUT INSERTED.ID
            VALUES ('{user_id}', '{stage_id}', '进行中', GETDATE());
        """
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None
