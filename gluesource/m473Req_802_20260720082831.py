import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd


class Servlet:
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.action = self.json_obj.get('action', 'query')
        self.db = DBROUTE(24)  # Oracle: IMES_PES2
        self.table = 'IMES_PES2.T_SH_ZBS_FHTZTP'

    def service(self):
        try:
            if self.action == 'query':
                return self._query()
            elif self.action == 'insert':
                return self._insert()
            elif self.action == 'update':
                return self._update()
            elif self.action == 'delete':
                return self._delete()
            elif self.action == 'audit':
                return self._audit()
            elif self.action == 'getUserInfo':
                return self._get_user_info()
            elif self.action == 'checkPermission':
                return self._check_permission()
            elif self.action == 'batchDelete':
                return self._batch_delete()
            elif self.action == 'batchAudit':
                return self._batch_audit()
            else:
                return {"status": 1, "msg": "未知操作: " + self.action, "data": []}
        except Exception as e:
            return {"status": 1, "msg": "系统异常: " + str(e), "data": []}

    # ==================== 查询 ====================
    def _query(self):
        keyword = self.json_obj.get('keyword', '')
        sort_field = self.json_obj.get('sortField', '发货通知单号')
        sort_dir = self.json_obj.get('sortDirection', 'asc')
        page = self.json_obj.get('page', '')

        # 动态获取表的所有列名（新增字段无需修改此处）
        cols = self._get_table_columns()

        sql = 'SELECT ' + ','.join(['"' + c + '"' for c in cols]) + ' FROM ' + self.table
        where_clauses = []

        # 台账填报页：只返回当前用户填报的记录
        if page == 'index':
            userid = str(getUserid(getSessionidd()))
            # 操作人格式为 "工资编号-姓名"，用 LIKE 前缀匹配
            where_clauses.append('"操作人" LIKE \'' + userid + '%\'')

        if keyword:
            kw = keyword.replace("'", "''")
            where_clauses.append(
                '("发货通知单号" LIKE \'%' + kw + '%\' OR "合同号" LIKE \'%' + kw +
                '%\' OR "车号" LIKE \'%' + kw + '%\' OR "规格" LIKE \'%' + kw +
                '%\' OR "收货单位" LIKE \'%' + kw + '%\')'
            )

        if where_clauses:
            sql += ' WHERE ' + ' AND '.join(where_clauses)

        # 排序
        sort_dir_sql = 'ASC' if sort_dir.lower() == 'asc' else 'DESC'
        sql += ' ORDER BY "' + sort_field + '" ' + sort_dir_sql

        raw_rows = self.db.ExecQuery(sql)

        result_list = []
        for row in raw_rows:
            d = {}
            for i, c in enumerate(cols):
                val = row[i]
                if isinstance(val, str):
                    d[c] = val
                elif val is None:
                    d[c] = ''
                else:
                           d[c] = str(val)
            result_list.append(d)

        return {"status": 0, "msg": "查询成功", "data": result_list}

    def _get_table_columns(self):
        """动态获取 Oracle 表的所有列名"""
        try:
            schema, table = self.table.split('.')
            sql = ("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS "
                   "WHERE OWNER = '" + schema + "' AND TABLE_NAME = '" + table + "' "
                   "ORDER BY COLUMN_ID")
            rows = self.db.ExecQuery(sql)
            return [r[0] for r in rows]
        except Exception:
            # 回退到硬编码列表（兼容旧环境）
            return [
                '发货通知单号', '批号', '定尺', '规格', '产品名称1', '牌号', '许可证号',
                '执行标准', '发货状态', '审核状态', '合同号', '收货单位', '日期', '请发日期', '车号',
                '各支理重', '各支实重', '各支件数', '重量', '支数', '件数', '炉号',
                '屈服强度', '抗拉强度', '强屈比', '断后伸长率', '最大应力下的总伸长率',
                '超强比', '冷弯180度', '反弯', '冲击功1', '冲击功2', '冲击功3',
                '冲击功平均值', '冲击功', '米重', '实物标记', '弯曲类型', 'D类型',
                '试验温度', '技术规范', 'C', 'MN', 'P', 'S', 'SI', 'CU', 'NI', 'CR',
                'MO', 'V', 'B', 'CEQ', 'CMN6', 'CE', 'N', 'ALT', 'TI', 'NB', 'ALS',
                '总重量', '总件数', '断面收缩率', '试样尺寸', '下屈服强度',
                '操作人', '操作时间', '更新时间', '审核人', '审核时间'
            ]

    # ==================== 新增 ====================
    def _insert(self):
        data = self.json_obj.get('data', {})
        if not data:
            return {"status": 1, "msg": "数据为空", "data": []}

        # 获取当前操作人员姓名
        userid = str(getUserid(getSessionidd()))
        main_db = DBROUTE(31)
        user_name = userid  # 默认用 userid
        try:
            sql_name = "SELECT 工资编号+'-'+ISNULL(JEI.姓名,'测试') 姓名" + " FROM [精益办].dbo.JYB_EmployeeInfo JEI WHERE 工资编号= '" + userid + "'"
            records_name = main_db.ExecQuery(sql_name)
            if records_name and records_name[0][0]:
                user_name = str(records_name[0][0])
        except Exception:
            pass

        # 自动补入操作人、操作时间
        import datetime
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if '操作人' not in data:
            data['操作人'] = user_name
        if '操作时间' not in data:
            data['操作时间'] = now_str

        cols = []
        values = []
        for k, v in data.items():
            if v is not None and v != '':
                cols.append('"' + k + '"')
                values.append("'" + str(v).replace("'", "''") + "'")

        if not cols:
            return {"status": 1, "msg": "没有有效字段", "data": []}

        sql = 'INSERT INTO ' + self.table + ' (' + ','.join(cols) + ') VALUES (' + ','.join(values) + ')'
        self.db.ExecNonQuery(sql)

        return {"status": 0, "msg": "新增成功", "data": []}

    # ==================== 更新 ====================
    def _update(self):
        key = self.json_obj.get('key', '')
        data = self.json_obj.get('data', {})
        if not key:
            return {"status": 1, "msg": "缺少主键", "data": []}

        set_clauses = []
        for k, v in data.items():
            if k == '_original_key':
                continue
            set_clauses.append('"' + k + '" = \'' + str(v).replace("'", "''") + '\'')

        if not set_clauses:
            return {"status": 1, "msg": "没有要更新的字段", "data": []}

        # 自动补入更新时间
        import datetime
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        set_clauses.append('"更新时间" = \'' + now_str + '\'')

        sql = 'UPDATE ' + self.table + ' SET ' + ','.join(set_clauses) + ' WHERE "发货通知单号" = \'' + key.replace("'",
                                                                                                                    "''") + '\''
        self.db.ExecNonQuery(sql)

        return {"status": 0, "msg": "更新成功", "data": []}

    # ==================== 删除 ====================
    def _delete(self):
        key = self.json_obj.get('key', '')
        if not key:
            return {"status": 1, "msg": "缺少主键", "data": []}

        sql = 'DELETE FROM ' + self.table + ' WHERE "发货通知单号" = \'' + key.replace("'", "''") + '\''
        self.db.ExecNonQuery(sql)

        return {"status": 0, "msg": "删除成功", "data": []}

    # ==================== 审核 ====================
    def _audit(self):
        key = self.json_obj.get('key', '')
        if not key:
            return {"status": 1, "msg": "缺少主键", "data": []}

        # 获取当前审核人员
        userid = str(getUserid(getSessionidd()))
        main_db2 = DBROUTE(31)
        auditor_name = userid
        try:
            sql_name = "SELECT 工资编号+'-'+ISNULL(JEI.姓名,'测试') 姓名 FROM [精益办].dbo.JYB_EmployeeInfo JEI WHERE 工资编号= '" + userid + "'"
            records_name = main_db2.ExecQuery(sql_name)
            if records_name and records_name[0][0]:
                auditor_name = str(records_name[0][0])
        except Exception:
            pass
        import datetime
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # try full audit update with auditor info; fall back if columns missing
        try:
            sql = 'UPDATE ' + self.table + ' SET "审核状态" = \'已审核\', "审核人" = \'' + auditor_name.replace("'", "''") + '\', "审核时间" = \'' + now_str + '\' WHERE "发货通知单号" = \'' + key.replace("'", "''") + '\''
            self.db.ExecNonQuery(sql)
        except Exception:
            sql = 'UPDATE ' + self.table + ' SET "审核状态" = \'已审核\' WHERE "发货通知单号" = \'' + key.replace("'", "''") + '\''
            self.db.ExecNonQuery(sql)

        return {"status": 0, "msg": "审核成功", "data": []}

    # ==================== 获取当前用户权限 ====================
    def _get_user_info(self):
        userid = str(getUserid(getSessionidd()))
        return {"status": 0, "msg": "获取成功", "data": {"hasPermission": userid}}

    # ==================== 页面权限检查 ====================
    def _check_permission(self):
        """根据页面区分权限分组
           page: 'index' 台账填报页, 'audit' 审核页
        """
        page = self.json_obj.get('page', 'index')
        userid = str(getUserid(getSessionidd()))

        if page == 'audit':
            # 审核页：仅 pid=175 的人员可审核
            main_db = DBROUTE(1)
            try:
                sql = "SELECT userid FROM Main.dbo.tbGroupUser WHERE pid=175 AND userid='" + userid.replace("'", "''") + "'"
                records = main_db.ExecQuery(sql)
                has_permission = records and len(records) > 0
            except Exception:
                has_permission = False
        else:
            # 台账页：pid=175 或 pid=176 的人员可查看
            main_db = DBROUTE(1)
            try:
                sql = "SELECT userid FROM Main.dbo.tbGroupUser WHERE pid IN (175,176) AND userid='" + userid.replace("'", "''") + "'"
                records = main_db.ExecQuery(sql)
                has_permission = records and len(records) > 0
            except Exception:
                has_permission = False

        # 获取用户姓名
        main_db2 = DBROUTE(31)
        user_name = userid
        try:
            sql_name = "SELECT 工资编号+'-'+ISNULL(JEI.姓名,'测试') 姓名 FROM [精益办].dbo.JYB_EmployeeInfo JEI WHERE 工资编号= '" + userid + "'"
            records_name = main_db2.ExecQuery(sql_name)
            if records_name and records_name[0][0]:
                user_name = str(records_name[0][0])
        except Exception:
            pass

        return {"status": 0, "msg": "权限检查完成", "data": {
            "hasPermission": has_permission,
            "page": page,
            "userid": userid,
            "userName": user_name
        }}

    # ==================== 批量删除 ====================
    def _batch_delete(self):
        keys = self.json_obj.get('keys', [])
        if not keys:
            return {"status": 1, "msg": "请选择要删除的记录", "data": []}

        success_count = 0
        for key in keys:
            try:
                safe_key = str(key).replace("'", "''")
                sql = 'DELETE FROM ' + self.table + ' WHERE "发货通知单号" = \'' + safe_key + '\''
                self.db.ExecNonQuery(sql)
                success_count += 1
            except Exception:
                pass

        return {"status": 0, "msg": "成功删除 " + str(success_count) + " / " + str(len(keys)) + " 条", "data": []}

    # ==================== 批量审核 ====================
    def _batch_audit(self):
        keys = self.json_obj.get('keys', [])
        if not keys:
            return {"status": 1, "msg": "请选择要审核的记录", "data": []}

        # 获取当前审核人员
        userid = str(getUserid(getSessionidd()))
        main_db2 = DBROUTE(31)
        auditor_name = userid
        try:
            sql_name = "SELECT 工资编号+'-'+ISNULL(JEI.姓名,'测试') 姓名 FROM [精益办].dbo.JYB_EmployeeInfo JEI WHERE 工资编号= '" + userid + "'"
            records_name = main_db2.ExecQuery(sql_name)
            if records_name and records_name[0][0]:
                auditor_name = str(records_name[0][0])
        except Exception:
            pass
        import datetime
        now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        success_count = 0
        for key in keys:
            try:
                safe_key = str(key).replace("'", "''")
                sql = 'UPDATE ' + self.table + ' SET "审核状态" = \'已审核\', "审核人" = \'' + auditor_name.replace("'", "''") + '\', "审核时间" = \'' + now_str + '\' WHERE "发货通知单号" = \'' + safe_key + '\''
                self.db.ExecNonQuery(sql)
                success_count += 1
            except Exception:
                pass

        return {"status": 0, "msg": "成功审核 " + str(success_count) + " / " + str(len(keys)) + " 条", "data": []}
