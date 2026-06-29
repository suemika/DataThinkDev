import json
import time

from dbroute import DBROUTE
import base64


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)

    def service(self):
        functionID = self.json_obj['functionID']
        functionType = self.json_obj['functionType']
        glueType = self.json_obj['glueType']
        commitMessage = self.json_obj['commitMessage']
        commitDateTime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
        glueSource = str(base64.b64decode(self.json_obj['glueSource']), "utf-8")
        # 插入数据库
        db = DBROUTE(1)
        sql = "insert into Main.[dbo].[tbCodeRecord](functionID, functionType, glueType,glueSource, commitMessage, commitDateTime) values('" + functionID + "','" + functionType + "','" + glueType + "','" + glueSource.replace("'", "''") + "','" + commitMessage + "','" + commitDateTime + "')"
        db.ExecNonQuery(sql)
        # 更新tableDataGrid中逻辑代码
        # 根据gridNo获取glueType
        if functionType == 'view':
            sql = "select glueType from Main.[dbo].[tbDataGrid] where gridNo = '" + functionID + "'"
        elif functionType == 'button':
            sql = "select glueType from Main.[dbo].[tbDataToolbar] where ID = '" + functionID + "'"
        elif functionType == 'attachment':
            sql = "select glueType from [Main].[dbo].[tbAttachmentConfig] where ID = '" + functionID + "'"
        elif functionType == 'queue':
            sql = "select 消费者代码 from [Main].[dbo].[tbMQExample] where ID = '" + functionID + "'"
        elif functionType == 'dict':
            sql = "select glueType from [Main].[dbo].[tbDataDictsConfig] where ID = '" + functionID + "'"
        elif functionType == 'amis':
            sql = "update Main.[dbo].[tbDataGrid] set amisCode = '" + glueSource + "', glueUpdatetime = '" + commitDateTime + "' where id = '" + functionID + "'"
            db.ExecNonQuery(sql)
            return '修改成功'
        glueType = db.ExecQuery(sql)[0][0]
        if glueType == 'GLUE_StoreProcedure':
            # 更新存储过程
            if functionType == 'view':
                sql = "select DBlinkID from [Main].[dbo].[tbDataGrid] a left outer join [Main].[dbo].[tbDatabaseLink] b on a.DBlinkID = b.ID   where gridNo = '" + functionID + "'"
            elif functionType == 'button':
                sql = "select b.DBlinkID from [Main].[dbo].[tbDataToolbar] a left outer join [Main].[dbo].[tbDataGrid] b on a.pid = b.ID  left outer join [Main].[dbo].[tbDatabaseLink] c on b.DBlinkID = c.ID  where a.ID = '" + functionID + "'"
            db_link_id = db.ExecQuery(sql)[0][0]
            proc_db = DBROUTE(db_link_id)
            proc_db.ExecNonQuery(glueSource)
            return '修改成功'
        else:
            # 更新代码
            if functionType == 'view':
                sql = "update Main.[dbo].[tbDataGrid] set glueSource = '" + glueSource.replace("'", "''") + "', glueUpdatetime = '" + commitDateTime + "' where gridNo = '" + functionID + "'"
            elif functionType == 'button':
                sql = "update Main.[dbo].[tbDataToolbar] set glueSource = '" + glueSource.replace("'", "''") + "', glueUpdatetime = '" + commitDateTime + "' where ID = '" + functionID + "'"
            elif functionType == 'attachment':
                sql = "update Main.[dbo].[tbAttachmentConfig] set glueSource = '" + glueSource.replace("'", "''") + "', glueSourceUpdateTime = '" + commitDateTime + "' where ID = '" + functionID + "'"
            elif functionType == 'queue':
                sql = "update Main.[dbo].[tbMQExample] set 消费者代码 = '" + glueSource.replace("'", "''") + "' where ID = '" + functionID + "'"
            elif functionType == 'dict':
                sql = "update Main.[dbo].[tbDataDictsConfig] set glueSource = '" + glueSource.replace("'", "''") + "', glueUpdateTime = '" + commitDateTime + "' where ID = '" + functionID + "'"
            db.ExecNonQuery(sql)
            return '修改成功'
