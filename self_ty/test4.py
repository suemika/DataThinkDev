import pymysql
import cx_Oracle
from datetime import datetime

# 158数据库（Oracle）连接信息
dsn_158 = cx_Oracle.makedsn("192.168.30.158", 1521, service_name="orcl")
user_158 = "system"
password_158 = "hualu"

# 193数据库（MySQL）连接信息
host = "192.168.30.193"
user = "root"
password = "Asdf@123."
database = "hlzb_yx"

# 定义日期格式
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# 建立连接
try:
    # 连接158（Oracle）
    connection_158 = cx_Oracle.connect(
        user=user_158,
        password=password_158,
        dsn=dsn_158,
        encoding="UTF-8"
    )
    print("✅ 158数据库连接成功！")

    # 连接193（MySQL）
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4"
    )
    print("✅ 193数据库连接成功！")

    # 第一步：从193数据库获取需要更新的PART_DRAWING_ID列表
    with connection.cursor() as cursor:
        sql_get_ids = "SELECT PART_DRAWING_ID FROM hlzb_productionpt WHERE LENGTH(ACTUAL_FINISH_TIME)<1"
        cursor.execute(sql_get_ids)
        part_ids = cursor.fetchall()

        if not part_ids:
            print("📋 没有找到需要更新的记录（ACTUAL_FINISH_TIME为空的记录）")
            exit(0)

        # 提取ID列表
        id_list = [item[0] for item in part_ids]
        print(f"📋 从193获取到{len(id_list)}个需要更新的PART_DRAWING_ID")

    # 第二步：根据PART_DRAWING_ID从158数据库查询对应的END1_DATE
    id_to_date_mapping = {}

    with connection_158.cursor() as cursor_158:
        # 使用IN查询来批量获取对应的END1_DATE
        # 注意：如果ID列表很大，可能需要分批查询
        placeholders = ','.join([':id' + str(i) for i in range(len(id_list))])
        sql_158 = f"""
            SELECT ITEM_NO, END1_DATE
            FROM sfc.shop_order
            WHERE ITEM_NO IN ({placeholders})
              AND END1_DATE IS NOT NULL 
        """

        # 构建参数字典
        params = {f'id{i}': id_value for i, id_value in enumerate(id_list)}

        cursor_158.execute(sql_158, params)
        results_158 = cursor_158.fetchall()

        # 构建ID到日期的映射字典
        for item_no, end1_date in results_158:
            id_to_date_mapping[item_no] = end1_date

        print(f"📋 从158获取到{len(results_158)}条匹配的有效数据")

    # 第三步：更新193数据库
    with connection.cursor() as cursor:
        update_sql = "UPDATE hlzb_productionpt SET ACTUAL_FINISH_TIME = %s WHERE PART_DRAWING_ID = %s"
        success = 0
        fail = 0
        fail_details = []

        # 只更新那些在158数据库中找到对应日期的记录
        for part_id in id_list:
            if part_id in id_to_date_mapping:
                try:
                    end1_date = id_to_date_mapping[part_id]
                    formatted_date = end1_date.strftime(DATE_FORMAT)

                    cursor.execute(update_sql, (formatted_date, part_id))
                    success += 1
                except Exception as e:
                    fail += 1
                    fail_details.append(f"产品编号{part_id}：{str(e)}")
            else:
                # 如果在158数据库中没有找到对应的记录，可以记录日志但不视为失败
                print(f"⚠️  未找到PART_DRAWING_ID为{part_id}的END1_DATE")

        connection.commit()
        print(f"\n📊 同步完成：成功更新{success}条，失败{fail}条")
        print(f"💡 注意：共有{len(id_list) - len(id_to_date_mapping)}个ID在158数据库中没有找到对应的END1_DATE")

        if fail > 0:
            print("\n❌ 失败详情：")
            for detail in fail_details:
                print(f"- {detail}")

except cx_Oracle.Error as oracle_err:
    print(f"❌ 158数据库错误：{oracle_err}")
except pymysql.MySQLError as mysql_err:
    print(f"❌ 193数据库错误：{mysql_err}")
except Exception as e:
    print(f"❌ 操作失败：{e}")

finally:
    # 关闭连接
    if 'connection_158' in locals() and connection_158:
        connection_158.close()
        print("\n🔌 158数据库连接已关闭")
    if 'connection' in locals() and connection:
        connection.close()
        print("🔌 193数据库连接已关闭")