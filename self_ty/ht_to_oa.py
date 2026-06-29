import pymysql
import pymssql
from datetime import datetime


def connect_sqlserver():
    """连接SQL Server数据库"""
    try:
        conn = pymssql.connect(
            server='192.168.30.190',
            user='sa',
            password='Hl@H3c.2025',
            database='HR',
            as_dict=True,
            charset='utf8'
        )
        print("✅ SQL Server 数据库连接成功！")
        return conn
    except Exception as e:
        print("❌ SQL Server 数据库连接失败：", e)
        return None


def connect_mysql():
    """连接MySQL数据库"""
    try:
        conn = pymysql.connect(
            host="192.168.30.193",
            user="root",
            password="Asdf@123.",
            database="hlzb_yx",
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        print("✅ MySQL 数据库连接成功！")
        return conn
    except Exception as e:
        print("❌ MySQL 数据库连接失败：", e)
        return None


def sync_data():
    # 连接数据库
    sqlserver_conn = connect_sqlserver()
    mysql_conn = connect_mysql()

    if not sqlserver_conn or not mysql_conn:
        return

    try:
        with sqlserver_conn.cursor() as sqlserver_cursor, mysql_conn.cursor() as mysql_cursor:
            # 1. 从SQL Server批量查询员工信息
            print("🔍 从SQL Server查询员工信息...")
            sqlserver_cursor.execute(
                "SELECT 职工编号, CAST(姓名 AS NVARCHAR(50)) AS 姓名, 职位编码, 二级部门编码 部门编码 FROM XC_Staff_员工信息库 ")
            staff_data = sqlserver_cursor.fetchall()

            if not staff_data:
                print("⚠️ SQL Server中没有查询到员工数据")
                return

            # 2. 批量获取所有需要的部门编码和职位编码
            bm_bh_list = list(set([staff['部门编码'] for staff in staff_data if staff['部门编码']]))
            zw_bm_list = list(set([staff['职位编码'] for staff in staff_data if staff['职位编码']]))
            zgbh_list = [staff['职工编号'] for staff in staff_data]

            # 3. 批量查询部门信息
            org_mapping = {}
            if bm_bh_list:
                format_strings = ','.join(['%s'] * len(bm_bh_list))
                mysql_cursor.execute(
                    f"SELECT BM_BH, ORG_ID F_ZZJG, ORG_NAME FROM hlzb_yx.SYS_ORG WHERE BM_BH IN ({format_strings})",
                    tuple(bm_bh_list)
                )
                org_results = mysql_cursor.fetchall()
                org_mapping = {row['BM_BH']: row['F_ZZJG'] for row in org_results}
                org_name_mapping = {row['BM_BH']: row['ORG_NAME'] for row in org_results}  # 存储部门名称

            # 4. 批量查询职位信息
            if zw_bm_list:
                format_strings = ','.join(['%s'] * len(zw_bm_list))
                sqlserver_cursor.execute(
                    f"SELECT 职位编码, CAST(职位 AS NVARCHAR(50)) AS 职位 FROM XC_BM_tb职位 WHERE 职位编码 IN ({format_strings})",
                    tuple(zw_bm_list)
                )
                position_mapping = {row['职位编码']: row['职位'] for row in sqlserver_cursor.fetchall()}

                # 查询MySQL用户表是否有该用户
                mysql_cursor.execute(
                    f"SELECT F_ZGBH, F_NAME FROM hlzb_yx.BSUSER WHERE F_ZGBH IN ({format_strings})",
                    tuple(zw_bm_list)
                )
                user_mapping = {row['F_ZGBH']: row['F_NAME'] for row in mysql_cursor.fetchall()}

                # 检查哪些职位编码在查询结果中不存在
                missing_positions = set(position_mapping.keys()) - set(user_mapping.keys())
                if missing_positions:
                    print(f"⚠️ 以下职位编码在用户表中不存在: {missing_positions}")
                    # 使用列表推导式直接创建元组列表
                    missing_position_tuples = [(zwbm, position_mapping[zwbm])
                                               for zwbm in missing_positions
                                               if zwbm in position_mapping]

                    # 插入缺失的用户
                    if missing_position_tuples:
                        insert_query = """
                                                INSERT INTO hlzb_yx.BSUSER (
                                                    F_ZGBH, F_PASS, F_NAME, F_SYKM, F_SYBB, F_TYBZ, F_MANA, F_YHZT, F_KSRQ, F_JSRQ, F_IPKZ, F_IP,
                                                    F_MASK, F_MACA, F_CPWD, F_YSQX, F_CPRQ, F_CERT, F_CERTENABLE, F_FC, F_EMAIL, F_REMOTE, F_REMOTEURL,
                                                    F_DWBH, F_DWMC, F_SQMS, F_ISROLE, UNIT_ID, F_SYZT, F_CRDATE, F_CHDATE, F_PASS1, F_PASSDATE,
                                                    F_MESSAGE, F_UKEY_USE, F_UKEY_FIRE, SQMS, F_BZ, F_ZJPASS, F_CRUSER, F_PHONE, F_TYPE, F_YHXB, F_YHMZ,
                                                    F_YHSFZH, F_QQ, F_RZSJ, F_RSBM, F_RSBMBH, F_RSBMMC, F_NOTE, F_WXHM, F_XTBH, F_ENMC, F_CSD, F_SR,
                                                    F_GJ, F_JJLXR, F_JJLXDH, F_DZ, F_KXJTS, F_GZKYH, F_GZKZH, F_FZJG, F_BM, F_GW, F_YJNX, F_KXNJTS,
                                                    F_YHLX, F_SSBM, F_ISGNROLE, IMG_ICON, F_IM_USERID, F_IM_PASSWORD, F_SH, F_CHK_PWD_CHANGE,
                                                    F_COMPANYPHONE, F_FIRST_LOGIN, F_LOCK, F_LOCK_AT, IS_SEND_FLOW_EMAIL, F_ADMIN, F_CHUSER, F_ZZJG,
                                                    F_XMBH, F_XMMC, F_GWBH, F_GWMC, F_LOCKSCREEM, F_ISHIDEMENU
                                                ) 
                                                SELECT %s, ' ', %s, 0, 0, 0, 0, 0, ' ', ' ', 0, ' ',
                                                       ' ', ' ', 0, 0, ' ', ' ', ' ', 0, ' ', 0, ' ',
                                                       ' ', ' ', 1, 1, ' ', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ' ', ' ',
                                                       ' ', ' ', ' ', 0, ' ', ' ', '9999', ' ', ' ', ' ', ' ',
                                                       ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
                                                       ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
                                                       ' ', ' ', 0, ' ', ' ', ' ', ' ', ' ',
                                                       ' ', 1, 0, ' ', ' ', ' ', '9999', '0001',
                                                       ' ', ' ', ' ', ' ', ' ', 0
                                                """
                        # 执行批量插入
                        mysql_cursor.executemany(insert_query,
                                                 [(zgbh, position) for zgbh, position in missing_position_tuples])
                        # 提交事务
                        mysql_conn.commit()
                        print(f"➕ 新增 {len(missing_position_tuples)} 条角色数据")

            # 5. 批量查询MySQL中的用户信息
            mysql_user_mapping = {}
            if zgbh_list:
                format_strings = ','.join(['%s'] * len(zgbh_list))
                mysql_cursor.execute(
                    f"SELECT F_ZGBH, F_ZZJG FROM hlzb_yx.BSUSER WHERE F_ZGBH IN ({format_strings})",
                    tuple(zgbh_list)
                )
                mysql_user_mapping = {row['F_ZGBH']: row['F_ZZJG'] for row in mysql_cursor.fetchall()}

            # 6. 批量查询MySQL中的角色信息
            user_roles_mapping = {}
            if zgbh_list:
                format_strings = ','.join(['%s'] * len(zgbh_list))
                mysql_cursor.execute(
                    f"SELECT F_ZGBH, F_ROLECODE FROM hlzb_yx.BSUSERROLE WHERE F_ZGBH IN ({format_strings})",
                    tuple(zgbh_list)
                )
                for row in mysql_cursor.fetchall():
                    if row['F_ZGBH'] not in user_roles_mapping:
                        user_roles_mapping[row['F_ZGBH']] = []
                    user_roles_mapping[row['F_ZGBH']].append(row['F_ROLECODE'])

            # 7. 处理每个员工数据
            insert_users = []
            update_users = []
            insert_roles = []
            update_roles = []

            for staff in staff_data:
                zgbh = staff['职工编号']
                name = staff['姓名']  # 获取姓名
                zwbm = staff['职位编码']
                bmbm = staff['部门编码']

                # 组织机构
                zzjg = org_mapping.get(bmbm)
                current_zzjg = mysql_user_mapping.get(zgbh)
                # 使用部门名称替换职位信息
                bmmc = org_name_mapping.get(bmbm, ' ')
                position = position_mapping.get(zwbm)
                # 处理用户信息
                if zgbh in mysql_user_mapping:
                    if current_zzjg != zzjg:
                        update_users.append((zzjg, zgbh))
                else:
                    # 包含职工编号和姓名
                    insert_users.append((zgbh, name,bmmc, zzjg))

                # 处理角色信息
                if zgbh in user_roles_mapping:
                    if zwbm not in user_roles_mapping[zgbh]:
                        update_roles.append((zwbm, zgbh))
                else:
                    insert_roles.append((zgbh, zwbm))

            # 8. 批量执行更新操作
            if update_users:
                mysql_cursor.executemany(
                    "UPDATE hlzb_yx.BSUSER SET F_ZZJG = %s WHERE F_ZGBH = %s",
                    update_users
                )
                print(f"🔄 更新 {len(update_users)} 条用户用户组织机构数据")

            if insert_roles:
                # 过滤掉包含None值的记录
                filtered_roles = [role for role in insert_roles if role[0] is not None and role[1] is not None]

                if filtered_roles:
                    mysql_cursor.executemany(
                        "INSERT INTO hlzb_yx.BSUSERROLE (F_ZGBH, F_ROLECODE) VALUES (%s, %s)",
                        filtered_roles
                    )
                    print(f"➕ 新增 {len(filtered_roles)} 条用户对应角色数据")
                else:
                    print("⚠️  过滤后无有效数据可插入")
            else:
                print("ℹ️  无用户角色数据需要插入")

            if update_roles:
                mysql_cursor.executemany(
                    "UPDATE hlzb_yx.BSUSERROLE SET F_ROLECODE = %s WHERE F_ZGBH = %s",
                    update_roles
                )
                print(f"🔄 批量更新 {len(update_roles)} 条用户对应角色数据")

            if insert_users:
                insert_query = """
                                                INSERT INTO hlzb_yx.BSUSER (
                                                    F_ZGBH, F_PASS, F_NAME, F_SYKM, F_SYBB, F_TYBZ, F_MANA, F_YHZT, F_KSRQ, F_JSRQ, F_IPKZ, F_IP,
                                                    F_MASK, F_MACA, F_CPWD, F_YSQX, F_CPRQ, F_CERT, F_CERTENABLE, F_FC, F_EMAIL, F_REMOTE, F_REMOTEURL,
                                                    F_DWBH, F_DWMC, F_SQMS, F_ISROLE, UNIT_ID, F_SYZT, F_CRDATE, F_CHDATE, F_PASS1, F_PASSDATE,
                                                    F_MESSAGE, F_UKEY_USE, F_UKEY_FIRE, SQMS, F_BZ, F_ZJPASS, F_CRUSER, F_PHONE, F_TYPE, F_YHXB, F_YHMZ,
                                                    F_YHSFZH, F_QQ, F_RZSJ, F_RSBM, F_RSBMBH, F_RSBMMC, F_NOTE, F_WXHM, F_XTBH, F_ENMC, F_CSD, F_SR,
                                                    F_GJ, F_JJLXR, F_JJLXDH, F_DZ, F_KXJTS, F_GZKYH, F_GZKZH, F_FZJG, F_BM, F_GW, F_YJNX, F_KXNJTS,
                                                    F_YHLX, F_SSBM, F_ISGNROLE, IMG_ICON, F_IM_USERID, F_IM_PASSWORD, F_SH, F_CHK_PWD_CHANGE,
                                                    F_COMPANYPHONE, F_FIRST_LOGIN, F_LOCK, F_LOCK_AT, IS_SEND_FLOW_EMAIL, F_ADMIN, F_CHUSER, F_ZZJG,
                                                    F_XMBH, F_XMMC, F_GWBH, F_GWMC, F_LOCKSCREEM, F_ISHIDEMENU
                                                ) 
                                                SELECT %s, REPLACE(UUID(), '-', ''), %s, 0, 0, 0, 0, 0, ' ', ' ', 0, ' ',
                                                       ' ', ' ', 0, 0, ' ', ' ', ' ', 0, ' ', 0, ' ',
                                                       ' ', ' ', 1, 0, ' ', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ' ', ' ',
                                                       ' ', ' ', ' ', 0, ' ', ' ', '9999', ' ', ' ', ' ', ' ',
                                                       ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
                                                       ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', %s, ' ', ' ', ' ',
                                                       ' ', ' ', 0, ' ', ' ', ' ', ' ', 0,
                                                       ' ', 0,' ', ' ', 0, ' ', '9999', %s,
                                                       ' ', ' ', ' ', ' ', 0, 0
                                                """
                # 修改为三个参数：职工编号、姓名、组织机构
                mysql_cursor.executemany(insert_query, [(zgbh, name,bmmc, zzjg) for zgbh, name,bmmc, zzjg in insert_users])
                print(f"➕ 批量新增 {len(insert_users)} 条用户职工编号、姓名、部门名称、组织机构数据")

            # 提交事务
            mysql_conn.commit()
            print("✅ 数据同步完成！")

    except Exception as e:
        print("❌ 数据同步过程中出错：", e)
        mysql_conn.rollback()
    finally:
        sqlserver_conn.close()
        mysql_conn.close()


if __name__ == "__main__":
    print(f"🕒 开始数据同步，当前时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_data()
    print(f"🕒 数据同步完成，当前时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")