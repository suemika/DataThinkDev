import base64
import json
import random

from dbroute import DBROUTE


class Servlet:
    def __init__(self, data):
        self.json_obj = json.loads(data)

    def service(self):
        zhdb = DBROUTE(31)
        
        排序 = self.json_obj[0]['排序']
        
        # 直接更新，让22后面的排序连续
        zhdb.ExecNonQuery("""
            UPDATE dbo.Of_tb电话部门 
            SET 排序 = 排序 + (ROW_NUMBER() OVER (ORDER BY 排序) - (排序 - {排序}))
            WHERE 排序 > {排序}
        """.format(排序=排序))
        
        return "排序已整理完成!"