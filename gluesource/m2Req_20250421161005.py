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

    # 根据过滤条件生成sql,并获取数据

    def service(self):

        where_sql = ' where 1=1 '

        order_by_sql = 'order by ' + self.orderBy

        for filterRule in self.filterRules:

            # 字段

            field = filterRule['field']

            # 比较逻辑符

            op = filterRule['op']

            # 比较值

            value = filterRule['value']

            if op == 'contains':

                where_sql = where_sql + ' and ' + field + " like '%" + value + "%'"

            elif op == 'equal' and value:

                where_sql = where_sql + ' and ' + field + " = '" + value + "'"

            elif op == 'notequal' and value:

                where_sql = where_sql + ' and ' + field + " <> '" + value + "'"

            elif op == 'less' and value:

                where_sql = where_sql + ' and ' + field + " < '" + value + "'"

            elif op == 'lessorequal' and value:

                where_sql = where_sql + ' and ' + field + " <= '" + value + "'"

            elif op == 'greater' and value:

                where_sql = where_sql + ' and ' + field + " > '" + value + "'"

            elif op == 'greaterorequal':

                where_sql = where_sql + ' and ' + field + " >= '" + value + "'"

            elif op == 'beginwith':

                where_sql = where_sql + ' and ' + field + " like '" + value + "%'"

            elif op == 'endwith':

                where_sql = where_sql + ' and ' + field + " like '%" + value + "'"

        db = DBROUTE(self.DBlinkID)

        # 获取配置的全部数据源

        dblink_sql = 'select ID, 类型,地址, 数据库, 备注 from [Main].[dbo].[tbDatabaseLink]'

        dblink_list = db.ExecQuery(dblink_sql)

        result_list = []

        for dblink in dblink_list:

            # 数据源ID

            id = dblink[0]

            if id != 24:
                continue

            # 数据库类型

            type = dblink[1]

            # 数据地址

            address = dblink[2]

            # 数据库名称

            db_name = dblink[3]

            # 数据库备注

            db_desc = dblink[4]

            # 获取数据库中表
            db = DBROUTE(id)
            # 只保留 ORACLE，其他数据库暂时注释
            if type == 'ORACLE':
                # Oracle 11g 不支持 JSON_OBJECT，用 Python 拼 JSON
                # all_tables 没有 create_date，JOIN all_objects 获取
                oracle_order = order_by_sql.replace('ID', 'table_name').replace('create_date', 'o.created')
                oracle_where = where_sql.replace('type', "'ORACLE'").replace('name', 'table_name').replace('create_date', 'o.created')

                search_table_sql = (
                    "SELECT a.table_name, a.owner, o.created AS create_date"
                    " FROM all_tables a"
                    " JOIN all_objects o ON a.owner = o.owner"
                    " AND a.table_name = o.object_name"
                    " AND o.object_type = 'TABLE'"
                    + oracle_where + " " + oracle_order
                )

                resTempList = db.ExecQuery(search_table_sql)
                if resTempList:
                    for row in resTempList:
                        db_dir = {
                            'dblinkid': str(id),
                            'type': type,
                            'address': address,
                            'db_name': db_name,
                            'db_desc': db_desc,
                            'name': row[0],
                            'object_id': row[1] + '.' + row[0]
                        }
                        result_list.append(db_dir)
            # elif type == 'SQLSERVER':
            #     ...
            # elif type == 'GREENPLUM':
            #     ...
            # elif type == 'POSTGRESQL':
            #     ...
            # elif type == 'MYSQL':
            #     ...

        total = len(result_list)

        rows = result_list[self.rows * (self.page - 1): self.rows * self.page]

        return json.dumps({'total': total, 'rows': rows})