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

        cols = [
            '发货通知单号', '批号', '定尺', '规格', '产品名称1', '牌号', '许可证号',
            '执行标准', '发货状态', '审核状态', '合同号', '收货单位', '日期', '请发日期', '车号',
            '各支理重', '各支实重', '各支件数', '重量', '支数', '件数', '炉号',
            '屈服强度', '抗拉强度', '强屈比', '断后伸长率', '最大应力下的总伸长率',
            '超强比', '冷弯180度', '反弯', '冲击功1', '冲击功2', '冲击功3',
            '冲击功平均值', '冲击功', '米重', '实物标记', '弯曲类型', 'D类型',
            '试验温度', '技术规范', 'C', 'MN', 'P', 'S', 'SI', 'CU', 'NI', 'CR',
            'MO', 'V', 'B', 'CEQ', 'CMN6', 'CE', 'N', 'ALT', 'TI', 'NB', 'ALS',
            '总重量', '总件数', '断面收缩率', '试样尺寸', '下屈服强度'
        ]

        sql = 'SELECT ' + ','.join(['"' + c + '"' for c in cols]) + ' FROM ' + self.table
        where_clauses = []

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

        # 自动补入操作人员
        if '操作人员' not in data:
            data['操作人员'] = user_name

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

        sql = 'UPDATE ' + self.table + ' SET "审核状态" = \'已审核\' WHERE "发货通知单号" = \'' + key.replace("'",
                                                                                                              "''") + '\''
        self.db.ExecNonQuery(sql)

        return {"status": 0, "msg": "审核成功", "data": []}

    # ==================== 获取当前用户权限 ====================
    def _get_user_info(self):
        userid = '011980'
        # userid = str(getUserid(getSessionidd()))
        has_permission = (userid == '011980')
        return {"status": 0, "msg": "获取成功", "data": {"hasPermission": has_permission}}

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

        success_count = 0
        for key in keys:
            try:
                safe_key = str(key).replace("'", "''")
                sql = 'UPDATE ' + self.table + ' SET "审核状态" = \'已审核\' WHERE "发货通知单号" = \'' + safe_key + '\''
                self.db.ExecNonQuery(sql)
                success_count += 1
            except Exception:
                pass

        return {"status": 0, "msg": "成功审核 " + str(success_count) + " / " + str(len(keys)) + " 条", "data": []}
