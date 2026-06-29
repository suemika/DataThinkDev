import pymysql
from DBUtils.PooledDB import PooledDB

class MYSQL:
    def __init__(self,host,user,pwd,port,db):
        self.serverName = 'MYSQL'
        self.host = host
        self.user = user
        self.pwd = pwd
        self.db = db
        self.port = int(port)
        self.pool = PooledDB(pymysql, mincached=1,maxcached=0,maxconnections=0, blocking=True,host=self.host, user=self.user, password=self.pwd, database=self.db, port=self.port,charset="utf8", autocommit=True)

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
        # self.conn.commit()
        cur.close()
        self.conn.close()
        return resList

    def ExecNonQuery(self, sql):
        cur = self.__GetConnect()
        cur.execute(sql)
        # self.conn.commit()
        cur.close()
        self.conn.close()

    def ExecNonQuery2(self, sql, vl):
        cur = self.__GetConnect()
        cur.execute(sql, (vl,))
        # self.conn.commit()
        cur.close()
        self.conn.close()
