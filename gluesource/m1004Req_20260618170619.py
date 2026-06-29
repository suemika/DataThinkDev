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
		sql = 'select * from IMES_PES2.T_SH_ZBS_FHTZTP  '
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
		sql = sql + where_sql + order_by_sql
		cols = ['发货通知单号', '批号', '定尺', '规格', '产品名称1', '牌号', '许可证号', '执行标准', '发货状态', '合同号', '收货单位', '日期', '请发日期', '车号', '各支理重', '各支实重', '各支件数', '重量', '支数', '件数', '炉号', '屈服强度', '抗拉强度', '强屈比', '断后伸长率', '最大应力下的总伸长率', '超强比', '冷弯180度', '反弯', '冲击功1', '冲击功2', '冲击功3', '冲击功平均值', '冲击功', '米重', '实物标记', '弯曲类型', 'D类型', '试验温度', '技术规范', 'C', 'MN', 'P', 'S', 'SI', 'CU', 'NI', 'CR', 'MO', 'V', 'B', 'CEQ', 'CMN6', 'CE', 'N', 'ALT', 'TI', 'NB', 'ALS', '总重量', '总件数', '断面收缩率', '试样尺寸', '下屈服强度']
		db = DBROUTE(self.DBlinkID)
		result_list = db.ExecQuery(sql)
		# 符合条件总条数
		raw_rows = result_list
		result_list = []
		for row in raw_rows:
			d = {}
			for i, c in enumerate(cols):
				d[c] = row[i]
			result_list.append(d)
		total = len(result_list)
		rows = result_list[self.rows * (self.page - 1): self.rows * self.page]
		result = json.dumps({'total': total, 'rows': rows})
		return result
