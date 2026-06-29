import json
import urllib
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
		reslist = DBROUTE(1).ExecQuery("select 1 from [Main].[dbo].[tbSessionRecord] where [sessionidd] = '"+self.sessionidd+"' and userid in (SELECT [userid] FROM [Main].[dbo].[tbGroupUser] where pid =1 )")
		if reslist != []:
			self.developer = True
		else:
			self.developer = False
		self.userid = DBROUTE(1).ExecQuery("select userid from [Main].[dbo].[tbSessionRecord] where sessionidd = '"+self.sessionidd+"'")[0][0]
	# 获取inputTable的子表字符串
	def generalInputTableChildJSONStr(self, req):
		# 获取表格配置信息
		db = DBROUTE(1)
		# 获取子表信息
		child_table_sql = "select gridNo,ID,isnull(title,''),pageSize,sortOrder,sortName,pagePosition, editable,exportable,insertable,importable,copyable,intervalMillisecond,insertActionType,editActionType,subGridActionType,primaryKey,columnCount,uploadAttachments,uploadBtnPosition,exportBtnPosition from [Main].[dbo].[tbDataGrid] where pid = (select ID from [Main].[dbo].[tbDataGrid] where gridNo = '" + str(
			req) + "') order by subOrder asc"
		child_table_ID_list = db.ExecQuery(child_table_sql)
		if len(child_table_ID_list) > 0:
			# 子表在前端展示的collapse-group组件
			collapse_list = []
			id_list = []
			for child_table in child_table_ID_list:
				child_table_req = str(child_table[0])
				child_table_id = str(child_table[1])
				child_table_title = str(child_table[2])
				if child_table_title == '':
					child_table_title = '数据明细'
				child_table_pageSize = child_table[3]
				child_table_editable = child_table[7]
				child_table_insertable = child_table[9]
				intervalMillisecond = child_table[12]
				child_sub_primarykey = child_table[16]

				child_table_detail_sql = "select  field,title,hidden,searchable,width,align,sortable,editor,code,copyable,isnull(fixed,'') fixed,editorExtra,searchExtra,columnExtra  FROM [Main].[dbo].[tbDataGridDetails] where pid = '" + child_table_id + "' and isnull(field,'')!='' order by orderNum asc"
				child_table_col_list = db.ExecQuery(child_table_detail_sql)
				# 存放crud的列信息(隐藏ID列)
				column_list = []
				column_filterRules = []
				add_data_dir = {}
				add_data_dir_original = {}  # 对应真实字段
				update_data_dir = {}

				for col in child_table_col_list:
					col_field = col[0]
					col_title = col[1]
					col_hidden = col[2]
					col_searchable = col[3]
					col_width = int(col[4])
					col_align = col[5]
					col_sortable = col[6]
					col_editor = col[7] if col[7] else ''
					col_code = col[8] if col[8] else ''
					col_copyable = col[9]
					col_fixed = col[10]
					col_editorExtra = json.loads(col[11])
					col_searchExtra = col[12]
					col_columnExtra = json.loads(col[13])
					if col_editor.find('textbox') > -1 or col_editor.find('textarea') > -1:
						col_editor = 'textarea'
					elif col_editor.find('combobox') > -1:
						col_editor = 'select'
					elif col_editor.find('datetimebox') > -1:
						col_editor = 'input-datetime'
					elif col_editor.find('date') > -1:
						col_editor = 'input-date'
					elif col_editor == 'text':
						col_editor = 'input-text'
					elif col_editor.find('number') > -1:
						col_editor = 'input-number'
					elif col_editor.find('input-rich-text') > -1:
						col_editor = 'input-rich-text'
					elif col_editor.find('input-year') > -1:
						col_editor = 'input-year'
					elif col_editor.find('json-scheme') > -1:
						col_editor = 'json-scheme'
					elif col_editor.find('tree-select') > -1:
						col_editor = 'tree-select'
					elif col_editor.find('static') > -1:
						col_editor = 'static'
					elif col_editor.find('static-tpl') > -1:
						col_editor = 'static-tpl'
					if not col_hidden:
						col_dir = {'name': col_field, 'label': col_title, 'width': col_width, 'align': col_align}
						if col_searchable:
							column_filterRules.append(
								{"field": col_field, "op": "contains", "value": "${" + col_field + "}"})
						if col_searchable:
							if col_searchExtra != '':
								col_dir['searchable'] = json.loads(col_searchExtra)
							else:
								col_dir['searchable'] = {"name": col_field, "label": col_title,
														 "type": "input-text"}
						col_dir['sortable'] = col_sortable
						col_dir['copyable'] = col_copyable
						col_dir['fixed'] = col_fixed
						if (
								child_table_insertable or child_table_editable) and col_editor != '' and col_field.upper() != child_sub_primarykey:
							col_dir['quickEdit'] = dict({
								"type": col_editor
							}, **col_editorExtra)
						col_dir = dict(col_dir, **col_columnExtra)
						column_list.append(col_dir)

					if (
							child_table_insertable or child_table_editable) and col_editor != '' and col_field.upper() != child_sub_primarykey:
						add_data_dir[col_field] = '${' + col_field + '}'
						add_data_dir_original[col_field] = '${' + col_field + '}'
						update_data_dir[col_field] = '${' + col_field + '}'

				add_data_dir_original['pid'] = '${currentPID}'
				update_data_dir[child_sub_primarykey] = '${' + child_sub_primarykey + '}'

				# tab子表的page层
				page_dir = {'type': 'page'}
				# page中body对应的crud对象
				crud_dir = {'type': 'input-table', 'id': 'small_crud' + child_table_id, 'className': 'm-b-none',
							'syncLocation': 'false', "autoGenerateFilter": True, "autoFillHeight": True}
				if intervalMillisecond > 0:
					crud_dir["interval"] = intervalMillisecond
					crud_dir["silentPolling"] = True
				# crud请求界面数据Api
				childInputTableQueryDataApiDict = {'req': child_table_req, 'page': '1', 'rows': '1000000',
												   'sort': '', 'order': '', 'pid': '${currentPID}',
												   'filterRules': json.dumps(column_filterRules,
																			 ensure_ascii=False)}
				childInputTableQueryDataApi = {'method': 'post', 'url': '/imc/queryData', "dataType": "form",
											   'data': childInputTableQueryDataApiDict}
				childInputTableInsertDataApi = {'method': 'post', 'url': '/imc/insert', 'dataType': 'json',
												'data': {'req': child_table_req,
														 'data': json.dumps(add_data_dir_original,
																			ensure_ascii=False)}}
				childInputTableEditDataApi = {'method': 'post', 'url': '/imc/update', 'dataType': 'json',
											  'data': {'req': 'm' + child_table_id + 'Req',
													   "data": json.dumps(update_data_dir, ensure_ascii=False)}}

				childInputTalble = {
					"type": "service",
					"id": child_table_id,
					"api": childInputTableQueryDataApi,
					"body": {
						"type": "input-table",
						"name": "rows",
						"headerToolbar":['reload'],
						"columns": column_list,
						"addable": child_table_insertable,
						"editable": child_table_editable,
						"removable":False,
						"showTableAddBtn": True,
						"showFooterAddBtn": True,
						"addApi": childInputTableInsertDataApi,
						"updateApi": childInputTableEditDataApi,
						"deleteApi": {},
						"perPage": child_table_pageSize

					}
				}
				id_list.append(child_table_id)
				# 子表tab
				collapse = {"type": "collapse", 'header': child_table_title, "body": childInputTalble}
				collapse_list.append(collapse)
			return {'collapse_list': collapse_list, 'id_list': id_list}

	# 获取crud的子表json字符串
	def generalCRUDChildJSONStr(self, req):
		# 获取表格配置信息
		db = DBROUTE(1)
		# 获取子表信息
		child_table_sql = "select gridNo,ID,isnull(title,''),pageSize,sortOrder,sortName,pagePosition, editable,exportable,insertable,importable,copyable,intervalMillisecond,insertActionType,editActionType,subGridActionType,primaryKey,columnCount,uploadAttachments,uploadBtnPosition,exportBtnPosition from [Main].[dbo].[tbDataGrid] where pid = (select ID from [Main].[dbo].[tbDataGrid] where gridNo = '" + str(req) + "') order by subOrder asc"
		child_table_ID_list = db.ExecQuery(child_table_sql)
		if len(child_table_ID_list) > 0:
			# 子表在前端展示的tabs组件
			tabs_list = []
			for child_table in child_table_ID_list:
				child_table_req = str(child_table[0])
				child_table_id = str(child_table[1])
				child_table_title = str(child_table[2])
				if child_table_title == '':
					child_table_title ='数据明细'
				child_table_pageSize = child_table[3]
				child_table_sortOrder = child_table[4]
				child_table_sortName = child_table[5]
				child_table_pagePosition = child_table[6]
				child_table_editable = child_table[7]
				child_table_exportable = child_table[8]
				child_table_insertable = child_table[9]
				child_table_importable = child_table[10]
				child_table_copytable = child_table[11]
				intervalMillisecond = child_table[12]
				child_insert_action_type = child_table[13]
				child_edit_action_type = child_table[14]
				child_sub_action_type = child_table[15]
				child_sub_primarykey = child_table[16]
				child_sub_columnCount = child_table[17]
				child_sub_uploadAttachments = child_table[18]
				child_sub_uploadBtnPosition = child_table[19]
				child_sub_exportBtnPosition = child_table[20]

				# 自定义按钮
				sql = "SELECT a.[ID],a.[text],isnull(a.confirmText,'') confirmText, a.[position],a.actionType,a.viewSource FROM [Main].[dbo].[tbDataToolbar] a left outer join [Main].[dbo].[tbDataToolBarDetails] b on a.ID = b.pid  where a.pid = '" + child_table_id + "' and (b.userid = '"+self.userid+"' or b.userid is null) and optType = 'common' order by orderNum asc"
				custom_toolbar_list = db.ExecQuery(sql)
				bulk_top_list = []
				bulk_optCol_list = []
				child_table_detail_sql = "select  field,title,hidden,searchable,width,align,sortable,editor,code,copyable,isnull(fixed,'') fixed,editorExtra,searchExtra,columnExtra  FROM [Main].[dbo].[tbDataGridDetails] where pid = '" + child_table_id + "' and isnull(field,'')!='' order by orderNum asc"
				child_table_col_list = db.ExecQuery(child_table_detail_sql)
				# 存放crud的列信息(隐藏ID列)
				column_list = []
				column_filterRules = []
				add_data_dir = {}
				add_data_dir_original = {} #对应真实字段
				add_form_list = []
				update_data_dir = {}
				update_form_list = []

				for col in child_table_col_list:
					col_field = col[0]
					col_title = col[1]
					col_hidden = col[2]
					col_searchable = col[3]
					col_width = int(col[4])
					col_align = col[5]
					col_sortable = col[6]
					col_editor = col[7] if col[7] else ''
					col_code = col[8] if col[8] else ''
					col_copyable = col[9]
					col_fixed = col[10]
					col_editorExtra = json.loads(col[11])
					col_searchExtra = col[12]
					col_columnExtra = json.loads(col[13])
					if col_editor.find('textbox') > -1 or col_editor.find('textarea') > -1:
						col_editor = 'textarea'
					elif col_editor.find('combobox') > -1:
						col_editor = 'select'
					elif col_editor.find('datetimebox') > -1:
						col_editor = 'input-datetime'
					elif col_editor.find('date') > -1:
						col_editor = 'input-date'
					elif col_editor == 'text':
						col_editor = 'input-text'
					elif col_editor.find('number') > -1:
						col_editor = 'input-number'
					elif col_editor.find('input-rich-text') > -1:
						col_editor = 'input-rich-text'
					elif col_editor.find('input-year') > -1:
						col_editor = 'input-year'
					elif col_editor.find('json-scheme') > -1:
						col_editor = 'json-scheme'
					elif col_editor.find('tree-select') > -1:
						col_editor = 'tree-select'
					elif col_editor.find('static') > -1:
						col_editor = 'static'
					if not col_hidden:
						col_dir = {'name': col_field, 'label': col_title,  'width': col_width,'align': col_align}
						if col_searchable:
							column_filterRules.append({"field": col_field, "op": "contains", "value": "${" + col_field + "}"})
						if col_searchable:
							if col_searchExtra != '':
								col_dir['searchable'] = json.loads(col_searchExtra)
							else:
								col_dir['searchable'] = {"name": col_field, "label": col_title, "type": "input-text"}
						col_dir['sortable'] = col_sortable
						col_dir['copyable'] = col_copyable
						col_dir['fixed'] = col_fixed
						col_dir = dict(col_dir, **col_columnExtra)
						column_list.append(col_dir)

					if  (child_table_insertable or child_table_editable) and col_editor != '' and col_field.upper() != child_sub_primarykey :
						add_data_dir[col_field]= '${' + str(child_table_id)+'_'+col_field + '}'
						add_data_dir_original[col_field]= '${' + col_field + '}'
						update_data_dir[col_field] = '${' + col_field + '}'
						add_form_temp_dir = {'name': str(child_table_id)+'_'+col_field, 'label': col_title, "type": col_editor}
						add_form_temp_dir = dict(add_form_temp_dir, **col_editorExtra)
						add_form_list.append(add_form_temp_dir)

						update_form_temp_dir = {'name': col_field, 'label': col_title,"type": col_editor}
						update_form_temp_dir = dict(update_form_temp_dir, **col_editorExtra)
						update_form_list.append(update_form_temp_dir)

				add_data_dir_original['pid'] =  '${pid}'
				update_data_dir[child_sub_primarykey] = '${' + child_sub_primarykey + '}'

				for bulk in custom_toolbar_list:
					bulk_id = bulk[0]
					bulk_text = bulk[1]
					bulk_confirmtext = bulk[2]
					bulk_postion = bulk[3]
					bulk_actionType = bulk[4]
					bluk_viewSource = bulk[5]
					# 顶部显示的操作按钮
					if bulk_postion == 'top':
						if bulk_actionType == 'ajax':
							t_body = json.loads(bluk_viewSource) if bluk_viewSource else "${body}"
							bulk_top_list.append({"label": bulk_text,"actionType": "ajax","api": {"method": "post", "url": "/imc/customOpt","data": {"req": bulk_id, "data": "${rows|json}"}},"confirmText": bulk_confirmtext,"feedback":{"visibleOn":"(this.visibleOn)","title":"${title}","body":t_body,"actions":[]}})
						elif bulk_actionType == 'dialog':
							dialog_dir = {"label": bulk_text, "actionType": "dialog"}
							dialog_dir['dialog'] = bluk_viewSource
							bulk_top_list.append(dialog_dir)
					# 操作列
					else:
						if bulk_actionType == 'ajax':
							t_body = json.loads(bluk_viewSource) if bluk_viewSource else "${body}"
							bulk_optCol_list.append({"label": bulk_text, "actionType": "ajax",
												  "api": {"method": "post", "url": "/imc/customOpt",
														  "data": {"req": bulk_id, "data": json.dumps(update_data_dir)}},
												  "confirmText": bulk_confirmtext,"feedback":{"visibleOn":"(this.visibleOn)","title":"${title}","body":t_body,"actions":[]}})
						elif bulk_actionType == 'dialog':
							dialog_dir = {"label": bulk_text, "actionType": "dialog"}
							dialog_dir['dialog'] = bluk_viewSource
							bulk_optCol_list.append(dialog_dir)

				# tab子表的page层
				page_dir = {'type': 'page'}
				# page中body对应的crud对象
				crud_dir = {'type': 'crud', 'id': 'small_crud' + child_table_id,'className': 'm-b-none', 'syncLocation': 'false',"autoGenerateFilter": True,"autoFillHeight": True}
				if intervalMillisecond > 0:
					crud_dir["interval"] = intervalMillisecond
					crud_dir["silentPolling"] = True
				# crud请求界面数据Api
				crud_api_data_dir = {'req': child_table_req, 'page': '${page}', 'rows': '${perPage}','sort': '${orderBy}', 'order': '${orderDir}','pid': '${ID}','filterRules': json.dumps(column_filterRules, ensure_ascii=False)}
				crud_api_dir = {'method': 'post', 'url': '/imc/queryData', "dataType": "form", 'data': crud_api_data_dir}
				# 默认参数
				crud_defaultparams = {'perPage': str(child_table_pageSize), 'orderBy': child_table_sortName,'orderDir': child_table_sortOrder}
				crud_dir['defaultParams'] = crud_defaultparams
				# 分页数组自定义
				crud_dir['perPageAvailable'] = [10, 20, 50, 100, 500, 10000]
				# 顶部工具栏
				headerToolbar_dir = []
				#开发管理群组 显示界面配置按钮
				if self.developer == True:
					headerToolbar_dir.append({"icon": "fa fa-list-ol", "type": "button", "tooltip": "后台日志","onClick": "window.open('/imc/index/amis?p=m16Req&title=后台日志查看&功能代号=" + child_table_req + "','_blank')"})
					headerToolbar_dir.append({"icon":"fa fa-codepen", "type": "button","tooltip":"配置界面", "onClick":"window.open('/imc/index/amis?p=m3Req&title="+urllib.parse.quote(child_table_title+"【配置】")+"&ID="+child_table_id+"')"})
				headerToolbar_dir.append({"type": "columns-toggler","align": "right","draggable": True,"icon": "fas fa-cog","overlay": True,"footerBtnSize": "sm"})

				if child_table_pagePosition == 'top' or child_table_pagePosition == 'both':
					headerToolbar_dir.append("pagination")
				headerToolbar_dir.append('reload')

				#创建记录
				if child_table_insertable:
					# 顶部操作->新增按钮
					add_btn_dir = {'label': '创建记录', 'type': 'button', 'level': 'primary','actionType': child_insert_action_type}
					# 顶部操作->新增按钮->抽屉
					add_btn_drawer_dir = {'title': '创建记录', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"submit","label":"保存","level":"primary"}]}
					# 顶部操作->新增按钮->抽屉->body对应的form对象
					add_data_dir['pid'] = '${ID}'
					add_btn_drawer_form_api_dir = {'method': 'post', 'url': '/imc/insert','dataType': 'json', 'data': {'req': child_table_req,'data': json.dumps(add_data_dir,ensure_ascii=False)}}
					add_btn_drawer_form_dir = {'type': 'form', 'columnCount':child_sub_columnCount,'id': 'add_form' + child_table_id,'api': add_btn_drawer_form_api_dir}
					# 顶部操作->新增按钮->抽屉->body对应的form对象->form的body对应的列信息
					add_btn_drawer_form_body_dir = add_form_list
					add_btn_drawer_form_dir['body'] = add_btn_drawer_form_body_dir
					add_btn_drawer_dir['size'] = "xl"
					add_btn_drawer_dir['body'] = add_btn_drawer_form_dir
					add_btn_dir[child_insert_action_type] = add_btn_drawer_dir
					headerToolbar_dir.append(add_btn_dir)
				# 为crud操作列
				crud_opt_column_dir = {'type': 'operation', 'label': '操作', 'fixed': 'right', 'buttons': []}
				# 导出Excel
				if child_table_exportable:
					param = {}
					if child_sub_exportBtnPosition == 'top':
						param = {"downLoadTypeID": "${downLoadType}", "tableId": child_table_id,"pid":"${ID}"}
					elif child_sub_exportBtnPosition == 'optColumn':
						param = {"downLoadTypeID": "${downLoadType}", "rowId": "${ID}", "tableId": child_table_id }
					export_btn = {"label": "导出", "type": "button", "actionType": "dialog",
								  "dialog": {"title": "", "size": "lg","actions":[],
											 "body": {
												 "type": "form",
												 "mode":"normal",
												 "title": "导出",
												 "actions": [],
												 "submitText":'',
												 "body": [
													 {
														 "name": "downLoadType",
														 "type": "select",
														 "label": "导出方式",
														 "autoComplete": "post:/imc/queryDict?code=attachmentExportType&q=$term|" + child_table_id,
														 "placeholder": "请选择导出方式"
													 },
											 {
												 "label": "下载",
												 "type": "action",
												 "actionType": "download",
												 "icon": "fa fa-download",
												 "api": {
														 "method": "post",
														 "url": "/imc/export",
													 "dataType": "form",
														 "data": {"data": json.dumps(param), 'filterRules': json.dumps(column_filterRules, ensure_ascii=False)}
													 }
											 }
												 ]
											 }}}
					if child_sub_exportBtnPosition == 'top':
						headerToolbar_dir.append(export_btn)
					elif child_sub_exportBtnPosition == 'optColumn':
						crud_opt_column_dir['buttons'].append(export_btn)
				# 批量删除按钮(暂时先不考虑)
				# headerToolbar_dir.append('bulkActions')
				# bulkActions = []
				# del_btn_dir = {'label': '删除', 'type': 'button', 'level': 'danger', 'actionType': 'ajax', 'api': '', "confirmText": "确定要删除?"}
				# bulkActions.append(del_btn_dir)
				# crud_dir['bulkActions'] = bulkActions
				# 复制记录
				if child_table_copytable:
					# crud操作列 button对象
					crud_opt_column_edit_btn_dir = {'label': '复制', 'type': 'button', 'level': 'light', 'actionType': child_insert_action_type}
					# crud操作列 button点击后弹出的drawer对象
					edit_drawer = {'title': '创建记录', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"submit","label":"保存","level":"primary"}]}
					# crud操作列 button点击后弹出的drawer对象对应的body
					edit_drawer_form = {'type': 'form', 'columnCount':child_sub_columnCount,'id': 'add_form' + child_table_id}
					# crud操作列 button点击后弹出的drawer对象对应的body 修改数据的api
					edit_drawer_form_api = {'method': 'post', 'url': '/imc/insert','dataType': 'json', 'data': {'req': child_table_req,'data': json.dumps(add_data_dir_original,ensure_ascii=False)}}
					# crud操作列 button点击后弹出的drawer对象对应的body对应form的body
					edit_drawer_form_body = update_form_list
					edit_drawer_form['api'] = edit_drawer_form_api
					edit_drawer_form['body'] = edit_drawer_form_body
					edit_drawer['size'] = "xl"
					edit_drawer['body'] = edit_drawer_form
					crud_opt_column_edit_btn_dir[child_insert_action_type] = edit_drawer
					crud_opt_column_dir['buttons'].append(crud_opt_column_edit_btn_dir)
				# 附件按钮
				if child_sub_uploadAttachments:
					filterRules = []
					attachment_filterRules = []
					filterRules.append({"field": "table_id", "op": "equal", "value": "${" + child_table_id + "}"})
					if child_sub_uploadBtnPosition == 'top':
						filterRules.append({"field": "row_id", "op": "equal", "value": "-1"})
					elif child_sub_uploadBtnPosition == 'optColumn':
						filterRules.append({"field": "row_id", "op": "equal", "value": "${ID}"})
					filterRules.append({"field": "uploadType", "op": "equal", "value": "${uploadType}"})
					attachment_filterRules.append({"field": "uuid", "op": "equal", "value": "${uuid}"})
					upload_attachments_btn = {"label": "附件", "type": "button", "actionType": "dialog",
											  "dialog": {"title": "", "size": "lg",
														 "body": {"type": "form", "body": [{
															 "type": "tabs",
															 "tabs": [
																 {
																	 "title": "附件上传",
																	 "tab": {
																		 "type": "form",
																		 "title": "",
																		 "actions": [],
																		 "body": [
																			 {
																				 "name": "uploadType",
																				 "type": "select",
																				 "label": "附件上传方式",
																				 "autoComplete": "post:/imc/queryDict?code=attachmentUploadType&q=$term|" + child_table_id,
																				 "placeholder": "请选择附件上传方式"
																			 }, {
																				 "type": "input-file",
																				 "name": "file", "label": "附件上传",
																				 "drag": True,
																				 "useChunk": False,
																				 "receiver": {
																					 'url': '/imc/uploadAttachments',
																					 'method': 'post',
																					 'dataType': 'form-data',
																					 'data': {'req': '', 'page': '',
																							  'rows': '',
																							  'sort': '',
																							  'order': '',
																							  'pid': '',
																							  'filterRules': json.dumps(
																								  filterRules,
																								  ensure_ascii=False)}}}
																		 ]
																	 }
																 }, {
																	 "title": "附件展示",
																	 "tab": {
																		 "type": "crud",
																		 "api": {'method': 'post',
																				 'url': '/imc/getAttachments',
																				 "dataType": "form",
																				 'data': {'req': '',
																						  'page': '${page}',
																						  'rows': '${perPage}',
																						  'sort': '',
																						  'order': '', 'pid': '',
																						  'filterRules': json.dumps(
																							  filterRules,
																							  ensure_ascii=False)}},
																		 "syncLocation": False,
																		 "headerToolbar": ["reload"],
																		 "columns": [
																			 {
																				 "name": "fileName",
																				 "label": "名称"
																			 },
																			 {
																				 "name": "uploadPerson",
																				 "label": "上传人"
																			 },
																			 {
																				 "name": "download",
																				 "label": "下载",
																				 "type": "tpl",
																				 "tpl": "<a href='${download}' target='view_window'>下载</a>"
																			 },
																			 {
																				 "type": "operation",
																				 "label": "操作",
																				 "buttons": [
																					 {
																						 "label": "删除",
																						 "type": "button",
																						 "actionType": "ajax",
																						 "level": "danger",
																						 "confirmText": "确认要删除?",
																						 "api": {'method': 'post',
																								 'url': '/imc/delAttachments',
																								 "dataType": "form",
																								 'data': {'req': '',
																										  'page': '',
																										  'rows': '',
																										  'sort': '',
																										  'order': '',
																										  'pid': '',
																										  'filterRules': json.dumps(
																											  attachment_filterRules,
																											  ensure_ascii=False)}}
																					 }
																				 ]
																			 }
																		 ]
																	 }
																 }
															 ]
														 }]}}}
					if child_sub_uploadBtnPosition == 'top':
						headerToolbar_dir.append(upload_attachments_btn)
					elif child_sub_uploadBtnPosition == 'optColumn':
						crud_opt_column_dir['buttons'].append(upload_attachments_btn)
				# footerToolbar 底部工作栏
				footerToolbar = ["switch-per-page", {"type": "tpl", "tpl": "共${total}条"}]
				if child_table_pagePosition == 'bottom' or child_table_pagePosition == 'both':
					footerToolbar.append("pagination")
				if child_table_editable:
					# crud操作列 button对象
					crud_opt_column_edit_btn_dir = {'label': '修改', 'type': 'button', 'level': 'info','actionType': child_edit_action_type}
					# crud操作列 button点击后弹出的drawer对象
					edit_drawer = {'title': '数据修改', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"button","actionType":"prev","visibleOn":"data.hasPrev","label":"上一条"},{"type":"button","actionType":"next","visibleOn":"data.hasNext","label":"下一条"},{"type":"submit","actionType":"next","visibleOn":"data.hasNext","label":"保存并下一条","level":"primary"},{"type":"submit","label":"保存","level":"primary"}]}
					# crud操作列 button点击后弹出的drawer对象对应的body
					edit_drawer_form = {'type': 'form', 'columnCount':child_sub_columnCount,'id': 'edit_form' + child_table_id}
					# crud操作列 button点击后弹出的drawer对象对应的body 修改数据的api
					edit_drawer_form_api = {'method': 'post', 'url': '/imc/update', 'dataType': 'json','data': {'req': 'm' + child_table_id + 'Req',"data": json.dumps(update_data_dir, ensure_ascii=False)}}
					# crud操作列 button点击后弹出的drawer对象对应的body对应form的body
					edit_drawer_form_body = update_form_list
					edit_drawer_form['api'] = edit_drawer_form_api
					edit_drawer_form['body'] = edit_drawer_form_body
					edit_drawer['size'] = "xl"
					edit_drawer['body'] = edit_drawer_form
					crud_opt_column_edit_btn_dir[child_edit_action_type] = edit_drawer
					crud_opt_column_dir['buttons'].append(crud_opt_column_edit_btn_dir)

				# 如果存在放在操作列的自定义按钮
				if len(bulk_optCol_list) > 0:
					crud_opt_column_dir['buttons'].extend(bulk_optCol_list)
				if child_table_editable or child_table_insertable or child_sub_uploadAttachments:
					if len(crud_opt_column_dir['buttons']) > 0:
						column_list.append(crud_opt_column_dir)
				crud_dir['checkOnItemClick'] = True
				crud_dir['headerToolbar'] = headerToolbar_dir
				crud_dir['footerToolbar'] = footerToolbar
				crud_dir['columns'] = column_list
				crud_dir['api'] = crud_api_dir
				if bulk_top_list != []:
					crud_dir['headerToolbar'].append("bulkActions")
					crud_dir['bulkActions'] = bulk_top_list

				recursionJson = self.generalCRUDChildJSONStr(child_table_req)
				if recursionJson:
					# crud第一列查看子表信息列
					crud_sub_info_column_dir = {'type': 'operation','width':50, 'label': '', 'buttons': []}
					crud_sub_info_btn_dir = {'icon':'fa fa-list', 'tooltip':'查看明细','type': 'button', 'actionType': child_sub_action_type}
					# 子表在前端展示的tabs组件
					tabs_dir = {'title': '', 'size': 'lg', 'actions': [], 'body': {'type': 'tabs'}}
					tabs_dir['body']['tabs'] = recursionJson
					crud_sub_info_btn_dir[child_sub_action_type] = tabs_dir
					crud_sub_info_column_dir['buttons'].append(crud_sub_info_btn_dir)
					column_list.insert(0, crud_sub_info_btn_dir)
				page_dir['body'] = crud_dir
				# 子表tab
				tab_dir = {'title': child_table_title, "body": page_dir, "size": "xl"}
				tabs_list.append(tab_dir)
			return tabs_list

	def service(self):

		req = self.filterRules[0]['value']
		# 获取表格配置信息
		db = DBROUTE(1)
		# 获取主表的信息
		ID = req.replace("m", "").replace("Req", "")
		sql = "select sortName,sortOrder,pageSize,pagePosition, editable,exportable,insertable,importable,copyable,intervalMillisecond,title,insertActionType,editActionType,subGridActionType,primarykey,columnCount,uploadAttachments,uploadBtnPosition,exportBtnPosition,amisCode, renderType from [Main].[dbo].[tbDataGrid] where ID = " + ID
		param_list = db.ExecQuery(sql)
		# 排序字段
		sort_name = param_list[0][0]
		# 排序顺序
		sort_order = param_list[0][1]
		# 一页显示多少行
		page_size = param_list[0][2]
		# 分页显示的位置 top bottom both
		page_position = param_list[0][3]
		# 是否显示修改按钮
		edit_btn = param_list[0][4]
		# 是否显示导出excel按钮
		export_excel_btn = param_list[0][5]
		# 是否能新增
		insert_btn = param_list[0][6]
		# 是否能导入
		import_btn = param_list[0][7]
		#是否能复制记录
		copy_btn = param_list[0][8]
		# 界面是否轮询 0：不轮询 最低1000毫秒
		intervalMillisecond = param_list[0][9]
		# crud标题
		crud_title = param_list[0][10]
		# 新增按钮弹框的样式 dialog 、 drawer
		insert_action_type = param_list[0][11]
		# 修改按钮弹框的样式 dialog 、 drawer
		edit_action_type = param_list[0][12]
		# 子表弹框的样式 dialog 、 drawer
		child_action_type = param_list[0][13]
		# 主键字段
		primarykey = param_list[0][14]
		# 一行表单项
		columnCount = param_list[0][15]
		uploadAttachments = param_list[0][16]
		# 附件上传按钮的位置 top  optColumn
		uploadBtnPosition = param_list[0][17]
		exportBtnPosition = param_list[0][18]
		amisCode = param_list[0][19]
		renderType = param_list[0][20] if param_list[0][20] else 'crud'
		if amisCode:
			return amisCode
		if renderType == 'crud':
			#自定义按钮
			sql = "SELECT a.[ID],a.[text],isnull(a.confirmText,'') confirmText, a.[position],a.viewSource,a.actiontype FROM [Main].[dbo].[tbDataToolbar] a left outer join [Main].[dbo].[tbDataToolBarDetails] b on a.ID = b.pid  where a.pid = '" + ID + "' and (b.userid = '" + self.userid + "' or b.userid is null) and optType = 'common' order by orderNum asc"
			custom_toolbar_list = db.ExecQuery(sql)
			bulk_top_list = []
			bulk_optCol_list = []
			sql = "select  field,title,hidden,searchable,width, align, sortable,editor,code,copyable,isnull(fixed,'') fixed,editorExtra,searchExtra,columnExtra  FROM [Main].[dbo].[tbDataGridDetails] where pid in (select ID from [Main].[dbo].[tbDataGrid] where gridNo='" + req + "' )  and isnull(field,'')!='' order by orderNum asc"
			col_list = db.ExecQuery(sql)

			# 存放crud的列信息(隐藏ID列)
			column_list = []
			add_data_dir = {}
			add_form_list = []

			# 用于快速查询
			column_filterRules = []
			for col in col_list:
				col_field = col[0]
				col_title = col[1]
				col_hidden = col[2]
				col_searchable = col[3]
				col_align = col[5]
				col_width = int(col[4])
				col_sortable = col[6]
				# 组件类型
				col_editor = col[7] if col[7] else ''
				# 下拉框数据字典代码
				col_code = col[8] if col[8] else ''
				col_copyable = col[9]
				col_fixed = col[10]
				col_editorExtra = json.loads(col[11])
				col_searchExtra = col[12]
				col_columnExtra = json.loads(col[13])
				if col_editor.find('textbox') > -1 or col_editor.find('textarea') > -1:
					col_editor = 'textarea'
				elif col_editor.find('combobox') > -1:
					col_editor = 'select'
				elif col_editor.find('datetimebox') > -1:
					col_editor = 'input-datetime'
				elif col_editor.find('date') > -1:
					col_editor = 'input-date'
				elif col_editor == 'text':
					col_editor = 'input-text'
				elif col_editor.find('number') > -1:
					col_editor = 'input-number'
				elif col_editor.find('input-rich-text') > -1:
					col_editor = 'input-rich-text'
				elif col_editor.find('json-scheme') > -1:
					col_editor = 'json-scheme'
				elif col_editor.find('tree-select') > -1:
					col_editor = 'tree-select'
				elif col_editor.find('static') > -1:
					col_editor = 'static'
				if not col_hidden:
					col_dir = {'name': col_field, 'label': col_title, 'width': col_width,'align': col_align}
					if col_searchable:
						column_filterRules.append({"field": col_field, "op": "contains", "value": "${" + col_field + "}"})
					if col_searchable:
						if col_searchExtra!='':
							col_dir['searchable'] = json.loads(col_searchExtra)
						else:
							col_dir['searchable'] = {"name": col_field, "label": col_title, "type": "input-text"}
					col_dir['sortable'] = col_sortable
					col_dir['copyable'] = col_copyable
					col_dir['fixed'] = col_fixed
					col_dir = dict(col_dir, **col_columnExtra)
					column_list.append(col_dir)

				if (insert_btn or edit_btn) and col_editor != '' and col_field.upper() != primarykey:
					add_data_dir[col_field] = '${' + col_field + '}'
					add_form_temp_dir = {'name': col_field, 'label': col_title, "type": col_editor}
					add_form_temp_dir = dict(add_form_temp_dir, **col_editorExtra)
					add_form_list.append(add_form_temp_dir)

			update_data_dir = dict(add_data_dir)
			update_form_list = list(add_form_list)
			update_data_dir[primarykey] = '${' + primarykey + '}'
			for bulk in custom_toolbar_list:
				bulk_id = bulk[0]
				bulk_text = bulk[1]
				bulk_confirmtext = bulk[2]
				bulk_position = bulk[3]
				bulk_viewSource = bulk[4]
				bulk_actionType = bulk[5]
				if bulk_position == 'top':
					if bulk_actionType == 'ajax':
						t_body = json.loads(bulk_viewSource) if bulk_viewSource else "${body}"
						bulk_top_list.append({"label": bulk_text, "actionType": "ajax", "api": {"method": "post", "url": "/imc/customOpt","data": {"req":bulk_id,"data": "${rows|json}"}},"confirmText":bulk_confirmtext,"feedback":{"visibleOn":"(this.visibleOn)","title":"${title}","body":t_body,"actions":[]}})
					elif bulk_actionType == 'dialog':
						dialog_dir = {"label": bulk_text, "actionType": "dialog"}
						dialog_dir['dialog'] = bulk_viewSource
						bulk_top_list.append(dialog_dir)
				else:
					if bulk_actionType == 'ajax':
						t_body = json.loads(bulk_viewSource) if bulk_viewSource else "${body}"
						bulk_optCol_list.append({"label": bulk_text, "actionType": "ajax",
												 "api": {"method": "post", "url": "/imc/customOpt",
														 "data": {"req": bulk_id, "data": json.dumps(update_data_dir)}},
												 "confirmText": bulk_confirmtext,"feedback":{"visibleOn":"(this.visibleOn)","title":"${title}","body":t_body,"actions":[]}})
					elif bulk_actionType == 'dialog':
						dialog_dir = {"label": bulk_text, "actionType": "dialog"}
						dialog_dir['dialog'] = bulk_viewSource
						bulk_optCol_list.append(dialog_dir)

			# 最外层page层
			big_page_dir = {'type': 'page', 'title': crud_title, 'body': []}
			# page中body对应的crud对象
			crud_dir = {'type': 'crud', 'id': 'big_crud', 'className': 'm-b-none','syncLocation': False,"autoGenerateFilter": True,"autoFillHeight": True}
			# crud_dir['actions'] = [{
			#   "label": "测试按钮",
			#   "type": "button",
			#   "onClick": "props.formStore.setValues({engine: 'amis', keywords: 'amis@baidu.com'});"
			# }]
			if intervalMillisecond > 0:
				crud_dir["interval"] = intervalMillisecond
				crud_dir["silentPolling"] = True
			# crud请求界面数据Api
			crud_api_data_dir = {'req': req, 'page': '${page}', 'rows': '${perPage}', 'sort': '${orderBy}','order': '${orderDir}','pid': '', 'filterRules': json.dumps(column_filterRules, ensure_ascii=False)}
			crud_api_dir = {'method': 'post', 'url': '/imc/queryData', "dataType": "form", 'data': crud_api_data_dir}
			# 默认参数
			big_crud_defaultparams = {'perPage': str(page_size), 'orderBy': sort_name, 'orderDir': sort_order}
			crud_dir['defaultParams'] = big_crud_defaultparams
			# 分页数组自定义
			crud_dir['perPageAvailable'] = [10, 20, 50, 100, 500, 10000]
			# 顶部工具栏
			headerToolbar_dir = []
			# 开发管理群组 显示界面配置按钮
			if self.developer == True:
				headerToolbar_dir.append({"icon": "fa fa-list-ol", "type": "button", "tooltip": "后台日志", "onClick":"window.open('/imc/index/amis?p=m16Req&title=后台日志查看&功能代号="+req+"','_blank')"})
				headerToolbar_dir.append({"icon":"fa fa-codepen", "type": "button","tooltip":"配置界面", "onClick":"window.open('/imc/index/amis?p=m3Req&title="+urllib.parse.quote(crud_title+"【配置】")+"&ID="+ID+"','_blank')"})
				headerToolbar_dir.append({"icon": "fa fa-spinner", "type": "button", "tooltip": "重载界面", "onClick": "location.reload();"})
			#列显示、列排序按钮
			headerToolbar_dir.append({"type": "columns-toggler","align": "right","draggable": True,"icon": "fas fa-cog","overlay": True,"footerBtnSize": "sm"})
			if page_position == 'top' or page_position == 'both':
				headerToolbar_dir.append("pagination")
			headerToolbar_dir.append('reload')
			# 创建记录
			if insert_btn:
				# 顶部操作->新增按钮codepen
				add_btn_dir = {'label': '创建记录', 'type': 'button', 'level': 'primary', 'actionType': insert_action_type}
				# 顶部操作->新增按钮->抽屉
				add_btn_drawer_dir = {'title': '创建记录', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"submit","label":"保存","level":"primary"}]}
				# 顶部操作->新增按钮->抽屉->body对应的form对象
				add_btn_drawer_form_api_dir = {'method': 'post', 'url': '/imc/insert','dataType': 'json', 'data': {'req': req,'data': json.dumps(add_data_dir,ensure_ascii=False)}}
				add_btn_drawer_form_dir = {'type': 'form','columnCount':columnCount, 'id': 'add_form', 'api': add_btn_drawer_form_api_dir}
				# 顶部操作->新增按钮->抽屉->body对应的form对象->form的body对应的列信息
				add_btn_drawer_form_body_dir = add_form_list

				add_btn_drawer_form_dir['body'] = add_btn_drawer_form_body_dir
				add_btn_drawer_dir['size'] = "xl"
				add_btn_drawer_dir['body'] = add_btn_drawer_form_dir
				add_btn_dir[insert_action_type] = add_btn_drawer_dir
				headerToolbar_dir.append(add_btn_dir)

			# crud的操作列
			crud_opt_column_dir = {'type': 'operation', 'label': '操作', 'width':100,'fixed': 'right', 'buttons': []}
			# 复制记录
			if copy_btn:
				# crud操作列 button对象
				crud_opt_column_edit_btn_dir = {'label': '复制', 'type': 'button', 'level': 'light','actionType': insert_action_type}
				# crud操作列 button点击后弹出的drawer对象
				edit_drawer = {'title': '创建记录', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"submit","label":"保存","level":"primary"}]}
				# crud操作列 button点击后弹出的drawer对象对应的body
				edit_drawer_form = {'type': 'form','columnCount':columnCount, 'id': 'edit_form'}
				# crud操作列 button点击后弹出的drawer对象对应的body 修改数据的api
				edit_drawer_form_api = {'method': 'post', 'url': '/imc/insert','dataType': 'json', 'data': {'req': req,'data': json.dumps(add_data_dir,ensure_ascii=False)}}
				# crud操作列 button点击后弹出的drawer对象对应的body对应form的body
				edit_drawer_form_body = update_form_list

				edit_drawer_form['api'] = edit_drawer_form_api
				edit_drawer_form['body'] = edit_drawer_form_body
				edit_drawer['size'] = "xl"
				edit_drawer['body'] = edit_drawer_form
				crud_opt_column_edit_btn_dir[insert_action_type] = edit_drawer
				crud_opt_column_dir['buttons'].append(crud_opt_column_edit_btn_dir)

			# 导出Excel
			if export_excel_btn:
				param = {}
				if exportBtnPosition == 'top':
					param = {"downLoadTypeID": "${downLoadType}", "tableId": ID}
				elif exportBtnPosition == 'optColumn':
					param = {"downLoadTypeID": "${downLoadType}", "rowId": "${ID}", "tableId": ID}
				export_btn = {"label": "导出", "type": "button", "actionType": "dialog",
							  "dialog": {"title": "", "size": "lg","actions":[],
										 "body": {
											 "type": "form",
											 "title": "导出",
											 "actions": [],
											 'submitText':'',
											 "mode": "normal",
											 "body": [
												 {
													 "name": "downLoadType",
													 "type": "select",
													 "label": "导出方式",
													 "autoComplete": "post:/imc/queryDict?code=attachmentExportType&q=$term|" + ID,
													 "placeholder": "请选择导出方式"
												 },
												 {
													 "label": "下载",
													 "type": "action",
													 "actionType": "download",
													 "icon": "fa fa-download",
													 "api": {
															 "method": "post",
															 "url": "/imc/export",
															"dataType":"form",
															 "data": {"data": json.dumps(param),'filterRules': json.dumps(column_filterRules, ensure_ascii=False)}
														 }
												 }
											 ]
										 }}}
				if exportBtnPosition == 'top':
					headerToolbar_dir.append(export_btn)
				elif exportBtnPosition == 'optColumn':
					crud_opt_column_dir['buttons'].append(export_btn)
			# 批量删除按钮(暂时先不考虑)
			# headerToolbar_dir.append('bulkActions')
			# bulkActions = []
			# del_btn_dir = {'label': '删除', 'type': 'button', 'level': 'danger', 'actionType': 'ajax', 'api': '', "confirmText": "确定要删除?"}
			# bulkActions.append(del_btn_dir)
			# crud_dir['bulkActions'] = bulkActions

			# footerToolbar 底部工作栏
			footerToolbar = ["switch-per-page", {"type": "tpl", "tpl": "共${total}条"}]
			if page_position == 'both' or page_position == 'bottom':
				footerToolbar.append("pagination")
			# crud的列
			if edit_btn:
				# crud操作列 button对象
				crud_opt_column_edit_btn_dir = {'label': '修改', 'type': 'button','level':'info','actionType': edit_action_type}
				# crud操作列 button点击后弹出的drawer对象
				edit_drawer = {'title': '数据修改', 'resizable': True,"actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"},{"type":"button","actionType":"prev","visibleOn":"data.hasPrev","label":"上一条"},{"type":"button","actionType":"next","visibleOn":"data.hasNext","label":"下一条"},{"type":"submit","actionType":"next","visibleOn":"data.hasNext","label":"保存并下一条","level":"primary"},{"type":"submit","label":"保存","level":"primary"}]}
				# crud操作列 button点击后弹出的drawer对象对应的body
				edit_drawer_form = {'type': 'form','columnCount':columnCount, 'id': 'edit_form'}
				# crud操作列 button点击后弹出的drawer对象对应的body 修改数据的api
				edit_drawer_form_api = {'method': 'post', 'url': '/imc/update', 'dataType': 'json','data': {'req': req, "data": json.dumps(update_data_dir, ensure_ascii=False)}}
				# crud操作列 button点击后弹出的drawer对象对应的body对应form的body
				edit_drawer_form_body = update_form_list

				edit_drawer_form['api'] = edit_drawer_form_api
				edit_drawer_form['body'] = edit_drawer_form_body
				edit_drawer['size'] = "xl"
				edit_drawer['body'] = edit_drawer_form
				crud_opt_column_edit_btn_dir[edit_action_type] = edit_drawer
				crud_opt_column_dir['buttons'].append(crud_opt_column_edit_btn_dir)
			# 附件按钮
			if uploadAttachments:
				filterRules = []
				attachment_filterRules = []
				filterRules.append({"field": "table_id", "op": "equal", "value": "${" + ID + "}"})
				if uploadBtnPosition == 'top':
					filterRules.append({"field": "row_id", "op": "equal", "value": "-1"})
				elif uploadBtnPosition == 'optColumn':
					filterRules.append({"field": "row_id", "op": "equal", "value": "${ID}"})
				filterRules.append({"field": "uploadType", "op": "equal", "value": "${uploadType}"})
				attachment_filterRules.append({"field": "uuid", "op": "equal", "value": "${uuid}"})
				upload_attachments_btn = {"label": "附件", "type": "button", "actionType": "dialog",
										  "dialog": {"title": "", "size": "lg", "body": {"type": "form", "body": [{
											"type": "tabs",
											"tabs": [
											  {
												"title": "附件上传",
												"tab": {
													"type": "form",
													"title": "",
													"actions": [],
													"body": [
													  {
														"name": "uploadType",
														"type": "select",
														"label": "附件上传方式",
														"autoComplete": "post:/imc/queryDict?code=attachmentUploadType&q=$term|"+ID,
														"placeholder": "请选择附件上传方式"
													  },{
														"type": "input-file", "name": "file", "label": "附件上传",
														"drag": True,
														"useChunk": False,
														"receiver": {'url': '/imc/uploadAttachments', 'method': 'post',
																	 'dataType': 'form-data',
																	 'data': {'req': '', 'page': '', 'rows': '',
																			  'sort': '',
																			  'order': '', 'pid': '',
																			  'filterRules': json.dumps(filterRules,
																										ensure_ascii=False)}}}
													]
												  }
																		  },{
																			"title": "附件展示",
																			"tab": {
																					"type": "crud",
																					"api": {'method': 'post', 'url': '/imc/getAttachments', "dataType": "form", 'data': {'req': '', 'page': '${page}', 'rows': '${perPage}', 'sort': '',
																							'order': '', 'pid': '',
																							'filterRules': json.dumps(filterRules,
																								   ensure_ascii=False)}},
																					"syncLocation": False,
																					"headerToolbar":["reload"],
																					"columns": [
																						{
																							"name": "fileName",
																							"label": "名称"
																						},
																						{
																							"name": "uploadPerson",
																							"label": "上传人"
																						},
																						{
																							"name": "download",
																							"label": "下载",
																							"type": "html"
																						},
																					  {
																						"type": "operation",
																						"label": "操作",
																						"buttons": [
																						  {
																							"label": "删除",
																							"type": "button",
																							"actionType": "ajax",
																							"level": "danger",
																							"confirmText": "确认要删除?",
																							"api": {'method': 'post', 'url': '/imc/delAttachments', "dataType": "form", 'data': {'req': '', 'page': '', 'rows': '', 'sort': '',
																							'order': '', 'pid': '',
																							'filterRules': json.dumps(attachment_filterRules,
																								   ensure_ascii=False)}}
																						  }
																						]
																					  }
																					]
																				  }
																		  }
																		]
																  }]}}}
				if uploadBtnPosition == 'top':
					headerToolbar_dir.append(upload_attachments_btn)
				elif uploadBtnPosition == 'optColumn':
					crud_opt_column_dir['buttons'].append(upload_attachments_btn)
			if len(bulk_optCol_list) > 0:
				crud_opt_column_dir['buttons'].extend(bulk_optCol_list)
			if edit_btn or insert_btn or uploadBtnPosition:
				if len(crud_opt_column_dir['buttons']) > 0:
					column_list.append(crud_opt_column_dir)
			crud_dir['checkOnItemClick'] = True
			crud_dir['headerToolbar'] = headerToolbar_dir
			crud_dir['footerToolbar'] = footerToolbar
			crud_dir['columns'] = column_list
			crud_dir['api'] = crud_api_dir
			if bulk_top_list != []:
				crud_dir['headerToolbar'].append("bulkActions")
				crud_dir['bulkActions'] = bulk_top_list

			big_page_dir['body'].append(crud_dir)

			# 获取子表信息
			child_table_sql = "select ID,title,pageSize,sortOrder,sortName,pagePosition, editable,exportable,insertable,importable,intervalMillisecond,title,insertActionType,editActionType,subGridActionType from [Main].[dbo].[tbDataGrid] where pid = '" + req.replace('m', '').replace('Req', '') + "'"
			child_table_ID_list = db.ExecQuery(child_table_sql)
			if len(child_table_ID_list) > 0:
				# crud第一列查看子表信息列
				crud_sub_info_column_dir = {'type': 'operation','width':50, 'label': '','fixed':'left', 'buttons': []}
				crud_sub_info_btn_dir = {'icon':'fa fa-list', 'tooltip':'查看明细','type': 'button', 'actionType': child_action_type}

				# 子表在前端展示的tabs组件
				tabs_dir = {'type': 'tabs'}
				tabs_dir['tabs'] = self.generalCRUDChildJSONStr(req)

				crud_sub_info_btn_dir[child_action_type] = {'title': '', 'resizable': True, 'size': 'full', "actions":[{"type":"button","actionType":"cancel","level":"light","label":"关闭"}],'body': tabs_dir}
				crud_sub_info_column_dir['buttons'].append(crud_sub_info_btn_dir)
				column_list.insert(0, crud_sub_info_column_dir)

			#print(json.dumps(big_page_dir, ensure_ascii=False))
			return json.dumps(big_page_dir, ensure_ascii=False)
		if renderType == 'inputTable':
			req = self.filterRules[0]['value']
			# 获取表格配置信息
			db = DBROUTE(1)
			# 获取主表的信息
			ID = req.replace("m", "").replace("Req", "")
			sql = "select sortName,sortOrder,pageSize,pagePosition, editable,exportable,insertable,importable,copyable,intervalMillisecond,title,insertActionType,editActionType,subGridActionType,primarykey,columnCount,uploadAttachments,uploadBtnPosition,exportBtnPosition,amisCode from [Main].[dbo].[tbDataGrid] where ID = " + ID
			param_list = db.ExecQuery(sql)
			# 一页显示多少行
			page_size = param_list[0][2]
			# 是否显示修改按钮
			edit_btn = param_list[0][4]
			# 是否能新增
			insert_btn = param_list[0][6]
			# 主键字段
			primarykey = param_list[0][14]
			amisCode = param_list[0][19]
			if amisCode:
				return amisCode

			sql = "select  field,title,hidden,searchable,width, align, sortable,editor,code,copyable,isnull(fixed,'') fixed,editorExtra,searchExtra,columnExtra  FROM [Main].[dbo].[tbDataGridDetails] where pid in (select ID from [Main].[dbo].[tbDataGrid] where gridNo='" + req + "' )  and isnull(field,'')!='' order by orderNum asc"
			col_list = db.ExecQuery(sql)

			# 存放input-table的列信息(隐藏ID列)
			column_list = []
			add_data_dir = {}

			# 用于快速查询
			column_filterRules = []
			for col in col_list:
				col_field = col[0]
				col_title = col[1]
				col_hidden = col[2]
				col_searchable = col[3]
				col_align = col[5]
				col_width = int(col[4])
				col_sortable = col[6]
				# 组件类型
				col_editor = col[7] if col[7] else ''
				# 下拉框数据字典代码
				col_code = col[8] if col[8] else ''
				col_copyable = col[9]
				col_fixed = col[10]
				col_editorExtra = json.loads(col[11])
				col_searchExtra = col[12]
				col_columnExtra = json.loads(col[13])
				if col_editor.find('textbox') > -1 or col_editor.find('textarea') > -1:
					col_editor = 'textarea'
				elif col_editor.find('combobox') > -1:
					col_editor = 'select'
				elif col_editor.find('datetimebox') > -1:
					col_editor = 'input-datetime'
				elif col_editor.find('date') > -1:
					col_editor = 'input-date'
				elif col_editor == 'text':
					col_editor = 'input-text'
				elif col_editor.find('number') > -1:
					col_editor = 'input-number'
				elif col_editor.find('input-rich-text') > -1:
					col_editor = 'input-rich-text'
				elif col_editor.find('json-scheme') > -1:
					col_editor = 'json-scheme'
				elif col_editor.find('tree-select') > -1:
					col_editor = 'tree-select'
				elif col_editor.find('static') > -1:
					col_editor = 'static'
				elif col_editor.find('static-tpl') > -1:
					col_editor = 'static-tpl'
				if not col_hidden:
					col_dir = {'name': col_field, 'label': col_title, 'width': col_width, 'align': col_align}
					if col_searchable:
						column_filterRules.append(
							{"field": col_field, "op": "contains", "value": "${" + col_field + "}"})
					if col_searchable:
						if col_searchExtra != '':
							col_dir['searchable'] = json.loads(col_searchExtra)
						else:
							col_dir['searchable'] = {"name": col_field, "label": col_title, "type": "input-text"}
					col_dir['sortable'] = col_sortable
					col_dir['copyable'] = col_copyable
					col_dir['fixed'] = col_fixed
					if (insert_btn or edit_btn) and col_editor != '' and col_field.upper() != primarykey:
						col_dir['quickEdit'] = dict({
							"type": col_editor
						}, **col_editorExtra)
					col_dir = dict(col_dir, **col_columnExtra)
					column_list.append(col_dir)

				if (insert_btn or edit_btn) and col_editor != '' and col_field.upper() != primarykey:
					add_data_dir[col_field] = '${' + col_field + '}'

			update_data_dir = dict(add_data_dir)
			update_data_dir[primarykey] = '${' + primarykey + '}'
			# mainInputTable请求界面数据Api
			mainInputTableQueryDataApiDict = {'req': req, 'page': '1', 'rows': '1000000', 'sort': '',
											  'order': '', 'pid': '',
											  'filterRules': json.dumps(column_filterRules, ensure_ascii=False)}
			mainInputTableQueryDataApi = {'method': 'post', 'url': '/imc/queryData', "dataType": "form",
										  'data': mainInputTableQueryDataApiDict}
			# mainInputTable新增数据
			mainInputTableInsertDataApi = {'method': 'post', 'url': '/imc/insert', 'dataType': 'json',
										   'data': {'req': req, 'data': json.dumps(add_data_dir, ensure_ascii=False)}}
			mainInputTableEditDataApi = {'method': 'post', 'url': '/imc/update', 'dataType': 'json',
										 'data': {'req': req, "data": json.dumps(update_data_dir, ensure_ascii=False)}}
			containerList = []

			# 获取子表信息
			child_table_sql = "select ID,title,pageSize,sortOrder,sortName,pagePosition, editable,exportable,insertable,importable,intervalMillisecond,title,insertActionType,editActionType,subGridActionType from [Main].[dbo].[tbDataGrid] where pid = '" + req.replace(
				'm', '').replace('Req', '') + "'"
			child_table_ID_list = db.ExecQuery(child_table_sql)
			mainInputTalbleAction = []
			mainInputTalble = {
				"type": "service",
				"id": "inputTableService",
				"api": mainInputTableQueryDataApi,
				"body": [{
					"label": "刷新",
					"type": "button",
					"onEvent": {
					  "click": {
						"actions": [
						  {
							"actionType": "reload",
							"componentId": "inputTableService"
						  }
						]
					  }
					}
				},{
					"type": "input-table",
					"headerToolbar": ['reload'],
					"name": "rows",
					"addable": insert_btn,
					"editable": edit_btn,
					"removable": False,
					"columns": column_list,
					"showTableAddBtn": True,
					"showFooterAddBtn": True,
					"addApi": mainInputTableInsertDataApi,
					"updateApi": mainInputTableEditDataApi,
					"deleteApi": {},
					"perPage": page_size,
					"onEvent": {
						"rowClick": {
							"actions": mainInputTalbleAction
						},
						"addSuccess": {
							"actions": [
								{
									"actionType": "toast",
									"args": {
										"msgType": "success",
										"title": "",
										"msg": "新增数据成功!"
									}
								},
								{
									"actionType": "reload",
									"componentId": "inputTableService"
								}
							]
						},
						"editSuccess": {
							"actions": [
								{
									"actionType": "toast",
									"args": {
										"msgType": "success",
										"title": "",
										"msg": "修改数据成功!"
									}
								},
								{
									"actionType": "reload",
									"componentId": "inputTableService"
								}
							]
						},
						"addFail": {
							"actions": [
								{
									"actionType": "toast",
									"args": {
										"msgType": "error",
										"title": "",
										"msg": "新增数据失败!"
									}
								}
							]
						},
						"editFail": {
							"actions": [
								{
									"actionType": "toast",
									"args": {
										"msgType": "error",
										"title": "",
										"msg": "修改数据失败!"
									}
								}
							]
						}
					}

				}]
			}

			containerList.append(mainInputTalble)
			if len(child_table_ID_list) > 0:
				# 子表在前端展示的tabs组件
				result = self.generalInputTableChildJSONStr(req)
				collapseActions = []

				id_list = result['id_list']
				collapse_list = result['collapse_list']
				for id in id_list:
					collapseActions.append({
						"componentId": id,
						"groupType": "component",
						"actionType": "reload"
					})
					mainInputTalbleAction.append({
						"componentId": id,
						"actionType": "setValue",
						"args": {
							"value": {"currentPID": "${event.data.rowItem.ID}"},
						}
					})
					mainInputTalbleAction.append({
						"componentId": id,
						"groupType": "component",
						"actionType": "reload"
					})
				collapse_group_dir = {
					'type': 'collapse-group',
					'accordion': True,
					'body': collapse_list,
					"onEvent": {
						"change": {
							"weight": 0,
							"actions": collapseActions
						}
					}
				}

				containerList.append(collapse_group_dir)

			flex = {
				"type": "flex",
				"items": [{
					"type": "container",
					"data": {
						"ID": "-1"
					},
					"body": containerList
				}]
			}

			# print(json.dumps(big_page_dir, ensure_ascii=False))
			return json.dumps(flex, ensure_ascii=False)