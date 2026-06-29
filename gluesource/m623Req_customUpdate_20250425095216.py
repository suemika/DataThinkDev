import json
from dbroute import DBROUTE
from main import getSessionidd, getUserid


def 加引号(strData):
    if strData is None:
        return "''"
    else:
        return "'" + strData + "'"


def 乱码处理(strdata):
    # return strdata.encode('latin1').decode('gbk')
    return strdata


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = json.loads(data)
        self.userid = getUserid(getSessionidd())

    def service(self):
        db_11hh = DBROUTE(31)
        data = self.json_obj
        ID = data['ID']
        部门名称 = data['部门名称']
        主部门ID = data['主部门ID']
        排序 = data['排序']
        制单修改人 = self.userid
        sql = """
                UPDATE [dbo].[Of_tb电话部门]
           SET 
               [操作人] = '{制单修改人}',部门名称 = '{部门名称}',排序 = '{排序}',主部门ID='{主部门ID}'
              ,[updateTime] = getdate()

         WHERE ID={ID}  """.format(ID=ID, 制单修改人=制单修改人, 部门名称=部门名称, 排序=排序, 主部门ID=主部门ID)
        db_11hh.ExecNonQuery(sql)
        msg = '修改成功！'
        return json.loads('{"next_opt": "end","msg": "' + msg + '"}')
