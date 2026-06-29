import json
import requests
from dbroute import DBROUTE
from main import getUserid, getSessionidd
from urllib.parse import quote


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

    def service(self):
        """
        主要业务逻辑：
        1. 从JSON对象中获取token。
        2. 通过token向远程服务获取登录名。
        3. 从数据库中获取相应的员工信息。
        4. 返回登录名或错误信息。
        """
        try:
            # 从JSON对象中获取token
            token = self.json_obj
            if not token:
                return {"status": 1, "msg": "Token is empty!", "data": {}}

            # 对token进行URL编码
            encoded_token = quote(token)

            # 准备HTTP请求
            headers = {'Content-Type': 'application/json'}
            url = f'http://192.168.1.23/api/sys-authentication/loginService/getTokenLoginName?token={encoded_token}'

            # 发送POST请求
            response = requests.post(url, headers=headers)
            response.raise_for_status()  # 检查请求是否成功

            # 解析响应JSON
            res = response.json()
            login_name = res.get('loginName')

            if not login_name:
                return {"status": 1, "msg": "Error fetching login name.", "data": {}}

            # 从数据库中获取员工信息
            db_1 = DBROUTE(1)
            sql = f"SELECT TOP 1 编号及姓名 FROM [Main].[dbo].[View_员工信息] WHERE 编号及姓名 LIKE '%{login_name}%'"
            res_list = db_1.ExecQuery(sql)

            if not res_list:
                return {"status": 1, "msg": "Employee not found.", "data": {}}

            employee_info = res_list[0][0]

            # 返回员工信息
            return employee_info

        except requests.RequestException as e:
            print(f"Request error: {e}")
            return {"status": 1, "msg": "Failed to fetch login name!", "data": {}}
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            return {"status": 1, "msg": "Failed to parse response JSON!", "data": {}}
        except Exception as e:
            print(f"Unexpected error: {e}")
            return {"status": 1, "msg": "System error!", "data": {}}
