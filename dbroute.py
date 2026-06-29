# -*- coding:utf-8 -*- 

from sqlserver import SQLSERVER
from oracle import ORACLE
from mysql import MYSQL
from greenplum import GREENPLUM
from postgresql import POSTGRESQL

MSSQL = SQLSERVER('192.168.1.12','sa','12345@Qwer.',1433,'Main')

class DBROUTE:
    def __init__(self,id):
        reslist = MSSQL.ExecQuery("SELECT [类型],[地址],[用户名],[密码],[端口号],[数据库] FROM [Main].[dbo].[tbDatabaseLink] where ID = '"+str(id)+"'")
        if (reslist[0][0]!=None):
            dbtype = str(reslist[0][0])
            ip = str(reslist[0][1])
            user = str(reslist[0][2])
            pwd = str(reslist[0][3])
            port = str(reslist[0][4])
            dbname = str(reslist[0][5])
            if(dbtype=='SQLSERVER'):
                self.dbcon = SQLSERVER(ip,user,pwd,port,dbname)
            if (dbtype == 'ORACLE'):
                self.dbcon = ORACLE(ip, user, pwd, port, dbname)
            if (dbtype == 'MYSQL'):
                self.dbcon = MYSQL(ip, user, pwd, port, dbname)
            if (dbtype == 'GREENPLUM'):
                self.dbcon = GREENPLUM(ip, user, pwd, port, dbname)
            if (dbtype == 'POSTGRESQL'):
                try:
                    self.dbcon = POSTGRESQL(ip, user, pwd, port, dbname)
                except Exception as e:
                    print('获取postgresql连接失败')

    def ExecQuery(self,sql):
        try:
            return self.dbcon.ExecQuery(sql)
        except Exception as e:
            print(e)

    def ExecNonQuery(self,sql):
        try:
            return self.dbcon.ExecNonQuery(sql)
        except Exception as e:
            print(e)
            print(sql)

    def ExecNonQueryRe(self, sql):
        try:
            return self.dbcon.ExecNonQuery(sql)
        except Exception as e:
            # 记录详细错误
            error_msg = f"ExecNonQuery失败: {str(e)}\nSQL: {sql}"
            print(error_msg)  # 保留日志记录

            # 方案A: 重新抛出异常
            raise Exception(error_msg) from e

    def ExecNonQuery2(self,sql,vl):
        try:
            return self.dbcon.ExecNonQuery2(sql,vl)
        except Exception as e:
            print(e)

