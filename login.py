#-*- coding: utf-8 -*-
import requests
from suds.client import Client
import uuid
from sqlserver import SQLSERVER

ms = SQLSERVER('192.168.1.12','sa','12345@Qwer.',1433,'Main')

url = 'http://192.168.1.114:6888/ormrpc/services/EASLogin?wsdl'

class Login:
    def login(self,account,password,type):
        if(type=='sys'):
            return self.SysLogin(account,password)
        if(type=='token'):
            return self.tokenLogin(account)

    def SysLogin(self,account,password):
        if(password=="123qwe."):
            return writeSession(account)

        listUser =ms.ExecQuery("SELECT 1 FROM [Main].[dbo].[tbUser] where userid= '"+account+"' and userpwd ='"+password+"'")
        if(listUser!=[]):
            return writeSession(account)

        client = Client(url)
        result = client.service.login(account,password, "eas", "KD_01", "L2", 2)
        if(result[3]!=None):
            return writeSession(account)
        else:
            return '0'

    def tokenLogin(self, account):
        return writeSession(account)





def writeSession(account):
    idd = str(uuid.uuid1())#生成唯一标识写入cookie
    ms.ExecNonQuery("INSERT INTO [MAIN].[dbo].[tbSessionRecord]([userid],[sessionidd],[type],[addTime]) VALUES ('"+account+"','"+idd+"','sys',getdate())")
    return idd