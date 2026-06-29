import json
from dbroute import DBROUTE


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, jsonStr):
        json_obj = json.loads(jsonStr)
        self.orderBy = json_obj['orderBy']
        self.rows = int(json_obj['rows'])
        self.page = int(json_obj['page'])
        self.filterRules = json_obj['filterRules']
        self.sessionidd = json_obj['sessionidd']
        self.DBlinkID = json_obj['DBlinkID']

    def service(self):
        # 功能代号
        functionID = self.filterRules[0]['value']
        # 功能类型 view-界面代码 button-按钮代码
        functionType = self.filterRules[1]['value']
        # 获取历史版本ID
        recordID = ''
        if len(self.filterRules)==3:
            recordID = self.filterRules[2]['value']

        db = DBROUTE(1)
        sql = "select glueSource,glueType,commitMessage from [Main].[dbo].[tbCodeRecord] where 1=1 and functionID = '" + functionID + "' order by commitDateTime desc"
        result_list = db.ExecQuery(sql)
        result = {"glueType": '', "glueSource": '', 'commitMessage': ''}

        if recordID != '':
            sql = sql.replace('1=1', 'ID = ' + str(recordID))
            result_list = db.ExecQuery(sql)
            result = {"glueType": result_list[0][1], "glueSource": result_list[0][0],
                      "commitMessage": result_list[0][2]}
        else:
            sql = ""
            # 界面代码
            if functionType == 'view':
                sql = "select glueSource,glueType,title,procDataName,DBlinkID from [Main].[dbo].[tbDataGrid] a left outer join [Main].[dbo].[tbDatabaseLink] b on a.DBlinkID = b.ID   where gridNo = '" + functionID + "'"
            elif functionType == 'button':
                sql = "select a.glueSource,a.glueType,text,procName,b.DBlinkID from [Main].[dbo].[tbDataToolbar] a left outer join [Main].[dbo].[tbDataGrid] b on a.pid = b.ID  left outer join [Main].[dbo].[tbDatabaseLink] c on b.DBlinkID = c.ID  where a.ID = '" + functionID + "'"
            elif functionType == 'attachment':
                sql = "select glueSource,glueType,remark,'',1 FROM [Main].[dbo].[tbAttachmentConfig] where id = '"+functionID+"'"
            elif functionType == 'queue':
                sql = "select 消费者代码,代码类型,说明,'',1 FROM [Main].[dbo].[tbMQExample] where id = '"+functionID+"'"
            elif functionType == 'dict':
                sql = "select glueSource,glueType,remark, procName, DBlinkID from [Main].[dbo].[tbDataDictsConfig] where id = '"+functionID+"'"
            if sql:
                result_list = db.ExecQuery(sql)
                if len(result_list) > 0:
                    glueType = result_list[0][1].lower()
                    if glueType.find('python') > -1:
                        glueType = 'python'
                    elif glueType.find('storeprocedure') > -1:
                        glueType = 'sql'
                    elif glueType.find('java') > -1:
                        glueType = 'java'
                    else:
                        glueType = 'python'
                    glueSource = ''
                    if glueType == 'sql':
                        # 获取存储过程代码
                        procDataName = result_list[0][3] if result_list[0][3] else ''
                        dblinkid = result_list[0][4] if result_list[0][4] else ''
                        proc_db = DBROUTE(dblinkid)
                        sql = "  select definition from sys.sql_modules where object_id  in (select id  from dbo.sysobjects where OBJECTPROPERTY(id,N'IsProcedure') = 1 and name = '" + procDataName + "')"
                        proc_code = proc_db.ExecQuery(sql)[0][0].replace('CREATE PROCEDURE', 'ALTER PROCEDURE').replace('create procedure', 'alter procedure').replace('create PROCEDURE', 'alter PROCEDURE').replace('CREATE procedure', 'ALTER procedure')
                        glueSource = proc_code
                    else:
                        glueSource = result_list[0][0] if result_list[0][0] else ''
                    commitMessage = result_list[0][2] if result_list[0][2] else ''
                    result = {"glueType": glueType, "glueSource": glueSource, 'commitMessage': commitMessage}
        return json.dumps(result, ensure_ascii=False)