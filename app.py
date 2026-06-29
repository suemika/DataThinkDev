# -*- coding: utf-8 -*-
import time
from datetime import datetime

from flask import Flask, render_template, make_response, redirect, request, send_file, url_for, send_from_directory
from flask_restful import reqparse, abort, Resource, Api
import json
import os
from dbroute import DBROUTE
import importlib
from gevent import pywsgi
import socket
from flask_cors import CORS
from login import Login
from io import BytesIO
import xlrd
import xlwt
from loguru import logger

logger.add("./logs/log.log", encoding="utf-8", rotation="5MB", retention="10 days", enqueue=True)

app = Flask(__name__, static_url_path='')
CORS(app, resources=r'/*')

loginObject = Login()

api = Api(app)
app.config["JSON_AS_ASCII"] = False
os.environ['NLS_LANG'] = 'SIMPLIFIED CHINESE_CHINA.UTF8'

parser = reqparse.RequestParser()
parser.add_argument('req')
parser.add_argument('data')
parser.add_argument('page')
parser.add_argument('rows')
parser.add_argument('sort')
parser.add_argument('order')
parser.add_argument('filterRules')
parser.add_argument('pid')
parser.add_argument('code')
parser.add_argument('q')
parser.add_argument('account')
parser.add_argument('password')

MainDB = DBROUTE(1)


class Home(Resource):
    def get(self):
        return app.send_static_file('home.html')


class LoginPage(Resource):
    def get(self):
        return app.send_static_file('login.html')


class Index(Resource):
    def get(self, page):
        return app.send_static_file(page + '.html')


class Insert(Resource):
    def post(self):
        # ip = getIP()
        ip = ''
        args = parser.parse_args()
        sessionidd = getSessionidd()
        reslist = MainDB.ExecQuery(
            "SELECT isnull([serverName],''),isnull([databaseName],''),isnull([tableName],''),DBLinkID,glueType FROM [Main].[dbo].[tbDataGrid] where gridNo = '" +
            args['req'] + "'")
        serverName = str(reslist[0][0])
        databaseName = str(reslist[0][1])
        tableName = str(reslist[0][2])
        DBLinkID = str(reslist[0][3])
        glueType = str(reslist[0][4])
        routeDB = DBROUTE(DBLinkID)
        data = args['data'].replace("'", "''").replace('"', '\"').replace('\n', '<bn>').replace('\r', '<br>')
        logger.info(" | " + args['req'] + " | Insert | " + "exec [InsertData] '" + getUserid(sessionidd) + "','" + args[
            'req'] + "','" + data + "','" + ip + "','" + serverName + "','" + databaseName + "','" + tableName + "'")
        result = routeDB.ExecQuery("exec [InsertData] '" + getUserid(sessionidd) + "','" + args[
            'req'] + "','" + data + "','" + ip + "','" + serverName + "','" + databaseName + "','" + tableName + "'")
        logger.info(" | " + args['req'] + " | Insert | " + result[0][0])
        return json.loads(result[0][0])[0]


class Update(Resource):
    def post(self):
        # ip = getIP()
        ip = ''
        args = parser.parse_args()
        sessionidd = getSessionidd()
        reslist = MainDB.ExecQuery(
            "SELECT isnull([serverName],''),isnull([databaseName],''),isnull([tableName],''),DBLinkID,glueType FROM [Main].[dbo].[tbDataGrid] where gridNo = '" +
            args['req'] + "'")
        serverName = str(reslist[0][0])
        databaseName = str(reslist[0][1])
        tableName = str(reslist[0][2])
        DBLinkID = str(reslist[0][3])
        glueType = str(reslist[0][4])
        routeDB = DBROUTE(DBLinkID)
        data = args['data'].replace("'", "''").replace('\n', '<bn>').replace('\r', '<br>')
        logger.info(" | " + args['req'] + " | Update | " + "exec [UpdateData] '" + getUserid(sessionidd) + "','" + args[
            'req'] + "','" + data + "','" + ip + "','" + serverName + "','" + databaseName + "','" + tableName + "'")
        result = routeDB.ExecQuery("exec [UpdateData] '" + getUserid(sessionidd) + "','" + args[
            'req'] + "','" + data + "','" + ip + "','" + serverName + "','" + databaseName + "','" + tableName + "'")
        logger.info(" | " + args['req'] + " | Insert | " + result[0][0])
        return json.loads(result[0][0])[0]


class QueryOptions(Resource):
    def post(self):
        args = parser.parse_args()
        if (getAuth(args['req']) == "1"):
            sql = "exec SYS_Proc_Options '" + args['req'] + "','" + getSessionidd() + "'"
            print(sql)
            reslist = MainDB.ExecQuery(sql)
            print(reslist[0][0])
            return json.loads(reslist[0][0].encode('latin1').decode('gbk'))
        else:
            return json.loads('{"status": 1,"msg":"系统异常，请重新登录。","data": {}}')


class QueryDict(Resource):
    def post(self):
        args = parser.parse_args()
        sessionidd = getSessionidd()
        procList = MainDB.ExecQuery(
            "SELECT [procName],[length],[DBLinkID],[DBType] FROM [dbo].[tbDataDictsConfig] where [code] = '" + args[
                'code'] + "'")

        if (args['q'] == None):
            length = 0
            q = ''
        else:
            length = len(args['q'])
            q = args['q']
        if (length >= int(procList[0][1])):
            routeDB = DBROUTE(procList[0][2])
            logger.info(" | " + args['code'] + " | QueryDict | " + "exec " + procList[0][0] + " '" + args[
                'code'] + "','" + q + "','" + sessionidd + "'")
            reslist = routeDB.ExecQuery(
                "exec " + procList[0][0] + " '" + args['code'] + "','" + q + "','" + sessionidd + "'")
            if (reslist != []):
                return json.loads(reslist[0][0])
            else:
                return json.loads('{"label":"","value":""}')
        else:
            return json.loads('{"label":"","value":""}')


class CustomOpt(Resource):
    def post(self):
        sessionidd = getSessionidd()
        args = parser.parse_args()
        reslist = MainDB.ExecQuery(
            "SELECT b.DBlinkID,a.glueType,a.procName,a.glueSource,replace(replace(replace(convert(varchar,a.glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime,b.gridNo FROM [Main].[dbo].[tbDataToolbar] a left join [Main].[dbo].[tbDataGrid] b on a.pid=b.ID  where a.ID = '" +
            args['req'] + "'")

        DBlinkID = str(reslist[0][0])
        glueType = str(reslist[0][1])
        procName = reslist[0][2]
        glueSource = str(reslist[0][3])
        glueUpdatetime = str(reslist[0][4])
        gridNo = str(reslist[0][5])
        if glueType == 'GLUE_StoreProcedure':
            sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
            logger.info(" | " + gridNo + " | CustomOpt | " + sql)
            routeDB = DBROUTE(DBlinkID)
            try:
                reslist = routeDB.ExecQuery(sql)
                logger.info(
                    " | " + gridNo + " | CustomOpt | " + '{"status": 0,"msg":"' + str(reslist[0][0]) + '","data": {}}')
                return json.loads('{"status": 0,"msg":"' + str(reslist[0][0]) + '","data": {}}')
            except Exception as e:
                logger.exception(" | " + gridNo + " | CustomOpt | " + '{"status": 1,"msg":"' + str(e) + '","data": {}}')
                return json.loads('{"status": 1,"msg":"' + str(e) + '","data": {}}')
        if glueType == 'GLUE_Python':
            logger.info(args['data'])
            pyfile = gridNo + '_' + args['req'] + '_' + glueUpdatetime
            # logger.info(" | " + gridNo + " | CustomOpt | " + pyfile+ '.py'+" "+args['data'])
            if not os.path.exists('./gluesource/' + pyfile + '.py'):

                for fileName in os.listdir('./gluesource/'):
                    if (fileName.startswith(gridNo + '_' + args['req'] + '_')):
                        os.remove(os.path.join('./gluesource/', fileName))
                with open('./gluesource/' + pyfile + '.py', 'w', encoding='utf-8') as file:
                    file.write(glueSource.replace('\r\n', '\n'))
            logger.info(args['data'])
            glueClass = importlib.import_module('gluesource.' + pyfile)
            print('2', args['data'])
            glueClass = importlib.reload(glueClass)
            print('3', args['data'])
            obj = glueClass.Servlet(args['data'])
            try:
                result = obj.service()
                logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 0,"msg":"' + result + '","data": {}}')
                return json.loads('{"status": 0,"msg":"' + result + '","data": {}}')
            except Exception as e:
                logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 1,"msg":"' + str(e) + '","data": {}}')
                return json.loads('{"status": 1,"msg":"' + str(e) + '","data": {}}')


class QueryData(Resource):
    def post(self):
        ip = ""
        args = parser.parse_args()
        try:
            if (getAuth(args['req']) == "1"):
                page = args['page']
                rows = args['rows']
                pid = args['pid']
                sort = args['sort']
                order = args['order']
                req = args['req']
                orderBy = ''
                filterRules = args['filterRules']
                if sort is None or sort == '':
                    resList = MainDB.ExecQuery(
                        "SELECT isnull([sortName],'') sortName,isnull([sortOrder],'') sortOrder FROM [Main].[dbo].[tbDataGrid] where gridNo = '" + req + "'")
                    sort = resList[0][0]
                    order = resList[0][1]
                sortArray = sort.split(',')
                orderArray = order.split(',')
                for i in range(0, len(sortArray)):
                    orderBy += sortArray[i] + ' ' + orderArray[i] + ','

                if filterRules is None or filterRules == '':
                    filterRules = "[]"

                reslist = MainDB.ExecQuery(
                    "SELECT ID,DBlinkID,glueType,[procDataName],glueSource,replace(replace(replace(convert(varchar,[glueUpdatetime],120),'-',''),' ',''),':','') glueUpdatetime FROM [dbo].[tbDataGrid] where gridNo = '" +
                    args['req'] + "'")

                DBlinkID = str(reslist[0][1])
                glueType = str(reslist[0][2])
                procDataName = reslist[0][3]
                glueSource = str(reslist[0][4])
                glueUpdatetime = str(reslist[0][5])

                if glueType == 'GLUE_StoreProcedure':
                    if not (pid == ''):
                        pidFilter = "{''field'':''pid'',''op'':''equal'',''value'':''" + pid + "''}"
                        if not (filterRules == "[]"):
                            filterRules = filterRules[:-1] + ',' + pidFilter + ']'
                        else:
                            filterRules = '[' + pidFilter + ']'
                    condition = '{"orderBy":"' + orderBy[
                                                 :-1] + '","rows":"' + rows + '","page":"' + page + '","filterRules":"' + filterRules.replace(
                        "\"", "''") + '","sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'

                    logger.info(" | " + req + " | queryData | " + "exec [" + procDataName + "] '" + condition + "'")
                    routeDB = DBROUTE(DBlinkID)
                    reslist = routeDB.ExecQuery("exec [" + procDataName + "] '" + condition + "'")
                    # MainDB.ExecNonQuery("insert into dbo.[tbLog] (IP,操作,记录ID,请求代号,数据,sessionidd,时间) values ('" + ip + "','查询','0','" + args['req'] + "','" + condition + "','" + getSessionidd() + "',getdate())")
                    if (reslist[0][0] == None):
                        return json.loads('{"total":"0","rows":[]}')
                    else:
                        return json.loads(reslist[0][0])
                if glueType == 'GLUE_Python':
                    if not (pid == ''):
                        pidFilter = "{\"field\":\"pid\",\"op\":\"equal\",\"value\":\"" + pid + "\"}"
                        if not (filterRules == "[]"):
                            filterRules = filterRules[:-1] + ',' + pidFilter + ']'
                        else:
                            filterRules = '[' + pidFilter + ']'
                    condition = '{"orderBy":"' + orderBy[
                                                 :-1] + '","rows":"' + rows + '","page":"' + page + '","filterRules":' + filterRules + ',"sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'
                    # 1、根据功能画面ID_代码更新时间戳拼接成文件名
                    # 2、根据文件名去固定目录查找文件
                    # 3、能查到，代表是最新代码，直接执行
                    # 4、查不到，（1）代码从没生成过（2）代码修改过
                    # a、根据功能画面req_, 去检索目录下面是否有此前缀的文件，如果有则删除
                    # b、以最新文件名下载代码，执行
                    pyfile = req + '_' + glueUpdatetime
                    logger.info(" | " + req + " | queryData | " + pyfile + '.py' + ' ' + condition)
                    if not os.path.exists('./gluesource/' + pyfile + '.py'):
                        for fileName in os.listdir('./gluesource/'):
                            if (fileName.startswith(req + '_') and len(fileName.split('_')) == 2):
                                os.remove(os.path.join('./gluesource/', fileName))
                        with open('./gluesource/' + pyfile + '.py', 'w', encoding='utf-8') as file:
                            file.write(glueSource.replace('\r\n', '\n'))
                    glueClass = importlib.import_module('gluesource.' + pyfile)
                    glueClass = importlib.reload(glueClass)
                    obj = glueClass.Servlet(condition)
                    result = obj.service()
                    if (result == None):
                        return json.loads('{"total":"0","rows":[]}')
                    else:
                        return json.loads(result)
            else:
                return json.loads('{"status": 1,"msg":"无权限，请重新登录。","data": {}}')
        except Exception as e:
            logger.exception(" | " + req + " | queryData | " + str(e))


class Login(Resource):
    def post(self, type):
        args = parser.parse_args()
        account = args['account']
        password = args['password']
        loginResult = loginObject.login(account, password, type)
        return make_response(loginResult)


# 获取字段的类型
def getFieldType(tableName, DBLinkID, field):
    routeDB = DBROUTE(DBLinkID)
    sql = ''
    result_list = []
    if routeDB.dbcon.serverName == 'SQLSERVER':
        sql = "SELECT  c.DATA_TYPE FROM (SELECT * FROM SYS.OBJECTS WHERE TYPE = 'U') o LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON o.NAME = c.TABLE_NAME LEFT JOIN SYS.EXTENDED_PROPERTIES ep ON o.OBJECT_ID = ep.MAJOR_ID WHERE o.NAME = '" + tableName + "' and c.COLUMN_NAME = '" + field + "'"
        result_list = routeDB.ExecQuery(sql)
    if len(result_list) > 0:
        return result_list[0][0]
    else:
        return ''


# 判断值与字段类型是否匹配
def checkValueType(field_type, value):
    return True
    if field_type == 'int':
        # 正整数
        if value.isdigit():
            return True
        # 负数
        elif value.count('-') == 1 and value.startswith('-'):
            return value.replace('-', '').isdigit()
        else:
            return False
    elif field_type == 'bit':
        return value.lower() in ['true', 'false']
    elif field_type == 'float':
        value_list = value.split('.')
        if len(value_list) > 2:
            return False
        else:
            for v in value_list:
                if not v.isdigit():
                    return False
        return True
    elif field_type == 'date':
        try:
            datetime.strptime(value, '%Y-%m-%d')
            return True
        except ValueError:
            return False
    elif field_type == 'datetime':
        try:
            datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            return True
        except ValueError:
            return False
    else:
        return True


class UpLoad(Resource):
    def post(self):
        args = parser.parse_args()
        account = args['account']
        filterRules = json.loads(args['filterRules'])
        # 上传类型
        type = findValue(filterRules, 'type')
        # 导入表格数据
        if type == 'upload_table_data':
            # 表ID
            id = findValue(filterRules, 'ID')
            # 获取表对应数据库的信息
            reslist = MainDB.ExecQuery(
                "SELECT isnull([tableName],''),DBLinkID FROM [Main].[dbo].[tbDataGrid] where id = '" + id + "'")
            tableName = str(reslist[0][0])
            DBLinkID = str(reslist[0][1])
            excel_bytes = request.files['file'].stream.read()
            data = xlrd.open_workbook(file_contents=excel_bytes)  # 读取二进制内容
            table = data.sheet_by_index(0)  # 读取第一个sheet页
            nrows = table.nrows  # 行数
            ncols = table.ncols  # 列数

            for i in range(ncols):
                field = table.cell(0, i).value
                field_desc = table.cell(1, i).value
                is_required = True if field_desc.find('*') > -1 else False
                field_type = getFieldType(tableName, DBLinkID, field)
                for j in range(2, nrows):
                    # ctype： 0 empty,1 string, 2 number, 3 date, 4 boolean, 5 error
                    # ctype = table.cell(j, i).ctype
                    value = str(table.cell(j, i).value)
                    if is_required:
                        if value:
                            if not checkValueType(field_type, value):
                                return {"status": 1,
                                        "msg": str(j) + '行,' + str(i) + '列，数据格式错误，应为' + field_type + '类型，请修改后重新提交！',
                                        "data": {"value": str(j) + '行,' + str(
                                            i) + '列，数据格式错误，应为' + field_type + '类型，请修改后重新提交！'}}
                        else:
                            return {"status": 1, "msg": str(j) + '行,' + str(i) + '列，数据为空，请维护！',
                                    "data": {"value": str(j) + '行,' + str(i) + '列，数据为空，请维护！'}}
                    else:
                        if value:
                            if not checkValueType(field_type, value):
                                return {"status": 1, "msg": "", "data": {
                                    "value": str(j) + '行,' + str(i) + '列，数据格式错误，应为' + field_type + '类型，请修改后重新提交！'}}
            db = DBROUTE(DBLinkID)
            for j in range(2, nrows):
                sql = 'insert into ' + tableName
                col = ''
                value = ''
                for i in range(ncols):
                    field = table.cell(0, i).value
                    field_type = getFieldType(tableName, DBLinkID, field)
                    col = col + field + ','
                    if field_type == 'decimal':
                        if str(table.cell(j, i).value):
                            value = value + str(table.cell(j, i).value) + ','
                        else:
                            value = value + '0,'
                    else:
                        value = value + "'" + str(table.cell(j, i).value) + "'" + ','
                # 113-设备码导入
                if id == '113':
                    sessionidd = getSessionidd()
                    user_id = getUserid(sessionidd)
                    col = col + '操作人,插入日期,是否同步,'
                    value = value + "'" + str(user_id) + "','" + time.strftime("%Y-%m-%d %H:%M:%S",
                                                                               time.localtime()) + "',0,"
                col = '(' + col[0: -1] + ')'
                value = '(' + value[0: -1] + ')'
                sql = sql + col + 'values' + value
                db.ExecNonQuery(sql)


class DownLoad(Resource):
    # 生成excel下载模板
    def post(self):
        args = parser.parse_args()
        filterRules = json.loads(args['filterRules'])
        # 获取下载类型
        type = findValue(filterRules, 'type')
        # 下载导入Excel模板
        if type == 'excelTemplate':
            # 获取导出Excel模板表ID
            id = findValue(filterRules, 'ID')
            # 获取表中能导出的列信息
            db = DBROUTE(1)
            sql = "select a.[field], a.[title],a.[isRequired],a.[fillingRequirements], b.[tableName],b.[DBLinkID] from [Main].[dbo].[tbDataGridDetails] a left outer join [Main].[dbo].[tbDataGrid] b on a.pid = b.id where a.isImport = 1 and a.pid = '" + id + "'"
            template_cols = db.ExecQuery(sql)
            table_name = template_cols[0][4]
            DBLinkID = template_cols[0][5]
            out = BytesIO()
            # 创建一个workbook并设置编码
            workbook = xlwt.Workbook()
            # 添加sheet
            worksheet = workbook.add_sheet('导入模板')
            count = 0
            border = xlwt.Borders()
            border.left = border.THIN
            border.bottom = border.THIN
            border.right - border.THIN
            border.top = border.THIN
            # 创建模式对象
            pattern_1 = xlwt.Pattern()
            # NO_PATTERN, SOLID_PATTERN, or 0x00 through 0x12
            pattern_1.pattern = xlwt.Pattern.SOLID_PATTERN
            # 设置模式颜色 May be: 8 through 63. 0 = Black, 1 = White, 2 = Red, 3 = Green, 4 = Blue, 5 = Yellow, 6 = Magenta, 7 = Cyan, 16 = Maroon, 17 = Dark Green, 18 = Dark Blue, 19 = Dark Yellow , almost brown), 20 = Dark Magenta, 21 = Teal, 22 = Light Gray, 23 = Dark Gray, the list goes on...
            pattern_1.pattern_fore_colour = 40
            font_1 = xlwt.Font()
            font_1.name = '宋体'  # 或者换成外面传进来的参数，这样可以使一个函数定义所有style
            font_1.height = 320
            style_1 = xlwt.XFStyle()
            # 将模式加入到样式对象Add Pattern to Style
            style_1.pattern = pattern_1
            style_1.font = font_1
            style_2 = xlwt.XFStyle()

            # 创建模式对象
            pattern_2 = xlwt.Pattern()
            # NO_PATTERN, SOLID_PATTERN, or 0x00 through 0x12
            pattern_2.pattern = xlwt.Pattern.SOLID_PATTERN
            # 设置模式颜色 May be: 8 through 63. 0 = Black, 1 = White, 2 = Red, 3 = Green, 4 = Blue, 5 = Yellow, 6 = Magenta, 7 = Cyan, 16 = Maroon, 17 = Dark Green, 18 = Dark Blue, 19 = Dark Yellow , almost brown), 20 = Dark Magenta, 21 = Teal, 22 = Light Gray, 23 = Dark Gray, the list goes on...
            font_2 = xlwt.Font()
            font_2.name = '宋体'
            font_2.height = 320
            pattern_2.pattern_fore_colour = 43
            style_2.pattern = pattern_2
            style_2.font = font_2
            style_1.borders = border
            style_2.borders = border

            for template_col in template_cols:
                field = template_col[0]
                field_type = getFieldType(table_name, DBLinkID, field)
                # 如果字段不虚拟字段
                if field_type:
                    title = template_col[1]
                    isRequired = template_col[2]
                    fillingRequirements = template_col[3]
                    worksheet.write(0, count, field, style_1)
                    if isRequired:
                        title = title + '*'
                    if fillingRequirements:
                        title = title + '(' + fillingRequirements + ')'
                    worksheet.write(1, count, title, style_2)
                    worksheet.col(count).width = 10000
                    count = count + 1
            worksheet.row(0).height = 400
            worksheet.row(1).height = 400
            file_name = table_name + '.xls'
            # workbook.save('./file/'+file_name)
            workbook.save(out)
            out.seek(0)
            return send_file(out, as_attachment=True, mimetype='application/vnd.ms-excel',
                             attachment_filename=file_name)


def getAuth(req):
    sessionidd = getSessionidd()
    pageList = MainDB.ExecQuery("exec SYS_PageAuth '" + req + "','" + sessionidd + "'")
    logger.info(
        " | " + req + " | getAuth | " + "exec SYS_PageAuth '" + req + "','" + sessionidd + "'" + '  result:' + str(
            pageList[0][0]))
    return str(pageList[0][0])


# 获取值
def findValue(filterRules, key):
    if len(filterRules) > 0:
        for filterRule in filterRules:
            if filterRule['field'].upper() == key.upper():
                return filterRule['value']
    else:
        return ''


def getUserid(sessionidd):
    userid = ''
    reslist = MainDB.ExecQuery(
        "SELECT isnull([userid],'') FROM [Main].[dbo].[tbSessionRecord] where [sessionidd] = '" + sessionidd + "'")
    if (reslist != []):
        userid = reslist[0][0]
    return userid


def getSessionidd():
    sessionidd = request.cookies.get('sessionidd')
    if (sessionidd == None):
        sessionidd = "0"
    return sessionidd


api.add_resource(Home, '/')
api.add_resource(LoginPage, '/loginPage')
api.add_resource(Login, '/login/<string:type>')
api.add_resource(Index, '/imc/index/<string:page>')
api.add_resource(QueryData, '/imc/queryData')
api.add_resource(QueryOptions, '/imc/queryOptions')
api.add_resource(QueryDict, '/imc/queryDict')
api.add_resource(CustomOpt, '/imc/customOpt')
api.add_resource(Insert, '/imc/insert')
api.add_resource(Update, '/imc/update')
api.add_resource(DownLoad, '/imc/DownLoad')
api.add_resource(UpLoad, '/imc/UpLoad')

if __name__ == '__main__':
    # app.run(host='192.168.3.86',port=8080, threaded = True)

    hostname = socket.gethostname()
    ip = socket.gethostbyname(hostname)
    server = pywsgi.WSGIServer((ip, 8080), app)
    server.serve_forever()

    # http_server = HTTPServer(WSGIContainer(app))
    # http_server.listen(8080)
    # IOLoop.instance().start()
