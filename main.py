# -*- coding: utf-8 -*-
import base64
import platform
import time
import urllib.parse
from datetime import datetime
import sqlite3

import requests
from flask import Flask, render_template, make_response, redirect, request, send_file, url_for, send_from_directory, \
    Response
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
import uuid
from utils import UTILS

from urllib.parse import quote

logger.add("./logs/log.log", encoding="utf-8", rotation="5MB", retention="10 days",enqueue=True)

app = Flask(__name__, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
CORS(app, resources={r"/*": {"origins": "*"}})

loginObject = Login()
utools = UTILS()

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
        return app.send_static_file(page+'.html')


# 扫码委托页面
class GetScanCodeDelegation(Resource):
    def get(self):
        return app.send_static_file('scancode_delegation.html')

class Insert(Resource):
    def post(self):
        #ip = getIP()
        ip = ''
        args = parser.parse_args()
        gridNo = args['req']
        sessionidd = getSessionidd()
        reslist = MainDB.ExecQuery("SELECT isnull([serverName],''),isnull([databaseName],''),isnull([tableName],''),isnull([customInsertCode], ''),isnull([customInsertType], ''),DBLinkID,glueType,glueSource,replace(replace(replace(convert(varchar,customInsertGlueUpdatetime,120),'-',''),' ',''),':','') customInsertGlueUpdatetime FROM [Main].[dbo].[tbDataGrid] where gridNo = '" + gridNo + "'")
        serverName = str(reslist[0][0])
        args['serverName'] = serverName
        databaseName = str(reslist[0][1])
        args['databaseName'] = databaseName
        tableName = str(reslist[0][2])
        args['tableName'] = tableName
        customInsertCode = str(reslist[0][3])
        customInsertType = str(reslist[0][4])
        DBLinkID = str(reslist[0][5])
        args['DBLinkID'] = DBLinkID
        glueSource = str(reslist[0][7])
        customInsertGlueUpdatetime = reslist[0][8]
        # 获取当前界面的插入前处理函数
        get_before_insert_opt_sql = "select ID,procName, glueType, glueSource,replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime from [Main].[dbo].[tbDataToolbar] where optType = 'beforeInsert' and pid = '"+gridNo.replace('m', '').replace('Req', '')+"'"
        before_insert_opt_list = MainDB.ExecQuery(get_before_insert_opt_sql)
        args_data = ""
        # 若存在插入前操作
        if len(before_insert_opt_list) == 1:
            ID = str(before_insert_opt_list[0][0])
            procName = before_insert_opt_list[0][1]
            glueType = before_insert_opt_list[0][2]
            glueSource = before_insert_opt_list[0][3]
            glueUpdatetime = before_insert_opt_list[0][4]

            '''--------------------插入前操作------------------------'''
            if glueType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0]))[0]
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 1,"msg":"'+ msg +'","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif glueType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime, gridNo + '_' + ID + '_beforeInsert', 4,args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        '''----------------插入操作------------------'''
        # 判断是否有自定义插入代码
        if customInsertCode:
            if customInsertType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(customInsertType, customInsertCode, customInsertGlueUpdatetime,gridNo + '_customInsert', 3, args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                    else:
                        args_data = json.loads(args['data'])
                        args_data['primary_id'] = result['primary_id']
                except Exception as e:
                    logger.info(" | " + gridNo + " | customInsert | " +  str(e) )
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif customInsertType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0].encode('latin1').decode('gbk')))
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 1,"msg":"' + msg + '","data": {}}')
                    else:
                        args_data = json.loads(args['data'])
                        args_data['primary_id'] = result['primary_id']
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        else:
            try:
                reslist = MainDB.ExecQuery("select replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime,glueSource from [Main].[dbo].[tbDataGrid] where ID = '19'")
                glueUpdatetime = str(reslist[0][0])
                glueSource = str(reslist[0][1])
                result = utools.buildAndRunCode('GLUE_Python', glueSource, glueUpdatetime, 'm19Req',2, args)
                next_opt = result['next_opt']
                msg = result['msg']
                if next_opt == 'end':
                    return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                else:
                    args_data = json.loads(args['data'])
                    args_data['primary_id'] = str(result['primary_id'])
            except Exception as e:
                return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        '''---------------------插入后操作-----------------------'''
        # 判断是否有插入后操作
        get_after_insert_opt_sql = "select ID,procName, glueType, glueSource,replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime from [Main].[dbo].[tbDataToolbar] where optType = 'afterInsert' and pid = '" + gridNo.replace(
            'm', '').replace('Req', '') + "'"
        after_insert_opt_list = MainDB.ExecQuery(get_after_insert_opt_sql)
        if len(after_insert_opt_list) == 1:
            ID = str(after_insert_opt_list[0][0])
            procName = after_insert_opt_list[0][1]
            glueType = after_insert_opt_list[0][2]
            glueSource = after_insert_opt_list[0][3]
            glueUpdatetime = after_insert_opt_list[0][4]
            if glueType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + json.dumps(args_data) + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0]))
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    # 无下一步，直接返回
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"'+ msg +'","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif glueType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime,gridNo + '_' + ID + '_afterInsert', 4, args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')


class Update(Resource):
    def post(self):
        #ip = getIP()
        ip = ''
        args = parser.parse_args()
        gridNo = args['req']
        sessionidd = getSessionidd()
        reslist = MainDB.ExecQuery("SELECT isnull([serverName],''),isnull([databaseName],''),isnull([tableName],''),isnull([customUpdateCode], ''),isnull([customUpdateType], ''),DBLinkID,glueType,glueSource,replace(replace(replace(convert(varchar,customUpdateGlueUpdatetime,120),'-',''),' ',''),':','') customUpdateGlueUpdatetime FROM [Main].[dbo].[tbDataGrid] where gridNo = '" + gridNo + "'")
        serverName = str(reslist[0][0])
        args['serverName'] = serverName
        databaseName = str(reslist[0][1])
        args['databaseName'] = databaseName
        tableName = str(reslist[0][2])
        args['tableName'] = tableName
        customUpdateCode = str(reslist[0][3])
        customUpdateType = str(reslist[0][4])
        DBLinkID = str(reslist[0][5])
        args['DBLinkID'] = DBLinkID
        glueSource = str(reslist[0][7])
        customUpdateGlueUpdatetime = reslist[0][8]
        # 获取当前界面的更新前处理函数
        get_before_update_opt_sql = "select ID,procName, glueType, glueSource,replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime from [Main].[dbo].[tbDataToolbar] where optType = 'beforeUpdate' and pid = '"+gridNo.replace('m', '').replace('Req', '')+"'"
        before_update_opt_list = MainDB.ExecQuery(get_before_update_opt_sql)
        # 若存在更新前操作
        if len(before_update_opt_list) == 1:
            ID = str(before_update_opt_list[0][0])
            procName = before_update_opt_list[0][1]
            glueType = before_update_opt_list[0][2]
            glueSource = before_update_opt_list[0][3]
            glueUpdatetime = before_update_opt_list[0][4]

            '''--------------------更新前操作------------------------'''
            if glueType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0]))[0]
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    # 无下一步，直接返回
                    if next_opt == 'end':
                        return json.loads('{"status": 1,"msg":"'+ msg +'","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif glueType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime,gridNo + '_' + ID + '_beforeUpdate', 4, args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        '''----------------更新操作------------------'''
        # 判断是否有自定义更新代码
        if customUpdateCode:
            if customUpdateType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(customUpdateType, customUpdateCode, customUpdateGlueUpdatetime,gridNo + '_customUpdate', 3, args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif customUpdateType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0].encode('latin1').decode('gbk')))
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 1,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        else:
            try:
                reslist = MainDB.ExecQuery("select replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime,glueSource from [Main].[dbo].[tbDataGrid] where ID = '20'")
                glueUpdatetime = str(reslist[0][0])
                glueSource = str(reslist[0][1])
                result = utools.buildAndRunCode('GLUE_Python', glueSource, glueUpdatetime, 'm20Req', 2, args)
                next_opt = result['next_opt']
                msg = result['msg']
                if next_opt == 'end':
                    return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
            except Exception as e:
                return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
        '''---------------------插入后操作-----------------------'''
        # 判断是否有更新后操作
        get_after_update_opt_sql = "select ID,procName, glueType, glueSource,replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime from [Main].[dbo].[tbDataToolbar] where optType = 'afterUpdate' and pid = '" + gridNo.replace(
            'm', '').replace('Req', '') + "'"
        after_update_opt_list = MainDB.ExecQuery(get_after_update_opt_sql)
        if len(after_update_opt_list) == 1:
            ID = str(after_update_opt_list[0][0])
            procName = after_update_opt_list[0][1]
            glueType = after_update_opt_list[0][2]
            glueSource = after_update_opt_list[0][3]
            glueUpdatetime = after_update_opt_list[0][4]
            if glueType == 'GLUE_StoreProcedure':
                sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
                routeDB = DBROUTE(DBLinkID)
                try:
                    reslist = routeDB.ExecQuery(sql)
                    res_dir = json.loads(str(reslist[0][0]))[0]
                    next_opt = res_dir['next_opt']
                    msg = res_dir['msg']
                    # 无下一步，直接返回
                    if next_opt == 'end':
                        return json.loads('{"status": 1,"msg":"'+ msg +'","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')
            elif glueType == 'GLUE_Python':
                try:
                    result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime,gridNo + '_' + ID + '_afterUpdate', 4, args['data'])
                    next_opt = result['next_opt']
                    msg = result['msg']
                    if next_opt == 'end':
                        return json.loads('{"status": 0,"msg":"' + msg + '","data": {}}')
                except Exception as e:
                    return json.loads('{"status": 1,"msg":"系统异常！","data": {}}')

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
        procList = MainDB.ExecQuery("SELECT [procName],[length],[DBLinkID],[DBType],glueType,glueSource,replace(replace(replace(convert(varchar,glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime,ID FROM [dbo].[tbDataDictsConfig] where [code] = '" + args['code'] + "'")
        if procList[0][4] == 'GLUE_StoreProcedure':
            if (args['q'] == None):
                length = 0
                q = ''
            else:
                length = len(args['q'])
                q = args['q']
            if (length >= int(procList[0][1])):
                routeDB = DBROUTE(procList[0][2])
                logger.info(" | " + args['code'] + " | QueryDict | " + "exec " + procList[0][0] + " '" + args['code'] + "','" + q + "','"+sessionidd+"'")
                reslist = routeDB.ExecQuery("exec " + procList[0][0] + " '" + args['code'] + "','" + q + "','"+sessionidd+"'")
                if (reslist != []):
                    if reslist[0][0]:
                        return json.loads(reslist[0][0])
                    else:
                        return json.loads('{"label":"","value":""}')
                else:
                    return json.loads('{"label":"","value":""}')
            else:
                return json.loads('{"label":"","value":""}')
        elif procList[0][4] == 'GLUE_Python':
            ID = str(procList[0][7])
            glueUpdatetime = procList[0][6]
            glueSource = procList[0][5]
            glueType = procList[0][4]
            try:
                pyfile = 'Dict'+ '_' + ID
                result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime, pyfile, 3, args)
                return result
            except Exception as e:
                return json.loads('{"status": 1,"msg":"' + str(e) + '","data": {}}')

class CustomOpt(Resource):
    def post(self):
        sessionidd = getSessionidd()
        args = parser.parse_args()
        reslist = MainDB.ExecQuery("SELECT b.DBlinkID,a.glueType,a.procName,a.glueSource,replace(replace(replace(convert(varchar,a.glueUpdatetime,120),'-',''),' ',''),':','') glueUpdatetime,b.gridNo FROM [Main].[dbo].[tbDataToolbar] a left join [Main].[dbo].[tbDataGrid] b on a.pid=b.ID  where a.ID = '" + args['req'] + "'")

        DBlinkID = str(reslist[0][0])
        glueType = str(reslist[0][1])
        procName = reslist[0][2]
        glueSource = str(reslist[0][3])
        glueUpdatetime = str(reslist[0][4])
        gridNo = str(reslist[0][5])
        if glueType == 'GLUE_StoreProcedure':
            sql = "exec dbo.[" + procName + "] '" + args['data'] + "','" + sessionidd + "'"
            logger.info(" | "+gridNo+" | CustomOpt | "+sql)
            routeDB = DBROUTE(DBlinkID)
            try:
                reslist = routeDB.ExecQuery(sql)
                logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 0,"msg":"' + str(reslist[0][0]) + '","data": {}}')
                return json.loads('{"status": 0,"msg":"' + str(reslist[0][0]) + '","data": {}}')
            except Exception as e:
                logger.exception(" | " + gridNo + " | CustomOpt | " + '{"status": 1,"msg":"'+str(e)+'","data": {}}')
                return json.loads('{"status": 1,"msg":"'+str(e)+'","data": {}}')
        if glueType == 'GLUE_Python':
            try:
                pyfile = gridNo + '_' + args['req'] + '_' + glueUpdatetime
                logger.info(" | " + gridNo + " | CustomOpt | " + pyfile+ '.py'+" "+args['data'])
                result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime, gridNo + '_' + args['req'], 3, args['data'])

                if type(result) == str:
                    logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 0,"msg":"' + result + '","data": {}}')
                    return json.loads('{"status": 0,"msg":"' + result + '","data": {}}')
                elif type(result) == dict:
                    logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 0,"msg":"' + json.dumps(result,ensure_ascii=False) + '","data": {}}')
                    return json.loads('{"status": 0,"msg":"","data": ' + json.dumps(result, ensure_ascii=False) + '}')
            except Exception as e:
                logger.info(" | " + gridNo + " | CustomOpt | " + '{"status": 1,"msg":"' + str(e) + '","data": {}}')
                return json.loads('{"status": 1,"msg":"' + str(e) + '","data": {}}')

class QueryData(Resource):
    def post(self):
        ip=""
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
                    resList = MainDB.ExecQuery("SELECT isnull([sortName],'') sortName,isnull([sortOrder],'') sortOrder FROM [Main].[dbo].[tbDataGrid] where gridNo = '"+req+"'")
                    sort = resList[0][0]
                    order = resList[0][1]
                sortArray = sort.split(',')
                orderArray = order.split(',')
                for i in range(0, len(sortArray)):
                    orderBy += sortArray[i] + ' ' + orderArray[i] + ','

                if filterRules is None or filterRules == '':
                    filterRules = "[]"

                reslist = MainDB.ExecQuery("SELECT ID,DBlinkID,glueType,[procDataName],glueSource,replace(replace(replace(convert(varchar,[glueUpdatetime],120),'-',''),' ',''),':','') glueUpdatetime FROM [dbo].[tbDataGrid] where gridNo = '" + args['req'] + "'")

                DBlinkID = str(reslist[0][1])
                glueType = str(reslist[0][2])
                procDataName =  reslist[0][3]
                glueSource = str(reslist[0][4])
                glueUpdatetime = str(reslist[0][5])

                if glueType=='GLUE_StoreProcedure':
                    if not (pid == ''):
                        pidFilter = "{''field'':''pid'',''op'':''equal'',''value'':''" + pid + "''}"
                        if not (filterRules == "[]"):
                            filterRules = filterRules[:-1] + ',' + pidFilter + ']'
                        else:
                            filterRules = '[' + pidFilter + ']'
                    condition = '{"orderBy":"' + orderBy[:-1] + '","rows":"' + rows + '","page":"' + page + '","filterRules":"' + filterRules.replace("\"", "''") + '","sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'

                    logger.info(" | "+req+" | queryData | "+"exec [" + procDataName + "] '" + condition + "'")
                    routeDB = DBROUTE(DBlinkID)
                    reslist = routeDB.ExecQuery("exec [" + procDataName + "] '" + condition + "'")
                    #MainDB.ExecNonQuery("insert into dbo.[tbLog] (IP,操作,记录ID,请求代号,数据,sessionidd,时间) values ('" + ip + "','查询','0','" + args['req'] + "','" + condition + "','" + getSessionidd() + "',getdate())")
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
                    condition = '{"orderBy":"' + orderBy[:-1] + '","rows":"' + rows + '","page":"' + page + '","filterRules":' + filterRules + ',"sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'
                    logger.info(" | " + req + " | queryData | " + req + '_' + glueUpdatetime + '.py' + ' ' + condition)
                    result = utools.buildAndRunCode(glueType,glueSource,glueUpdatetime,req,2,condition)
                    if (result == None):
                        return json.loads('{"total":"0","rows":[]}')
                    else:
                        return json.loads(result)
            else:
                return json.loads('{"status": 1,"msg":"无权限，请重新登录。","data": {}}')
        except Exception as e:
            logger.exception(" | "+req+" | queryData | "+str(e))
            
class QueryDataAll(Resource):
    def post(self, req):
        contentType = request.headers['CONTENT_TYPE']
        page = '1'
        # 默认一千万行数据
        rows = '10000000'
        pid = ''
        sort = ''
        order = ''
        filterRules = ''
        if contentType.find('multipart/form-data') > -1:
            args = parser.parse_args()
            page = args['page'] if 'page' in args else page
            rows = args['rows'] if 'rows' in args else rows
            pid = args['pid'] if 'pid' in args else pid
            sort = args['sort'] if 'sort' in args else sort
            order = args['order'] if 'order' in args else order
            if not req:
                if 'req' in args:
                    req = args['req']
                else:
                    req = ''
            filterRules = args['filterRules'] if 'filterRules' in args else filterRules
        if contentType.find('application/json') > -1:
            args = request.json
            page = args['page'] if 'page' in args else page
            rows = args['rows'] if 'rows' in args else rows
            pid = args['pid'] if 'pid' in args else pid
            sort = args['sort'] if 'sort' in args else sort
            order = args['order'] if 'order' in args else order
            if not req:
                if 'req' in args:
                    req = args['req']
                else:
                    req = ''
            filterRules = args['filterRules'] if 'filterRules' in args else filterRules
        try:
            if (getAuth(req) == "1"):
                orderBy = ''
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
                    req + "'")

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

                    # logger.info(" | "+req+" | queryData | "+"exec [" + procDataName + "] '" + condition + "'")
                    
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
                    # logger.info(" | " + req + " | queryData | " + req + '_' + glueUpdatetime + '.py' + ' ' + condition)
                
                    # custom('sysLog')
                    result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime, req, 2, condition)
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

class LoginByEDIToken(Resource):
    def get(self):
        token = request.args['token']
        id = request.args['id']
        # 根据token请求蓝凌接口获取工资编号
        returnData = json.loads(requests.post(url=f'http://192.168.1.23/api/sys-authentication/loginService/getTokenLoginName?token={token}', headers={}, data={}).text)
        result = returnData['result']
        jsCode =''
        if result:
            loginName = returnData['loginName']
            #判断loginName对应的账号，是否有id节点对应的功能界面权限，如果没有则返回404页面
            sql = "SELECT 1 FROM [Main].[dbo].[tbGroupUser] a left join [Main].[dbo].[tbGroupAuth] b on a.pid = b.pid where userid = '"+loginName+"' and b.funID = '"+str(id)+"'"
            reslist = MainDB.ExecQuery(sql)
            if reslist ==[] and str(id) !='0':
                return app.send_static_file('404.html')

            sessionId = loginObject.login(loginName, '', 'token')
            jsCode = '''
            <script>
            function setCookie(name, value, days) {{
                var expires = "";
                if (days) {{
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = "; expires=" + date.toUTCString();
                }}
                document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
            }}

            // 调用 setCookie 函数设置 Cookie 值
            setCookie("sessionidd", "{sessionId}", 15);
            setCookie("funid", "{funid}", 15);
            window.location.href = "/";
            </script>
            '''.format(sessionId=sessionId,funid=id)
        else:
            jsCode = '''
                        <script>
                        alert('令牌失效')
                        </script>
                        '''
        response = make_response(render_template('sso.html', js_code=jsCode))
        response.headers = {"Content-type": "text/html"}
        return response

# 获取字段的类型
def getFieldType(tableName,DBLinkID,field):
    routeDB = DBROUTE(DBLinkID)
    sql = ''
    result_list = []
    if routeDB.dbcon.serverName == 'SQLSERVER':
        sql = "SELECT  c.DATA_TYPE FROM (SELECT * FROM SYS.OBJECTS WHERE TYPE = 'U') o LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON o.NAME = c.TABLE_NAME LEFT JOIN SYS.EXTENDED_PROPERTIES ep ON o.OBJECT_ID = ep.MAJOR_ID WHERE o.NAME = '"+tableName+"' and c.COLUMN_NAME = '"+field+"'"
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
            return value.replace('-','').isdigit()
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



class UpLoadAttachments(Resource):
    # 上传附件 /imc/UpLoadAttachments
    def post(self):
        logger.info(" | UpLoadAttachments | ")
        args = parser.parse_args()
        self.filterRules = json.loads(args['filterRules'])
        # 表id
        self.table_id = findValue(self.filterRules, 'table_id')
        # 数据id
        self.row_id = findValue(self.filterRules, 'row_id')
        # 上传类型ID
        self.uploadTypeID = findValue(self.filterRules, 'uploadType')
        # 文件流
        self.file = request.files['file'].stream.read()
        # 文件名称
        self.file_name = request.files['file'].filename
        # 文件后缀
        self.suffix = self.file_name.split('.')[len(self.file_name.split('.'))-1]
        self.db = DBROUTE(1)
        return self.uploadFile()
    # 上传附件
    def uploadFile(self):
        logger.info(" | UpLoadAttachments ---------------uploadFile| ")
        # 附件存放路径
        self.path = ''
        # 附件上传类别描述
        remark = ''
        # 如果选择了上传方案走上传方案里的代码 如果没有则走默认逻辑
        if self.uploadTypeID:
            # 获取附件映射信息
            select_mapping_info_sql = "SELECT [glueType],[glueSource],replace(replace(replace(convert(varchar,glueSourceUpdateTime,120),'-',''),' ',''),':','') [glueSourceUpdateTime],[path],[remark] FROM [Main].[dbo].[tbAttachmentConfig] where ID = '"+self.uploadTypeID+"'"
            mapping_info = self.db.ExecQuery(select_mapping_info_sql)
            # 代码类型
            glueType = mapping_info[0][0]
            # 代码
            glueSource = mapping_info[0][1]
            # 代码更新时间
            glueSourceUpdateTime = mapping_info[0][2]
            # 附件存放路径
            self.path = mapping_info[0][3]
            # 附件上传类别描述
            remark = mapping_info[0][4]
            if glueSource:
                if glueType == 'GLUE_Python':
                    logger.info(" | UpLoadAttachments ---------------uploadFile---------------------glueSource| ")
                    condition = {'table_id': self.table_id, 'row_id': self.row_id, 'file': self.file, 'filename': self.file_name, 'suffix': self.suffix, 'path': self.path, 'filterRules': self.filterRules}
                    try:
                        result = utools.buildAndRunCode(glueType, glueSource, glueSourceUpdateTime,
                                                        'm' + self.table_id + 'Req_Upload_' + self.uploadTypeID, 4,
                                                        condition)
                        logger.info(
                            " | UpLoadAttachments ---------------uploadFile---------------------glueSource------------resresult| ")
                        return result
                    except Exception as e:
                        logger.info(
                            " | UpLoadAttachments ---------------uploadFile---------------------glueSource------------Exception| ")
        else:
            # 没选方案但是有方案时，不允许上传附件
            select_uploadType_count_sql = "select count(*) count from [Main].[dbo].[tbAttachmentConfig] where pid = '" + self.table_id + "'"
            if self.db.ExecQuery(select_uploadType_count_sql)[0][0] > 0:
                return {
                    "status": 1,
                    "msg": '上传附件失败，请选择上传方式。'
                }
            else:
                self.defaultUploadAttachmentFunc()
    # 默认附件上传逻辑
    def defaultUploadAttachmentFunc(self):
        self.generalPath()
        self.creatFolder()
        uuidid = str(uuid.uuid1())
        temp_filename = uuidid + '.' + self.suffix
        full_path = self.path + '/' + temp_filename
        with open(full_path, 'wb') as file:
            file.write(self.file)
        uploadPerson = getUserid(getSessionidd())
        # 插入附件上传日志表
        insert_sql = "insert into [Main].[dbo].[tbAttachmentLog](uuid,tableId,rowId,fileName,path,suffix,uploadPerson,uploadTime) values('"+uuidid+"','"+self.table_id+"','"+self.row_id+"','"+self.file_name+"','"+self.path+"','"+self.suffix+"','"+uploadPerson+"',getdate())"
        self.db.ExecNonQuery(insert_sql)
        return {
            "status": 0,
            "msg": '上传附件成功。'
        }
    # 拼接路径
    def generalPath(self):
        if not self.path:
            self.path = 'attachment'
            if self.table_id:
                self.path = self.path + '/' +self.table_id
            if self.row_id:
                self.path = self.path + '/' + self.row_id
        else:
            self.path = 'attachment/' + self.path
    # 创建文件夹
    def creatFolder(self):
        # 判断文件路劲是否存在
        if not os.path.exists(self.path):
            os.makedirs(self.path)

#获取当前数据行的所有附件
class getAttachments(Resource):
    def post(self):
        args = parser.parse_args()
        userid = str(getUserid(getSessionidd()))
        page = int(args['page'])
        pageSize = int(args['rows'])
        filterRules = json.loads(args['filterRules'])
        # 表id
        table_id = findValue(filterRules, 'table_id')
        # 数据行id
        row_id = findValue(filterRules, 'row_id')
        # 总附件数
        total = 0
        db = DBROUTE(1)
        uploadBtnPosition = db.ExecQuery("select uploadBtnPosition from tbDataGrid where id = '" + table_id + "'")[0][0]
        sql = ''
        if uploadBtnPosition == 'optColumn':
            sql = "select fileName, uploadPerson, CONVERT(varchar(100), uploadtime, 20) uploadTime,uuid,[path],suffix from [Main].[dbo].[tbAttachmentLog] where tableId  = '" + table_id + "' and rowid = '"+row_id+"'"
        elif uploadBtnPosition == 'top':
            sql = "select fileName, uploadPerson, CONVERT(varchar(100), uploadtime, 20) uploadTime,uuid,[path],suffix from [Main].[dbo].[tbAttachmentLog] where tableId  = '" + table_id + "' and rowid = '-1'"
        results = db.ExecQuery(sql)
        total = len(results)
        rows = results[pageSize * (page - 1): pageSize * page]
        return_row = []
        for row in rows:
            item = {}
            fileName = row[0]
            uploadPerson = row[1]
            uploadTime = row[2]
            uuid = row[3]
            path = row[4]
            suffix = row[5]
            downloadUrl = "https://www.shtggroup.com/imc/downloadAttachments?fileName=" + urllib.parse.quote(
                fileName) + '&filePath=' + path + '/' + uuid + '.' + suffix
            download = '<a href=\"/imc/downloadAttachments?fileName=' + urllib.parse.quote(
                fileName) + '&filePath=' + path + '/' + uuid + '.' + suffix + '\" target=\"_blank\">下载</a>'
            item = {'fileName': fileName, 'uploadPerson': uploadPerson, 'uploadTime': uploadTime, 'download': download,'uuid': uuid, 'downloadUrl': downloadUrl}
            return_row.append(item)
        result = {'total': total, 'rows': return_row}
        return result

class downLoadAttachment(Resource):
    def get(self):
        full_path = request.full_path
        self.filePath = ''
        self.fileName = ''
        param_list = full_path.split('?')[1].split('&')
        for param in param_list:
            if param.split('=')[0] == 'filePath':
                self.filePath = param.split('=')[1]
            if param.split('=')[0] == 'fileName':
                self.fileName = param.split('=')[1]
        if (platform.system() == 'Windows'):
            self.filePath = self.filePath.replace('/', '\\')
        return send_file(self.filePath, as_attachment=True, attachment_filename=self.fileName)
# 删除附件
class delAttachments(Resource):
    def post(self):
        args = parser.parse_args()
        userid = str(getUserid(getSessionidd()))
        filterRules = json.loads(args['filterRules'])
        # 附件的uuid
        uuid = findValue(filterRules, 'uuid')
        db = DBROUTE(1)
        sql = "select path+'/'+uuid+'.'+suffix  FROM [Main].[dbo].[tbAttachmentLog] where uuid = '"+uuid+"' and uploadPerson = '"+userid+"' "
        filePath = db.ExecQuery(sql)[0][0]
        if filePath:
            if (platform.system() == 'Windows'):
                os.remove(filePath.replace('/', '\\'))
            elif(platform.system() == 'Linux'):
                os.remove(filePath)
            db.ExecNonQuery("delete from [Main].[dbo].[tbAttachmentLog] where uuid = '"+uuid+"' and uploadPerson = '"+userid+"'")
            return json.loads('{"status": 0,"msg":"删除附件成功","data": {}}')
        else:
            return json.loads('{"status": 1,"msg":"删除附件失败","data": {}}')


class ExportExcel(Resource):
    # 生成excel下载模板
    def post(self):
        args = parser.parse_args()

        data = json.loads(args['data'])
        ID = data['downLoadTypeID']
        tableId = str(data['tableId'])
        if ID:
            filterRules = json.loads(args['filterRules'])
            rowId = ''
            if 'rowId' in data:
                rowId = data['rowId']
            select_mapping_info_sql = "SELECT [glueType],[glueSource],replace(replace(replace(convert(varchar,glueSourceUpdateTime,120),'-',''),' ',''),':','') [glueSourceUpdateTime],[path],[remark],[pid] FROM [Main].[dbo].[tbAttachmentConfig] where ID = '" + ID + "'"
            mapping_info = DBROUTE(1).ExecQuery(select_mapping_info_sql)
            # 代码类型
            glueType = mapping_info[0][0]
            # 代码
            glueSource = mapping_info[0][1]
            # 代码更新时间
            glueSourceUpdateTime = mapping_info[0][2]
            # 附件上传类别描述
            remark = mapping_info[0][4]
            pid = str(mapping_info[0][5])
            if glueSource:
                if glueType == 'GLUE_Python':
                    condition = {'ID': ID, 'pid': pid, 'rowId': rowId, 'filterRules': filterRules, 'sessionId': getSessionidd()}
                    return utools.buildAndRunCode(glueType, glueSource, glueSourceUpdateTime,
                                                    'm' + pid + 'Req_DownLoad_' + ID, 4, condition)
        else:
            filterRules = args['filterRules']
            select_count_sql = "SELECT count(*) FROM [Main].[dbo].[tbAttachmentConfig] where ID = '" + ID + "'"
            count = DBROUTE(1).ExecQuery(select_count_sql)[0][0]
            if count == 0:
                """
                    默认导出逻辑只支持导出按钮在顶部时
                    主表：直接导出数据
                    子表：根据pid导出数据
                """
                resultData = ''
                # 根据tableId导出全部信息
                req = 'm'+tableId+'Req'
                reslist = MainDB.ExecQuery(
                    "SELECT ID,DBlinkID,glueType,[procDataName],glueSource,replace(replace(replace(convert(varchar,[glueUpdatetime],120),'-',''),' ',''),':','') glueUpdatetime, pid,sortName,sortOrder,tableName,exportBtnPosition FROM [dbo].[tbDataGrid] where gridNo = '" +
                    req + "'")

                DBlinkID = str(reslist[0][1])
                glueType = str(reslist[0][2])
                procDataName = reslist[0][3]
                glueSource = str(reslist[0][4])
                glueUpdatetime = str(reslist[0][5])
                exportBtnPosition = str(reslist[0][10])
                if exportBtnPosition == 'top':
                    tablePid = reslist[0][6] if reslist[0][6] else ''
                    if not tablePid:
                        pid = ''
                    else:
                        if 'pid' in data:
                            pid = data['pid']
                    tableName = str(reslist[0][9])
                    orderBy = 'ID asc'
                    page = '1'
                    rows = '99999999'
                    if glueType == 'GLUE_StoreProcedure':
                        if not (pid == ''):
                            pidFilter = "{''field'':''pid'',''op'':''equal'',''value'':''" + pid + "''}"
                            if not (filterRules == "[]"):
                                filterRules = filterRules[:-1] + ',' + pidFilter + ']'
                            else:
                                filterRules = '[' + pidFilter + ']'
                        condition = '{"orderBy":"' + orderBy + '","rows":"' + rows + '","page":"' + page + '","filterRules":"' + filterRules.replace(
                            "\"", "''") + '","sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'
                        logger.info(" | " + req + " | queryData | " + "exec [" + procDataName + "] '" + condition + "'")
                        routeDB = DBROUTE(DBlinkID)
                        reslist = routeDB.ExecQuery("exec [" + procDataName + "] '" + condition + "'")
                        if (reslist[0][0] == None):
                            resultData = json.loads('{"total":"0","rows":[]}')
                        else:
                            resultData = json.loads(reslist[0][0])
                    if glueType == 'GLUE_Python':
                        if not (pid == ''):
                            pidFilter = "{\"field\":\"pid\",\"op\":\"equal\",\"value\":\"" + pid + "\"}"
                            if not (filterRules == "[]"):
                                filterRules = filterRules[:-1] + ',' + pidFilter + ']'
                            else:
                                filterRules = '[' + pidFilter + ']'
                        condition = '{"orderBy":"' + orderBy + '","rows":"' + rows + '","page":"' + page + '","filterRules":' + filterRules + ',"sessionidd":"' + getSessionidd() + '","DBlinkID":"' + DBlinkID + '"}'
                        logger.info(" | " + req + " | queryData | " + req + '_' + glueUpdatetime + '.py' + ' ' + condition)
                        result = utools.buildAndRunCode(glueType, glueSource, glueUpdatetime, req, 2, condition)
                        if (result == None):
                            resultData = json.loads('{"total":"0","rows":[]}')
                        else:
                            resultData = json.loads(result)
                    total = resultData['total']
                    rows = resultData['rows']
                    if int(total) >0:
                        #获取字典的key作为excel列名
                        colName = list(rows[0].keys())
                        out = BytesIO()
                        # 获取表中能导出的列信息
                        # 创建一个workbook并设置编码
                        workbook = xlwt.Workbook()
                        # 下载导入Excel模板设备码模板
                        sheet_list = ['导出信息']
                        for sheet in sheet_list:
                            # 添加sheet
                            worksheet = workbook.add_sheet(sheet)
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

                            for i in range(len(colName)):
                                col = colName[i]
                                worksheet.write(0, i, col)
                            for i in range(len(rows)):
                                row = rows[i]
                                valueList = list(row.values())
                                for j in range(len(valueList)):
                                    value = valueList[j]
                                    worksheet.write(i+1, j, value)
                        file_name = tableName + '.xls'
                        workbook.save(out)
                        out.seek(0)
                        return send_file(out, as_attachment=True, mimetype='application/vnd.ms-excel',
                                         attachment_filename=quote(file_name))
                    else:
                        return json.loads('{"status": 1,"msg":"导出按钮位置为顶部时，支持默认导出逻辑。","data": {}}')
            else:
                return json.loads('{"status": 1,"msg":"请选择导出方式","data": {}}')

def getAuth(req):
    sessionidd = getSessionidd()
    pageList = MainDB.ExecQuery("exec SYS_PageAuth '" + req + "','" + sessionidd + "'")
    logger.info(" | " + req+ " | getAuth | " + "exec SYS_PageAuth '" + req + "','" + sessionidd + "'"+'  result:'+str(pageList[0][0]))
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
    reslist = MainDB.ExecQuery("SELECT isnull([userid],'') FROM [Main].[dbo].[tbSessionRecord] where [sessionidd] = '" + sessionidd + "'")
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
api.add_resource(LoginByEDIToken, '/loginByEDIToken')
api.add_resource(Index,'/imc/index/<string:page>')
api.add_resource(QueryData, '/imc/queryData')
api.add_resource(QueryDataAll, '/imc/queryDataAll/<string:req>')
api.add_resource(QueryOptions, '/imc/queryOptions')
api.add_resource(QueryDict, '/imc/queryDict')
api.add_resource(CustomOpt, '/imc/customOpt')
api.add_resource(Insert, '/imc/insert')
api.add_resource(Update, '/imc/update')
api.add_resource(ExportExcel, '/imc/export')
api.add_resource(UpLoadAttachments, '/imc/uploadAttachments')
api.add_resource(downLoadAttachment, '/imc/downloadAttachments')
api.add_resource(delAttachments, '/imc/delAttachments')
api.add_resource(getAttachments, '/imc/getAttachments')

if __name__ == '__main__':
    #app.run(host='192.168.3.86',port=8080, threaded = True)

    hostname = socket.gethostname()
    ip = socket.gethostbyname(hostname)
    server = pywsgi.WSGIServer((ip, 8080), app)
    server.serve_forever()

    # http_server = HTTPServer(WSGIContainer(app))
    # http_server.listen(8080)
    # IOLoop.instance().start()
