import json
from dbroute import DBROUTE


class Servlet:
    # 获取插入操作传来的args
    def __init__(self, args):
        self.req = args['req']
        self.data = args['data']
        self.databaseName = args['databaseName']
        self.tableName = args['tableName']
        self.DBLinkID = args['DBLinkID']
    def service(self):
        tbDb = DBROUTE(self.DBLinkID)
        primary_id = ''
        if tbDb.dbcon.serverName == 'SQLSERVER':
            # 列类型映射字典
            col_xtype_dir = {'34': 'image', '56': 'int', '167': 'varchar', '231': 'nvarchar', '104': 'bit', '61': 'datetime', '40': 'date', '239': 'nchar', '35': 'text', '62': 'float', '106': 'decimal', '108': 'numeric'}
            col_info_list = []
            get_col_info_sql = "select  [name],'aliasNameooo'+convert(varchar(50),row_number() over(order by [name])),a.[xtype],[length]  from  ["+self.databaseName+"].[dbo].[syscolumns] a where  a.id =(select id  from ["+self.databaseName+"].[dbo].[sysobjects] where xtype = 'U' and [name] = '"+self.tableName+"')"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            for col_info in temp_col_info_list:
                col_dir = {'name': col_info[0], 'aliasName': col_info[1], 'xtype': col_xtype_dir[str(col_info[2])] if tbDb.dbcon.serverName == 'SQLSERVER' else str(col_info[2]), 'length': str(col_info[3] if col_info[3] else '0')}
                col_info_list.append(col_dir)
            # 将字段替换为上面生成的随机别名，防止字段中含有特殊字符在转化格式时发生错误
            for col_info in col_info_list:
                name = col_info['name']
                aliasName = col_info['aliasName']
                self.data = self.data.replace('"'+name+'":', '"'+aliasName+'":')
            select_sql = "select * from openjson('" + self.data + "') with("
            insert_sql = 'insert into [' + self.databaseName + '].[dbo].[' + self.tableName+'] ('
            for col_info in col_info_list:
                name = col_info['name']
                if name != 'ID' and name !='updateTime' and name != 'addTime':
                    aliasName = col_info['aliasName']
                    type = col_info['xtype']
                    length = col_info['length']
                    if length == '-1':
                        length = 'max'
                    if type == 'int':
                        select_sql = select_sql + "[" + name + "] int " + "'$."+aliasName+"',"
                    if type == 'varchar':
                        select_sql = select_sql + "[" + name + "] varchar(" + length + ") " + "'$."+aliasName+"',"

                    if type == 'nvarchar':
                        select_sql = select_sql + "[" + name + "] nvarchar(" + length + ") " + "'$."+aliasName+"',"

                    if type == 'bit':
                        select_sql = select_sql + "[" + name + "] bit " + "'$."+aliasName+"',"

                    if type == 'datetime':
                        select_sql = select_sql + "[" + name + "] datetime " + "'$."+aliasName+"',"

                    if type == 'date':
                        select_sql = select_sql + "[" + name + "] date " + "'$."+aliasName+"',"

                    if type == 'float':
                        select_sql = select_sql + "[" + name + "] float " + "'$."+aliasName+"',"

                    if type == 'decimal':
                        select_sql = select_sql + "[" + name + "] decimal(18,3) " + "'$."+aliasName+"',"
                    insert_sql = insert_sql + '[' + name + '],'
            insert_sql = insert_sql[:-1] + ')'
            select_sql = select_sql[:-1] + ')'
            insert_sql = insert_sql + select_sql+';select @@identity'
            primary_id = tbDb.ExecQuery(insert_sql)[0][0]
        if tbDb.dbcon.serverName == 'GREENPLUM':
            data_dir = json.loads(self.data)
            greenplum_insert_sql = 'insert into public."' + self.tableName + '"('
            get_col_info_sql = "select column_name from information_schema.columns where table_name = '" + self.tableName + "'"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            value_sql = ' values ('
            for col_info in temp_col_info_list:
                col_name = col_info[0]
                if col_name in data_dir:
                    value_sql = value_sql + "'"+data_dir[col_name] + "',"
                    greenplum_insert_sql = greenplum_insert_sql + '"'+col_name + '",'
            value_sql = value_sql[0:-1] + ')'
            greenplum_insert_sql = greenplum_insert_sql[:-1]+')' + value_sql
            tbDb.ExecNonQuery(greenplum_insert_sql)
            primary_id = tbDb.ExecQuery('select max(ID) from public."' + self.tableName+'"')[0][0]
        if tbDb.dbcon.serverName == 'POSTGRESQL':
            data_dir = json.loads(self.data)
            greenplum_insert_sql = 'insert into ' + self.tableName + '('
            get_col_info_sql = "select column_name from information_schema.columns where table_name = '" + self.tableName + "'"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            value_sql = ' values ('
            for col_info in temp_col_info_list:
                col_name = col_info[0]
                if col_name in data_dir:
                    value_sql = value_sql + "'"+data_dir[col_name] + "',"
                    greenplum_insert_sql = greenplum_insert_sql + col_name + ','
            value_sql = value_sql[0:-1] + ')'
            greenplum_insert_sql = greenplum_insert_sql[:-1]+')' + value_sql
            tbDb.ExecNonQuery(greenplum_insert_sql)
            primary_id = tbDb.ExecQuery('select max(ID) from ' + self.tableName)[0][0]
        # 执行插入操作
        try:
            primary_id = primary_id if primary_id else '-1'
            return {'next_opt': 'continue', 'msg': '新增成功!', 'primary_id': primary_id}
        except Exception as e:
            return json.loads('{"status": 1,"msg":"系统异常!","data": {}}')