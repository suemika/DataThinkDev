import json
from dbroute import DBROUTE
from main import getUserid, getSessionidd


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = str(getUserid(getSessionidd()))

    def encode_handle(self, str_data):
        if str_data is None:
            return None
        return str_data.encode('latin1').decode('gbk')

    def service(self):
        try:
            sql = """
            SELECT A.部门名称, ISNULL(A.主部门ID, A.ID) 主部门ID, B.岗位名称, ISNULL(B.姓名, ''), ISNULL(B.座机, ''),ISNULL(B.手机, '') , A.是否显示,办公室.DBO.fun_getPY(B.姓名) 姓名简拼
FROM Of_tb电话部门 A
         INNER JOIN Of_tb岗位电话 B ON A.ID = B.pid
ORDER BY A.排序, B.排序
            """

            routeDB = DBROUTE(31)
            reslist = routeDB.ExecQuery(sql)

            formatted_result = {
                "status": 0,
                "msg": "成功",
                "data": []
            }

            # 用于存储主部门与其相关部门的映射
            department_map = {}

            for row in reslist:
                department_name = row[0]
                main_department_id = row[1]
                position_name = row[2]
                name = row[3]
                landline_number = row[4]
                mobile_phone_number = row[5]
                is_visible = row[6]
                initials = row[7]

                # 检查部门是否已存在
                department_exists = next(
                    (item for item in formatted_result["data"] if item["name"] == department_name), None)

                if department_exists:
                    department_exists["numbers"].append({
                        "position": position_name,
                        "name": name,
                        "landline": landline_number,
                        "mobile": mobile_phone_number,
                        "initials": initials
                    })
                else:
                    # 新增部门并初始化相关数据
                    department_entry = {
                        "name": department_name,
                        "numbers": [{
                            "position": position_name,
                            "name": name,
                            "landline": landline_number,
                            "mobile": mobile_phone_number,
                            "initials": initials
                        }],
                        "is_visible": is_visible,
                        "relatedDepartments": []  # 初始化相关部门列表
                    }
                    formatted_result["data"].append(department_entry)

                    # 将该部门加入map用于相关性建立
                    if main_department_id not in department_map:
                        department_map[main_department_id] = []
                    department_map[main_department_id].append(department_name)

            # 为每个部门填充相关部门
            for department in formatted_result["data"]:
                # 如果部门有主部门ID, 则从映射中找到其相关部门
                for main_id, related_departments in department_map.items():
                    # 这里假设主部门ID与部门名称的某种对应关系
                    if department["name"] in related_departments:
                        # 在relatedDepartments中添加其他部门名，排除自身
                        department["relatedDepartments"].extend(
                            [dept for dept in related_departments if dept != department["name"]]
                        )

            return formatted_result
        except Exception as e:
            print(e)
            return {"status": 1, "msg": "系统异常！", "data": {}}
