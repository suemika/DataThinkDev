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

    def _get_certification_results_id(self, work_id, roll):
        """获取用户认证结果审核表 ID"""
        sql = f"SELECT ID FROM JYB_认证结果审核表 WHERE 工资编号 = '{work_id}' and 申请认证等级 = '{roll}' and 是否删除 = 0;"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def _get_pre_evaluation_id(self, work_id, roll):
        """获取用户认证结果审核表 ID"""
        sql = f"SELECT ID FROM JYB_认证预评价表 WHERE 工资编号 = '{work_id}' and 申请认证等级 = '{roll}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def _get_stage_id(self, stage_name, role):
        """根据角色和阶段名称获取阶段ID"""
        sql = f"SELECT ID FROM JYB_认证阶段 WHERE 阶段名称 = '{stage_name}' AND 所属纬度 = '{role}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def get_user_id(self, work_id):
        """根据工资编号查询用户ID"""
        sql = f"SELECT ID FROM 精益办.dbo.JYB_用户表 WHERE 工资编号 = '{work_id}';"
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def update_user_status(self, work_id, user_id):
        """根据工资编号查询用户ID"""
        update_sql = f"""UPDATE JYB_用户表 SET 状态 = 1,updateTime= GETDATE(),操作人='{user_id}' WHERE 工资编号 = '{work_id}';
                                                                                """

        self.db.ExecNonQuery(update_sql)

    def update_user_status_started(self, work_id, role):
        """根据工资编号查询用户ID"""
        update_sql = f""" UPDATE JYB_用户表 SET 状态 = 0, updateTime = GETDATE(), 角色 = '{role}'  WHERE 工资编号 = '{work_id}'; """

        self.db.ExecNonQuery(update_sql)

    def _get_user_id_session(self, session):
        """根据工资编号查询用户ID"""
        return getUserid(session)

    def _get_user_id_name(self, session):
        # 从数据库中获取员工信息
        work_id = self._get_user_id_session(session)
        db_1 = DBROUTE(1)
        sql = f"SELECT TOP 1 编号及姓名 FROM [Main].[dbo].[View_员工信息] WHERE 编号及姓名 LIKE '%{work_id}%'"
        res_list = db_1.ExecQuery(sql)

        return res_list[0][0] if res_list else None

    def insert_login_record(self, session, model_name,result):
        userName = self._get_user_id_name(session)
        sql_insert = f"""
                                INSERT INTO [办公室].[dbo].[Of_tb访问记录] (model_name, login_name)
                                OUTPUT INSERTED.ID
                                VALUES ('{model_name}', '{userName}');
                                """
        inserted_id = self.db.ExecQuery(sql_insert)
        return inserted_id[0][0] if inserted_id else None

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

        user_id = self.get_user_id(work_id)
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

    def update_certification(self, work_id, log_id):
        """
        更新用户认证状态记录
        :param work_id: 工资编号
        :param log_id: 记录ID
        """
        # 更新审核状态
        update_sql = f"""
                                                    UPDATE JYB_用户认证状态记录 
                                                    SET 状态 = '已通过',结束时间 = GETDATE(),
                                                        updateTime = GETDATE(),
                                                        操作人 = '{work_id}'  
                                                    WHERE ID = '{log_id}';
                                                """
        self.db.ExecNonQuery(update_sql)

    def insert_certification_results(self, work_id, log_id, role):
        """
        更新用户认证状态记录
        :param work_id: 工资编号
        :param log_id: 记录ID
        :param role: 角色
        """
        certification_results_id = self._get_certification_results_id(work_id, role)
        if certification_results_id:
            # 更新审核状态
            update_sql = f"""
                                                                UPDATE JYB_认证结果审核表 
                                                                SET 审核状态 = '审核中',
                                                                    updateTime = GETDATE(),
                                                                    记录ID='{log_id}',
                                                                    操作人 = '{work_id}',备注=NULL
                                                                WHERE 工资编号 = '{work_id}' AND 申请认证等级='{role}';
                                                            """
            self.db.ExecNonQuery(update_sql)

            return certification_results_id
        else:
            # 插入新的认证状态记录
            sql = f"""
                        INSERT INTO JYB_认证结果审核表 (工资编号, 申请认证等级, 记录ID,操作人) 
                        OUTPUT INSERTED.ID
                        VALUES ('{work_id}', '{role}', '{log_id}','{work_id}');
                    """
            result = self.db.ExecQuery(sql)
        return result[0][0] if result else None

    def insert_pre_evaluation(self, work_id, role):
        """
        更新用户认证状态记录
        :param work_id: 工资编号
        :param role: 角色
        """
        # 插入新的认证状态记录

        certification_results_id = self._get_certification_results_id(work_id, role)
        if certification_results_id:
            sql = f"""
                                                INSERT INTO JYB_认证预评价表 (工资编号, 申请认证等级, 技能ID, 模块ID,pid)
                                                    SELECT 工资编号, 申请认证等级, 技能ID, 模块ID,{certification_results_id}
                                                FROM JYB_个人自评表 p
                                                WHERE 是否删除 = 0
                                                  AND 工资编号 = '{work_id}'
                                                  AND 申请认证等级 = '{role}'  AND NOT EXISTS (
                                                        SELECT 1 
                                                        FROM JYB_认证预评价表 e
                                                        WHERE 
                                                            e.工资编号 = p.工资编号
                                                            AND e.申请认证等级 = p.申请认证等级
                                                            AND (e.技能ID = p.技能ID OR e.模块ID = p.模块ID)
                                                    )
                                                  ;
                                            """
            result = self.db.ExecQuery(sql)

            # 插入新的认证状态记录
            sql = f""" INSERT INTO JYB_认证评审表 (工资编号, 申请认证等级, 技能ID, 模块ID,pid)
                                                    SELECT 工资编号, 申请认证等级, 技能ID, 模块ID,{certification_results_id}
                                                    FROM JYB_个人自评表 p
                                                    WHERE 是否删除 = 0
                                                      AND 工资编号 = '{work_id}'
                                                      AND 申请认证等级 = '{role}'AND NOT EXISTS (
                                                SELECT 1 
                                                FROM JYB_认证评审表 e
                                                WHERE 
                                                    e.工资编号 = p.工资编号
                                                    AND e.申请认证等级 = p.申请认证等级
                                                    AND (e.技能ID = p.技能ID OR e.模块ID = p.模块ID)
                                            )
                                          ;
                                                """
            result = self.db.ExecQuery(sql)

        return '1'

    def process_backbone_user(self, wordID, stage_name, role):
        """处理骨干角色的认证流程
        1.查询阶段ID
        2.认证学习

        """

        certification_id = self.update_or_insert_certification(wordID, stage_name, role)
        if not certification_id:
            return {"status": 1, "msg": "认证状态插入失败。"}
        else:
            self.update_user_status_started(wordID, role)  # 更新用户状态
        return {"status": 0, "msg": str(certification_id)}

    def insert_exam_info_if_not_exists(self, wordID, stage_name, role):
        """
        检查并插入考试信息记录（如果不存在）

        参数:
            wordID (str): 工资编号
            certification_id (int): 认证记录ID
            batch_id (int): 批次ID

        返回:
            int|dict: 新插入记录的ID，或包含状态和消息的字典
        """

        # 获取启用的批次ID
        batch_id = self._get_enabled_batch_id(role)
        if not batch_id:
            return "考试批次未找到。"

        certification_id = self.update_or_insert_certification(wordID, stage_name, role)
        if not certification_id:
            return {"status": 1, "msg": "认证状态插入失败。"}

        # 检查是否已存在考试记录
        sql_check_exam_info = f"""
                    SELECT TOP 1  ID, 批次ID, 考试批次, 结果 
                    FROM 精益办.dbo.JYB_骨干考试信息表 
                    WHERE 工资编号 = {wordID}  AND 申请认证等级='{role}'  ORDER BY  ID DESC;
                """
        exam_info_result = self.db.ExecQuery(sql_check_exam_info)

        if not exam_info_result:  # 记录不存在则插入新记录
            return self.insert_exam_info(wordID, certification_id, batch_id)

        # 处理已存在的考试记录
        kspc_id = exam_info_result[0][2]  # 当前考试批次
        jieguo = exam_info_result[0][3]  # 考试结果

        if jieguo == "已通过":
            return {"status": 1, "msg": "已通过。"}
        elif jieguo == "未通过":
            return self.insert_exam_info(wordID, certification_id, batch_id, role, kspc_id + 1)
        else:
            return {"status": 1, "msg": "已申请。"}

    def insert_exam_info(self, wordID, certification_id, batch_id, role, kspc_id=1):
        """
        插入新的考试信息记录

        参数:
            wordID (str): 工资编号
            certification_id (int): 认证记录ID
            batch_id (int): 批次ID
            kspc_id (int): 考试批次号，默认为1

        返回:
            int|None: 新插入记录的ID，如果插入失败返回None
        """
        sql_insert_user = f"""
            INSERT INTO 精益办.dbo.JYB_骨干考试信息表 (工资编号, 记录ID, 批次ID, 考试批次,申请认证等级)
            OUTPUT INSERTED.ID
            VALUES ({wordID}, {certification_id}, {batch_id}, {kspc_id}, '{role}');
        """
        inserted_id = self.db.ExecQuery(sql_insert_user)
        return inserted_id[0][0] if inserted_id else None

    def _get_enabled_batch_id(self, role):
        """
        获取当前启用的考试批次ID

        参数:
            role (str): 考试阶段/角色

        返回:
            int|None: 启用的批次ID，如果找不到返回None
        """
        check_batch_sql = f"""
            SELECT ID 
            FROM 精益办.dbo.JYB_考试批次 
            WHERE 是否启用 = 1 AND 阶段 = {role}  AND CONVERT(CHAR(10), GETDATE(), 21) BETWEEN 开始时间 AND 结束时间;
        """
        batch_result = self.db.ExecQuery(check_batch_sql)
        return batch_result[0][0] if batch_result else None

    def _delete_certification_record(self, certification_id):
        """删除认证状态记录"""
        delete_sql = f"""
            DELETE FROM JYB_用户认证状态记录 
            WHERE ID = {certification_id};
        """
        self.db.ExecNonQuery(delete_sql)

    def _get_exam_info_by_id(self, exam_id):
        """根据ID查询考试信息"""
        sql = f"""
            SELECT ID FROM 精益办.dbo.JYB_考试信息表 
            WHERE ID = {exam_id};
        """
        result = self.db.ExecQuery(sql)
        return result[0][0] if result else None