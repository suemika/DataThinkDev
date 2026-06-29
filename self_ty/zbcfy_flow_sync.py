from datetime import datetime, timedelta
from dbroute import DBROUTE
import sys
import io
import json

# 设置标准输出编码为UTF-8，确保能正确处理中文字符
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db = DBROUTE(54)
db189 = DBROUTE(7)

def get_array_info():
    """获取合同相关信息"""
    sql = f"""
        select 工资编号, 姓名, 用车单位, 值班车类型, 用车时长
        from (
            select max(工资编号) 工资编号,
                   max(姓名) 姓名,
                   用车单位,
                   值班车类型,
                   CONCAT(
                           FLOOR(SUM(TIME_TO_SEC(用车时长)) / 3600), '小时',
                           FLOOR((SUM(TIME_TO_SEC(用车时长)) % 3600) / 60), '分钟',
                           SUM(TIME_TO_SEC(用车时长)) % 60, '秒'
                   ) AS 用车时长
            from (SELECT c.username AS 工资编号,
                         c.nickname AS 姓名,
                         pay_company_name AS 用车单位,
                         case when car_model = 14 then '20吨值班车' when car_model = 15 then '40吨值班车' end as 值班车类型,
                         TIMEDIFF(real_end_time, receive_time) AS 用车时长
                  FROM td_need_declare a
                  LEFT JOIN td_send_car b ON a.id = b.need_declare_id
                  LEFT JOIN khala_sys_user c ON a.apply_by = c.id
                  where a.car_model in (14, 15)
                    and receive_time >= DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, '%Y-%m-21')
                    and receive_time <= DATE_FORMAT(CURRENT_DATE, '%Y-%m-20') AND c.username='004264' and pay_company_name = '准备车间') aa
            group by 用车单位, 值班车类型, 工资编号, 姓名
        ) final
        order by 工资编号, 用车单位, 值班车类型
    """
    result = db.ExecQuery(sql)
    if not result:
        return {}

    # 按工资编号分组，收集每个用户的所有值班车信息
    user_data = {}
    for row in result:
        工资编号, 姓名, 用车单位, 值班车类型, 用车时长 = row
        if 工资编号 not in user_data:
            user_data[工资编号] = {
                "name": 姓名,
                "department": 用车单位,
                "car_types": [],
                "durations": []
            }
        user_data[工资编号]["car_types"].append(值班车类型)
        user_data[工资编号]["durations"].append(用车时长)

    return user_data


def insert_workflow_main(user_name, user_id, array_info, department):
    """插入流程主表"""
    # 构建特定的表单结构
    form_values = {
        "fd_3e654ff3cc70c0": user_name,  # 提出人
        "fd_3e654ff56e36e0": department,  # 单位
        "fd_3e6551351a088c": {
            "fd_3e6551351a088c.fd_3e655153fa841e": array_info["car_types"],
            "fd_3e6551351a088c.fd_3e6551557ce1dc": array_info["durations"]
        }
    }

    doc_creator = f'{{"LoginName": "{user_id}"}}'

    sql = f"""
        INSERT INTO [综合信息管理].[dbo].[XT_tb流程启动任务](
            [fdTemplateId], [docSubject], [docCreator], [fdKeyword], [formValues],
            [flowParam], [addtime], [ftype], ywxt
        ) VALUES (
            '198ea526df8be6443d48b204850b6aa6', 
            '{department}-值班车费用', 
            '{doc_creator}', 
            '["值班车费用"]',
            '{json.dumps(form_values, ensure_ascii=False)}',
            '{{"auditNode":"请审核"}}', 
            GETDATE(), 
            'A', 
            '值班车费用'
        )

        SELECT SCOPE_IDENTITY() AS new_id
    """

    result = db189.ExecQuery(sql)
    return result[0][0] if result else None


def query():
    """处理所有用户的流程"""
    user_data = get_array_info()

    workflow_ids = {}
    for 工资编号, info in user_data.items():
        workflow_id = insert_workflow_main(
            user_name=info["name"],
            user_id=工资编号,
            array_info=info, department=info["department"]
        )
        workflow_ids[工资编号] = workflow_id

    print("\n传递完成")
    print(workflow_ids)


if __name__ == '__main__':
    query()
