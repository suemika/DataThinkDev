import base64
import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd


# API URLs 配置
class Config:
    API_URLS = {
        'UTIL_FILE': 'https://www.shtggroup.com/utilFile?pid=1&suffix=bgsdhhm',
        'YGWTFK': 'http://ems.sdstg.com/program/feedback.html?v=2.32324323'
    }


# 状态码定义
class StatusCode:
    SUCCESS = 0
    EMPLOYEE_NOT_FOUND = 1


class Servlet:
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))

    def _build_response(self, status, msg, data):
        return {
            "status": status,
            "msg": msg,
            "data": data
        }

    def service(self):
        api_key = self.json_obj

        if not api_key:
            return self._build_response(1, "Missing api_key", {})

        # 获取对应的URL
        url = Config.API_URLS.get(api_key)
        if not url:
            return self._build_response(1, f"API key '{api_key}' not found", {})

        # 构造成功响应
        formatted_result = {
            "url": url
        }
        return self._build_response(StatusCode.SUCCESS, "SUCCESS", formatted_result)