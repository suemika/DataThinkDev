import json
import uuid
import time
from dbroute import DBROUTE

class Servlet:
    def __init__(self, jsonStr):
        self.json_obj = json.loads(jsonStr)

    def service(self):
        for data in self.json_obj:
            # DBLinkID
            id = str(data['dblinkid'])
            # 数据库类型
            type = data['type']
            # 数据库名称
            db_name = data['db_name']
            # 数据库备注
            db_desc = data['db_desc']
            # 表名
            name = data['name']
            # 表id
            object_id = str(data['object_id'])
            db = DBROUTE(id)
            if type == 'SQLSERVER':
                # 获取表中列名
                sql = "select  [name],[xtype],[length],[colorder]  from dbo.syscolumns where  id='" + object_id + "' order by colorder asc"
            elif type == 'GREENPLUM':
                self.object_id_list = object_id.split('-')
                sql = "select column_name,data_type from information_schema.columns where table_catalog = '"+self.object_id_list[0]+"' and  table_schema = '"+self.object_id_list[1]+"' and table_name = '"+self.object_id_list[2]+"' order by dtd_identifier asc"
            elif type == 'POSTGRESQL':
                self.object_id_list = object_id.split('-')
                sql = """
                    SELECT column_name, data_type  FROM information_schema.columns
                    where table_schema = '{table_scheme}' and table_name = '{table_name}'
                """.format(table_scheme=self.object_id_list[0], table_name=self.object_id_list[1])
            elif type == 'MYSQL':
                self.object_id_list = object_id.split('-')
                sql = """
                    SELECT column_name, data_type  FROM information_schema.columns
                    where table_schema = '{table_schema}' and table_name = '{table_name}'
                """.format(table_schema=self.object_id_list[0], table_name=self.object_id_list[1])
            elif type == 'ORACLE':
                self.object_id_list = object_id.split('.')
                sql = (
                    "SELECT column_name, data_type FROM all_tab_columns"
                    " WHERE owner = '" + self.object_id_list[0] + "'"
                    " AND table_name = '" + self.object_id_list[1] + "'"
                    " ORDER BY column_id"
                )
            col_list = db.ExecQuery(sql)
            formatted_parts = []

            formatted_parts2 = []
            for index in range(len(col_list)):
                formatted_parts.append(f'"{col_list[index][0]}", {col_list[index][0]}')
                if index == 0:
                    formatted_parts2.append("'{ \""+col_list[index][0]+"\"'")
                    formatted_parts2.append("':\"'")
                    formatted_parts2.append(col_list[index][0])
                elif index + 1 == len(col_list):
                    formatted_parts2.append("'\", \"" + col_list[index][0] + "\"'")
                    formatted_parts2.append("':\"'")
                    formatted_parts2.append(col_list[index][0])
                    formatted_parts2.append("'\"}'")
                else:
                    formatted_parts2.append("'\", \"" + col_list[index][0] + "\"'")
                    formatted_parts2.append("':\"'")
                    formatted_parts2.append(col_list[index][0])

            json_object_string = ', '.join(formatted_parts2)
            formatted_str = ",".join(formatted_parts)
            # 插入数据到 tbDataGrid
            # pid
            pid = '0'
            # 生成uuid
            gridNo = str(uuid.uuid1())
            serverName = ''
            title = ''
            rowStyle = ''
            glueType = 'GLUE_Python'
            sortName = col_list[0][0]
            sortOrder = 'asc'
            singleSelect = '1'
            pageSize = '10'
            pagePosition = 'both'
            subOrder = '0'
            remark = name
            editable = '1'
            exportable = '1'
            insertable = '1'
            importable = '0'
            addTime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time()))
            updateTime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time()))
            tbDataGrid_sql = "insert into [dbo].tbDataGrid(pid, gridNo, serverName, databaseName, tableName, title, rowStyler, glueType, sortName, sortOrder, singleSelect, pageSize, pagePosition, subOrder, remark, editable, exportable, insertable,importable, addTime, updateTime, DBlinkID) values('"+pid+"','"+gridNo+"','"+serverName+"','"+db_name+"','"+name+"','"+title+"','"+rowStyle+"','"+glueType+"','"+sortName+"','"+sortOrder+"','"+singleSelect+"','"+pageSize+"','"+pagePosition+"','"+subOrder+"','"+remark+"','"+editable+"','"+exportable+"','"+insertable+"','"+importable+"','"+addTime+"','"+updateTime+"','"+id+"')"
            # 向低代码主数据库中插入
            low_code_db = DBROUTE(1)
            low_code_db.ExecNonQuery(tbDataGrid_sql)
            # 查询插入数据的ID
            tbDataGrid_sql = "select id from [dbo].tbDataGrid where gridNo = '"+gridNo+"'"
            identity_id = str(low_code_db.ExecQuery(tbDataGrid_sql)[0][0])
            print(identity_id)
            # 拼接 gridNo
            gridNo_real = 'm' + identity_id + 'Req'
            # 存储过程名称
            proc_name = identity_id + '_Proc_Data'
            # 更新字段
            tbDataGrid_sql = "update [dbo].tbDataGrid set gridNo = '"+gridNo_real+"',procDataName = '"+proc_name+"' where gridNo = '"+gridNo+"'"
            low_code_db.ExecNonQuery(tbDataGrid_sql)
            order_count = 0
            for col in col_list:
                field_name = col[0]
                xtype = ''
                if type == 'GREENPLUM' or type == 'POSTGRESQL' or type == 'MYSQL':
                    if col[0].find('date') > -1:
                        xtype = 40
                    elif col[0].find('timestamp') > -1:
                        xtype = 61
                elif type == 'ORACLE':
                    # col[1] is data_type from all_tab_columns
                    if col[1] == 'DATE':
                        xtype = 40
                    elif col[1].startswith('TIMESTAMP'):
                        xtype = 61
                    elif col[1] in ('NUMBER', 'FLOAT', 'INTEGER', 'BINARY_FLOAT', 'BINARY_DOUBLE'):
                        xtype = 60
                elif type == 'SQLSERVER':
                    xtype = int(col[1])

                is_hidden = '0'
                editor = 'text'
                editorExtra = '{}'
                searchable = '0'
                # 字段为date类型
                if xtype == 40:
                    editor = 'input-date'
                    editorExtra = '{"format": "YYYY-MM-DD","shortcuts": ["yesterday","today","tomorrow"]}'
                # 字段为datetime类型
                if xtype == 61:
                    editor = 'input-datetime'
                    editorExtra = '{"format": "YYYY-MM-DD HH:mm:ss","shortcuts": ["yesterday","today","tomorrow"]}'

                if field_name == 'ID' or field_name == 'pid' or field_name == 'addTime' or field_name == 'updateTime' or field_name == '操作人':
                    is_hidden = '1'
                    editor = ''
                # 字段为nvarchar、varchar类型，开启搜索功能
                #if xtype == 167 or xtype == 231:
                #    searchable = '1'

                time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time()))
                col_sql = "insert into [dbo].[tbDataGridDetails] (pid,orderNum,field,title,width,align,halign,[hidden],editor,rowspan,colspan,addTime,updateTime,editorExtra,searchable) values ('" + identity_id + "','" + str(
                    order_count) + "','" + field_name + "','" + field_name + "','150','center','center','" + is_hidden + "','" + editor + "',0,0,'" + time_str + "','" + time_str + "','" + editorExtra + "','" + searchable + "')"
                low_code_db.ExecNonQuery(col_sql)
                order_count = order_count + 1
            # 拼接python语句
            py_str = 'import json \n'
            py_str = py_str + 'from dbroute import DBROUTE \n'
            py_str = py_str + 'class Servlet:\n'
            py_str = py_str + '\t# 解析json字符串,生成对象属性\n'
            py_str = py_str + '\tdef __init__(self, jsonStr):\n'
            py_str = py_str + '\t\tjson_obj = json.loads(jsonStr)\n'
            py_str = py_str + "\t\tself.orderBy = json_obj['orderBy']\n"
            py_str = py_str + "\t\tself.rows = int(json_obj['rows'])\n"
            py_str = py_str + "\t\tself.page = int(json_obj['page'])\n"
            py_str = py_str + "\t\tself.filterRules = json_obj['filterRules']\n"
            py_str = py_str + "\t\tself.sessionidd = json_obj['sessionidd']\n"
            py_str = py_str + "\t\tself.DBlinkID = json_obj['DBlinkID']\n"
            py_str = py_str + "\t# 根据过滤条件生成sql,并获取数据\n"
            py_str = py_str + "\tdef service(self):\n"
            if type == "SQLSERVER":
                py_str = py_str + "\t\tsql = 'select * from ["+db_name+"].[dbo].["+name+"]  '\n"
            elif type == 'GREENPLUM' :
                py_str = py_str + "\t\tsql = 'select * from "+self.object_id_list[1]+".\"" + self.object_id_list[2] + "\"  '\n"
            elif type == 'POSTGRESQL':
                py_str = py_str + "\t\tsql = 'select * from " + self.object_id_list[1] + "  '\n"
            elif type == 'ORACLE':
                py_str = py_str + "\t\tsql = 'select * from " + self.object_id_list[0] + "." + self.object_id_list[1] + "  '\n"
            py_str = py_str + "\t\twhere_sql = ' where 1=1 '\n"
            py_str = py_str + "\t\torder_by_sql = 'order by ' + self.orderBy\n"
            py_str = py_str + "\t\tfor filterRule in self.filterRules:\n"
            py_str = py_str + "\t\t\t# 字段\n"
            if type == 'SQLSERVER' or type == 'MYSQL' or type == 'ORACLE':
                py_str = py_str + "\t\t\tfield = filterRule['field']\n"
            elif type == 'GREENPLUM' or type == 'POSTGRESQL':
                py_str = py_str + "\t\t\tfield = '\"' + filterRule['field'] + '\"'\n"
            py_str = py_str + "\t\t\t# 比较逻辑符\n"
            py_str = py_str + "\t\t\top = filterRule['op']\n"
            py_str = py_str + "\t\t\t# 比较值\n"
            py_str = py_str + "\t\t\tvalue = filterRule['value']\n"
            py_str = py_str + "\t\t\tif op == 'contains':\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " like '%" + value + "%'"\n'''
            py_str = py_str + "\t\t\telif op == 'equal' and value:\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " = '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'notequal' and value:\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " <> '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'less' and value:\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " < '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'lessorequal' and value:\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " <= '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'greater' and value:\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " > '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'greaterorequal':\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " >= '" + value + "'"\n'''
            py_str = py_str + "\t\t\telif op == 'beginwith':\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " like '" + value + "%'"\n'''
            py_str = py_str + "\t\t\telif op == 'endwith':\n"
            py_str = py_str + '''\t\t\t\twhere_sql = where_sql + ' and ' + field + " like '%" + value + "'"\n'''
            if type == 'SQLSERVER':
                py_str = py_str + "\t\tsql = 'select convert(nvarchar(max),(' + sql + where_sql + order_by_sql + ' for json path))'\n"
            elif type == 'GREENPLUM' or type == 'POSTGRESQL':
                py_str = py_str + "\t\tsql = 'select array_to_json(array_agg(row_to_json(t))) as array_to_json from (' + sql + where_sql + order_by_sql + ') t'\n"
            elif type == 'MYSQL':
                py_str = py_str + "\t\t#sql = \"\"\"select * from (select CONCAT(\"+json_object_string+\") AS json_result from \"+self.object_id_list[1]+\"\"\"\" + where_sql + order_by_sql + \"\"\"\") as subquery  where json_result IS NOT NULL\"\"\"\n"
                py_str = py_str + "\t\tsql = 'select JSON_ARRAYAGG(JSON_OBJECT(\"+formatted_str+\")) AS json_result from \"+self.object_id_list[1]+\"' + where_sql + order_by_sql \n"
            elif type == 'ORACLE':
                # Oracle: 不用 JSON 函数，Python 端转 dict（兼容 11g/19c）
                col_names = [col[0] for col in col_list]
                py_str = py_str + "\t\tsql = sql + where_sql + order_by_sql\n"
                py_str = py_str + "\t\tcols = " + str(col_names) + "\n"
            py_str = py_str + "\t\tdb = DBROUTE(self.DBlinkID)\n"
            py_str = py_str + "\t\tresult_list = db.ExecQuery(sql)\n"
            py_str = py_str + "\t\t# 符合条件总条数\n"
            if type == 'SQLSERVER' or type == 'MYSQL':
                py_str = py_str + "\t\tresult_list = json.loads(result_list[0][0]) if result_list[0][0] else []\n"
            elif type == 'ORACLE':
                py_str = py_str + "\t\traw_rows = result_list\n"
                py_str = py_str + "\t\tresult_list = []\n"
                py_str = py_str + "\t\tfor row in raw_rows:\n"
                py_str = py_str + "\t\t\td = {}\n"
                py_str = py_str + "\t\t\tfor i, c in enumerate(cols):\n"
                py_str = py_str + "\t\t\t\td[c] = row[i]\n"
                py_str = py_str + "\t\t\tresult_list.append(d)\n"
            elif type == 'GREENPLUM' or type == 'POSTGRESQL':
                py_str = py_str + "\t\tresult_list = result_list[0][0]\n"
            py_str = py_str + "\t\ttotal = len(result_list)\n"
            py_str = py_str + "\t\trows = result_list[self.rows * (self.page - 1): self.rows * self.page]\n"
            py_str = py_str + "\t\tresult = json.dumps({'total': total, 'rows': rows})\n"
            py_str = py_str + "\t\treturn result\n"
            print(py_str)
            # 更新glueSource
            py_str = py_str.replace("'", "''")
            update_sql = "update [Main].[dbo].[tbDataGrid] set glueSource = '"+py_str+"' where id = '"+identity_id+"'"
            low_code_db.ExecNonQuery(update_sql)
            return '创建成功'