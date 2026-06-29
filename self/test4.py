import json
from dbroute import DBROUTE
from self.certification_helper import CertificationHelper

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
        self.helper = CertificationHelper()
    # 根据过滤条件生成sql,并获取数据
    def service(self):
        db_1 = DBROUTE(51)
        userName = self.helper.get_user_id_name(self.sessionidd)
        sql_insert申报信息 = f"""
                                INSERT INTO [办公室].[dbo].[Of_tb访问记录] (model_name, login_name)
                                OUTPUT INSERTED.ID
                                VALUES ('员工反应问题', {userName});
                                """
        inserted_id = db_1.ExecQuery(sql_insert申报信息)

        sql = 'select * from [办公室].[dbo].[WHB_tb员工反应问题]  '
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
        sql = 'select convert(nvarchar(max),(' + sql + where_sql + order_by_sql + ' for json path))'
        db = DBROUTE(self.DBlinkID)
        result_list = db.ExecQuery(sql)
        # 符合条件总条数
        result_list = json.loads(result_list[0][0]) if result_list[0][0] else []
        total = len(result_list)
        rows = result_list[self.rows * (self.page - 1): self.rows * self.page]
        result = json.dumps({'total': total, 'rows': rows})
        return result
