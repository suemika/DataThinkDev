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
        update_sql = ''
        if tbDb.dbcon.serverName == 'SQLSERVER':
            # 列类型映射字典
            col_xtype_dir = {'34': 'image', '56': 'int', '167': 'varchar', '231': 'nvarchar', '104': 'bit', '61': 'datetime', '40': 'date', '239': 'nchar', '35': 'text', '62': 'float', '106': 'decimal', '108': 'numeric'}
            col_info_list = []
            # 获取表中字段的类型及列名
            get_col_info_sql = "select  [name],'aliasNameooo'+convert(varchar(50),row_number() over(order by [name])),a.[xtype],[length]  from  ["+self.databaseName+"].[dbo].[syscolumns] a where  a.id =(select id  from ["+self.databaseName+"].[dbo].[sysobjects] where xtype = 'U' and [name] = '"+self.tableName+"')"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            ID = ''
            data_dir = json.loads(self.data)
            for key, value in data_dir.items():
                if key.upper() == 'ID' and ID == '':
                    ID = value
            for col_info in temp_col_info_list:
                col_key = col_info[0]
                for key, value in data_dir.items():
                    if key == col_key:
                        col_dir = {'name': col_info[0], 'value': value, 'aliasName': col_info[1], 'xtype': col_xtype_dir[str(col_info[2])], 'length': str(col_info[3])}
                        col_info_list.append(col_dir)
            # 将字段替换为上面生成的随机别名，防止字段中含有特殊字符在转化格式时发生错误
            for col_info in col_info_list:
                name = col_info['name']
                aliasName = col_info['aliasName']
                self.data = self.data.replace('"'+name+'":', '"'+aliasName+'":')
            update_sql = "update " + self.tableName + " set "
            for col_info in col_info_list:
                name = col_info['name']
                if name != 'ID' and name !='updateTime' and name != 'addTime' and name != '':
                    value = col_info['value']
                    update_sql = update_sql + str("[" + name + "] = '" + value + "',")
            update_sql = update_sql[0:-1]
            update_sql = update_sql + " where ID = '" + str(ID) + "'"
        if tbDb.dbcon.serverName == 'GREENPLUM':
            ID = ''
            data_dir = json.loads(self.data)
            for key, value in data_dir.items():
                if key.upper() == 'ID' and ID == '':
                    ID = value
            data_dir = json.loads(self.data)
            update_sql = 'update public."' + self.tableName + '" set '
            get_col_info_sql = "select column_name from information_schema.columns where table_name = '" + self.tableName + "'"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            for col_info in temp_col_info_list:
                col_name = col_info[0]
                if col_name in data_dir and col_name.upper() != 'ID':
                    update_sql = update_sql + '"' + col_name + '" = ' + "'" + data_dir[col_name] + "',"
            update_sql = update_sql[0:-1] + ' where "id" = ' + "'" + ID + "'"
        if tbDb.dbcon.serverName == 'POSTGRESQL':
            ID = ''
            data_dir = json.loads(self.data)
            for key, value in data_dir.items():
                if key.upper() == 'ID' and ID == '':
                    ID = value
            data_dir = json.loads(self.data)
            update_sql = 'update ' + self.tableName + ' set '
            get_col_info_sql = "select column_name from information_schema.columns where table_name = '" + self.tableName + "'"
            temp_col_info_list = tbDb.ExecQuery(get_col_info_sql)
            for col_info in temp_col_info_list:
                col_name = col_info[0]
                if col_name in data_dir and col_name.upper() != 'ID':
                    update_sql = update_sql + '"' + col_name + '" = ' + "'" + data_dir[col_name] + "',"
            update_sql = update_sql[0:-1] + ' where id = ' + "'" + ID + "'"
        # 执行更新操作
        try:
            tbDb.ExecNonQuery(update_sql)
            return {'next_opt': 'continue', 'msg': '更新成功!'}
        except Exception as e:
            return json.loads('{"status": 1,"msg":"系统异常!","data": {}}')

