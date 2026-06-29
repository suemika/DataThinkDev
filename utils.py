# -*- coding:utf-8 -*-
import json
import time
import urllib.request
import ssl
from datetime import datetime, timedelta

import pika
import requests

from dbroute import DBROUTE
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.auth.credentials import AccessKeyCredential
from aliyunsdkdysmsapi.request.v20170525.SendSmsRequest import SendSmsRequest
from loguru import logger
import os
import shutil
import importlib
from collections import defaultdict

logger.add("../logs/log.log", encoding="utf-8", rotation="5MB", retention="10 days",enqueue=True)

class UTILS:

    # 根据code向微信获取一卡通openid
    def getYKTOpenId(self, code):
        if (code==''):
            return ''
        context = ssl._create_unverified_context()
        APPID = 'wxdfa68f94866f5812'
        SECRET = '75118411d4bc17a6d7d8830c2683b39b'
        url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + APPID + "&secret=" + SECRET + "&js_code=" + code + "&grant_type=authorization_code"
        req = urllib.request.Request(url)
        res_data = urllib.request.urlopen(req, context=context)
        res = res_data.read()
        data = json.loads(res)
        openid = data['openid']
        return openid

    # 根据code向微信获取石特通openid
    def getSTTOpenId(self, code):
        if (code==''):
            return ''
        context = ssl._create_unverified_context()
        APPID = 'wx3f1dbeb7ae8d5a6a'
        SECRET = 'a1dd51e8ba3ae97aaae9598ebb08fb6f'
        url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + APPID + "&secret=" + SECRET + "&js_code=" + code + "&grant_type=authorization_code"
        req = urllib.request.Request(url)
        res_data = urllib.request.urlopen(req, context=context)
        res = res_data.read()
        data = json.loads(res)
        openid = data['openid']
        return openid

    # 发送阿里云短信
    def sendSMS(self,PhoneNumbers,SignName,TemplateCode,parms):
        credentials = AccessKeyCredential('LTAI6UAKmrJWDQor', 'RgAAzme7vWXeFECC1uAVHcTR1kl72A')
        client = AcsClient(region_id='cn-qingdao', credential=credentials)

        request = SendSmsRequest()
        request.set_accept_format('json')

        request.set_PhoneNumbers(PhoneNumbers)
        request.set_SignName(SignName)
        request.set_TemplateCode(TemplateCode)
        request.add_query_param("TemplateParam", parms)
        response = client.do_action_with_exception(request)
        print(str(response, encoding='utf-8'))
        return str(response, encoding='utf-8')

    #记录日志
    def logger(self, msg):
        connection = self.getMQConnection(1)
        # 2. 创建一个channel
        channel = connection.channel()
        # 3. 创建队列，queue_declare可以使用任意次数，
        # 如果指定的queue不存在，则会创建一个queue，如果已经存在，
        # 则不会做其他动作，官方推荐，每次使用时都可以加上这句
        channel.queue_declare(queue='logs_queue')
        # 4. 发布消息
        channel.basic_publish(
            exchange='',  # RabbitMQ中所有的消息都要先通过交换机，空字符串表示使用默认的交换机
            routing_key='logs_queue',  # 指定消息要发送到哪个queue
            body=msg)  # 消息的内容
        # 5. 关闭连接
        connection.close()

    '''
    用途：生成gluesource文件
    glueSource：源码
    glueUpdatetime：代码更新时间
    prefix：文件前缀
    length：文件名中的下划线数量
    
    代码逻辑：
     1、根据功能画面ID_代码更新时间戳拼接成文件名
     2、根据文件名去固定目录查找文件
     3、能查到，代表是最新代码，直接执行
     4、查不到，（1）代码从没生成过（2）代码修改过
     a、根据功能画面req_, 去检索目录下面是否有此前缀的文件，如果有则移动至源码备份文件夹
     b、以最新文件名下载代码，执行
    '''
    def buildAndRunCode(self,glueType,glueSource,glueUpdatetime,prefix,length,jsonParams):
        if glueType == 'GLUE_Python':
            pyfile = prefix + '_' + glueUpdatetime
            if not os.path.exists('./gluesource/' + pyfile + '.py'):
                for fileName in os.listdir('./gluesource/'):
                    if (fileName.startswith(prefix + '_') and len(fileName.split('_')) == length):
                        if os.path.exists('./sourcebak/' + fileName):
                            os.remove(os.path.join('./sourcebak/', fileName))
                        shutil.move(os.path.join('./gluesource/', fileName),os.path.join('./sourcebak/'))
                with open('./gluesource/' + pyfile + '.py', 'w', encoding='utf-8') as file:
                    file.write(glueSource.replace('\r\n', '\n'))
            glueClass = importlib.import_module('gluesource.' + pyfile)
            glueClass = importlib.reload(glueClass)
            obj = glueClass.Servlet(jsonParams)
            return obj.service()

    def getMQConnection(self, MQID):
        db = DBROUTE(1)
        result = db.ExecQuery("SELECT [中间件类型],[ip],[port],[username],[password],[remark] FROM [Main].[dbo].[tbMessageQueue] where ID = '"+str(MQID)+"'")
        middlewareType = result[0][0]
        if middlewareType == 'RabbitMQ':
            ip = result[0][1]
            port = result[0][2]
            username = result[0][3]
            password = result[0][4]
            credentials = pika.PlainCredentials(username, password)
            parameters = pika.ConnectionParameters(host=ip,
                                                   port=port,
                                                   credentials=credentials,
                                                   frame_max=10000)
            connection = pika.BlockingConnection(parameters)
            return connection
    # 创建消费者
    def createConsumer(self, consumerID):
        db = DBROUTE(1)
        result = db.ExecQuery("SELECT [pid],[名称],[配置],[消费者代码],[说明],[中间件类型] FROM [Main].[dbo].[tbMQExample] a left outer join [Main].[dbo].[tbMessageQueue] b on a.pid = b.id where a.ID = '"+str(consumerID)+"'")
        MQID = result[0][0]
        middlewareType = result[0][5]
        connection = self.getMQConnection(MQID)
        if middlewareType == 'RabbitMQ':
            config = json.loads(result[0][2])
            code = result[0][3]
            channel = connection.channel()
            # 申明消息队列，消息在这个队列传递，如果不存在，则创建队列
            channel.queue_declare(queue=config['queue'], durable=False)

            # 定义一个回调函数来处理消息队列中的消息，这里是打印出来
            def callback(ch, method, properties, body):
                exec(code, {'body': body, 'logger': self.logger})
                ch.basic_ack(delivery_tag=method.delivery_tag)
            # 告诉rabbitmq，用callback来接收消息
            channel.basic_consume(config['queue'], callback)
            # 开始接收信息，并进入阻塞状态，队列里有信息才会调用callback进行处理
            channel.start_consuming()

    # 发送EDI待办信息
    '''
        cardNumber: 工资编号
        jumpUrl: 点击消息后跳转的界面连接
        subjectName: 消息展示的名称
        type: 消息类型 1是待办 2是待阅 默认为2
    '''
    def sendMsgToEDI(self, cardNumber, jumpUrl, subjectName, type="2"):
        try:
            url = "http://edi.sdstg.com/api/sys-notify/sysNotifyTodoRestService/sendTodo"
            user = {"LoginName": cardNumber}
            createTime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            data = {"targets": json.dumps(user), "modelName": "test", "modelId": "55d0ebfb-66ef-49d3-b04b-47886afb801e",
                    "subject": subjectName, "link": jumpUrl, "mobileLink": jumpUrl, "padLink": jumpUrl, "type": type,
                    "createTime": createTime}
            headers = {'Content-Type': "application/json;charset=UTF-8"}
            res = requests.post(url=url, data=json.dumps(data), headers=headers)
            statusCode = json.loads(res.text)['returnState']
            if statusCode == 2:
                return '发送成功'
            else:
                return '发送失败'
        except Exception as e:
            return '发送失败'

    def askChatGPT35(self, content):
        # 发送请求并接收响应
        url = 'https://www.zaiwenai.top/message'
        data = {
            'message': [{
                'role': 'user',
                'content': content
            }],
            'model': 'chinchilla',
            'key': None
        }
        response = requests.post(url, data=json.dumps(data))

        # 处理响应结果
        if response.status_code == 200:
            result = response.text.replace('<code>', '').replace('</code>', '')
            return{
                'code': 200,
                'msg': result
            }
        else:
            return {
                'code': response.status_code,
                'msg': '请求失败'
            }



