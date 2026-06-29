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
		sql = """select ID, 部门名称, 操作人, addTime, updateTime, 排序, IIF(是否显示=0,'<font color=red>不显示</font>','<font color=green>显示</font>') 是否显示, 主部门ID from [办公室].[dbo].[Of_tb电话部门] """
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
