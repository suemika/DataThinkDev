from flask import jsonify

from dbroute import DBROUTE


def encode_handle(str_data):
    if str_data is None:
        return None
    return str_data.encode('latin1').decode('gbk')


class Servlet:
    # 解析json字符串,生成对象属性
    def __init__(self, data):
        self.json_obj = data
        # self.userid = str(getUserid(getSessionidd()))

    def service(self):

        # token = self.json_obj[0]['personFid']
        try:
            # 值班人员名单
            persons = [
                "张明卓", "杜朋龙", "刘金铭",
                "石  铁", "张赛", "张晋东", "王元森", "李洪枫",
                "崔红涛", "鹿泽祥", "杨  可", "董  蒙", "郎未琪", "王蓉瑜", "王亚星", "郭子琳",
                "杨兴忠", "王龙昊", "吴玉良", "王  磊", "马玲玉"
            ]

            # 领导值班人员
            leaders = [
                "A",  "B", "C"
            ]

            # 节假日列表
            holidays = [
                {"title": '元旦', "date": '2026-01-01'},
                {"title": '元旦', "date": '2026-01-02'},
                {"title": '元旦', "date": '2026-01-03'},
                {"title": '大年29', "date": '2026-02-15'},
                {"title": '除夕', "date": '2026-02-16'},
                {"title": '初一', "date": '2026-02-17'},
                {"title": '初二', "date": '2026-02-18'},
                {"title": '初三', "date": '2026-02-19'},
                {"title": '初四', "date": '2026-02-20'},
                {"title": '初五', "date": '2026-02-21'},
                {"title": '初六', "date": '2026-02-22'},
                {"title": '初七最后一天', "date": '2026-02-23'},
                {"title": '清明1', "date": '2026-04-04'},
                {"title": '清明节', "date": '2026-04-05'},
                {"title": '清明最后一天', "date": '2026-04-06'},
                {"title": '劳动节', "date": '2026-05-01'},
                {"title": '劳动节2', "date": '2026-05-02'},
                {"title": '劳动节3', "date": '2026-05-03'},
                {"title": '劳动节4', "date": '2026-05-04'},
                {"title": '劳动节最后一天', "date": '2026-05-05'},
                {"title": '端午节', "date": '2026-06-19'},
                {"title": '端午节2', "date": '2026-06-20'},
                {"title": '端午节最后一天', "date": '2026-06-21'},
                {"title": '中秋节', "date": '2026-09-25'},
                {"title": '中秋节2', "date": '2026-09-26'},
                {"title": '中秋节最后一天', "date": '2026-09-27'},
                {"title": '国庆节', "date": '2026-10-01'},
                {"title": '国庆节2', "date": '2026-10-02'},
                {"title": '国庆节最后一天', "date": '2026-10-03'},
                {"title": '国庆节4', "date": '2026-10-04'},
                {"title": '国庆节5', "date": '2026-10-05'},
                {"title": '国庆节6', "date": '2026-10-06'},
                {"title": '国庆节最后一天', "date": '2026-10-07'},

            ]

            # 不需要值班的特定周末
            no_duty_weekends = [
                '2026-01-04',
                '2026-02-14',
                '2026-02-28',
                '2026-05-09',
                '2026-09-20',
                '2026-10-10'
            ]

            # 构造最终的返回结果
            formatted_result = {
                "status": 0,
                "msg": "成功",
                "data": {
                    "persons": persons,
                    "leaders": leaders,
                    "holidays": holidays,
                    "noDutyWeekends": no_duty_weekends
                }
            }

            return formatted_result
        except Exception as e:
            print(e)
            return jsonify({"status": 1, "msg": "系统异常！", "data": {}})
