# -*- coding:utf-8 -*-

import psycopg2
import psycopg2.extras
import psycopg2.pool
class GREENPLUM:
    def __init__(self,host,user,pwd,port,db):
        self.serverName = 'GREENPLUM'
        self.host = host
        self.user = user
        self.pwd = pwd
        self.db = db
        self.port = port
        try:
            self.pool = psycopg2.pool.SimpleConnectionPool(minconn=1, maxconn=5, dbname=self.db,
                                                                  user=self.user,
                                                                  password=self.pwd,
                                                                  host=self.host,
                                                                  port=self.port)
            # connect()也可以使用一个大的字符串参数,
            # 比如”host=localhost port=5432 user=postgres password=postgres dbname=test”
            # 从数据库连接池获取连接
        except psycopg2.DatabaseError as e:
            print("could not connect to Greenplum server", e)

    def __GetConnect(self):
        if not self.db:
            raise(NameError,"没有设置数据库信息")
        #self.conn = pymssql.connect(host=self.host,user=self.user,password=self.pwd,database=self.db,charset="utf8",autocommit=True)
        self.conn = self.pool.getconn()
        cur = self.conn.cursor()
        if not cur:
            raise(NameError,"连接数据库失败")
        else:
            return cur

    def ExecQuery(self,sql):
        cur = self.__GetConnect()
        cur.execute(sql)
        resList = cur.fetchall()
        #self.conn.commit()
        cur.close()
        self.conn.close()
        return resList

    def ExecNonQuery(self,sql):
        cur = self.__GetConnect()
        cur.execute(sql)
        self.conn.commit()
        cur.close()
        self.conn.close()

    def ExecNonQuery2(self,sql,vl):
        cur = self.__GetConnect()
        cur.execute(sql,(vl,))
        #self.conn.commit()
        cur.close()
        self.conn.close()


