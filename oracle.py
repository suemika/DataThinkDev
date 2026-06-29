# -*- coding: utf-8 -*-
import oracledb
from DBUtils.PooledDB import PooledDB
import os

os.environ['NLS_LANG'] = 'SIMPLIFIED CHINESE_CHINA.UTF8'

# 初始化 Thick 模式（支持旧版 Oracle 如 11g）
try:
    oracledb.init_oracle_client(lib_dir="/usr/local/instantclient")
except Exception:
    pass  # 如果已初始化则忽略

class ORACLE:
    def __init__(self,host,user,pwd,port,db):
        self.serverName = 'ORACLE'
        self.host = host
        self.user = user
        self.pwd = pwd
        self.db = db
        self.port = port
        self.pool = PooledDB(oracledb, mincached=1,maxcached=0,maxconnections=0, blocking=True, user=self.user, password=self.pwd,dsn=self.host)

    def __GetConnect(self):
        if not self.db:
            raise (NameError, "没有设置数据库信息")
        self.conn = self.pool.connection()
        cur = self.conn.cursor()
        if not cur:
            raise (NameError, "连接数据库失败")
        else:
            return cur

    def ExecQuery(self, sql):
        cur = self.__GetConnect()
        cur.execute(sql)
        resList = cur.fetchall()
        self.conn.commit()
        cur.close()
        self.conn.close()
        return resList

    def ExecNonQuery(self, sql):
        cur = self.__GetConnect()
        cur.execute(sql)
        self.conn.commit()
        cur.close()
        self.conn.close()

    def ExecNonQuery2(self, sql, vl):
        cur = self.__GetConnect()
        cur.execute(sql, (vl,))
        self.conn.commit()
        cur.close()
        self.conn.close()
