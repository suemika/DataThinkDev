import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd


def add_quotes(value):
    """
    为字符串添加单引号。如果字符串为None，则返回空字符串的引号表示。
    """
    return f"'{value}'" if value is not None else "''"


class Servlet:
    def __init__(self, data):
        """
        初始化Servlet对象，解析JSON数据并获取用户ID。
        """
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))

    def encode_handle(self, str_data):
        """
        处理字符串编码，目前不执行任何操作。
        """
        if str_data is None:
            return None
        try:
            return str_data.encode('latin1').decode('gbk')
        except UnicodeEncodeError:
            return str_data

    def save_data(self, table_name, fields, data, operator_name, source_address):
        """
        通用保存方法，用于将数据插入到指定的数据库表中。
        """
        try:
            db_1 = DBROUTE(31)

            column_names = ", ".join(fields.keys()) + ", 操作人, 来源地址"  # 增加操作人和来源地址
            values = ", ".join(add_quotes(data[field]) for field in fields.values())
            values += f", {add_quotes(operator_name)}, {add_quotes(source_address)}"  # 包含操作人和来源地址
            # 动态生成 SQL 语句
            sql = f"INSERT INTO [dbo].[{table_name}] ({column_names}) OUTPUT INSERTED.ID VALUES({values}) "
            inserted_id = db_1.ExecQuery(sql)
            return inserted_id[0][0] if inserted_id else None
        except Exception as e:
            print(f"Database error: {e}")
            return None

    def service(self):
        """
        主要业务逻辑：
        1. 从JSON对象中获取信息。
        2. 根据fromName调用对应的保存方法。
        3. 返回结果或错误信息。
        """
        try:
            data = self.json_obj
            from_name = data['fromName']  # 假设 fromName 是从 JSON 中获取的

            # 从数据中获取操作人和来源地址
            operator_name = data['userName'] #   'userName' 是操作人的键
            source_address = data['sourceAddress'] #   'sourceAddress' 是来源地址的键

            # 构造和映射表单名称到表名和字段
            dispatch = {
                "feedbackForm": ("Of_tb页面反馈问题", {
                    '反馈内容': 'userFeedback'
                }),
                "saveQueryData": ("Of_tb页面历史查询", {
                    '查询内容': 'queryData'
                }),
            }

            # 调用相应的保存方法
            table_info = dispatch.get(from_name)
            if table_info:
                table_name, fields = table_info
                last_insert_id = self.save_data(table_name, fields, data, operator_name, source_address)
                msg = '感谢您的反馈!' if last_insert_id else '提交失败！'
            else:
                msg = '未定义的表单类型！'

            return json.loads(f'{{"next_opt": "end", "msg": "{msg}"}}')
        except Exception as e:
            print(f"Unexpected error: {e}")
            msg = '提交失败！'
            return json.loads(f'{{"next_opt": "end", "msg": "{msg}"}}')
