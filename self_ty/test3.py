import pymysql
from datetime import datetime

# 193数据库（MySQL）连接信息
host = "192.168.30.193"
user = "root"
password = "Asdf@123."
database = "hlzb_yx"

# 定义日期格式（根据ACTUAL_FINISH_TIME字段实际需要的格式调整）
# 例如: '%Y-%m-%d' 或 '%Y-%m-%d %H:%M:%S'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# 建立连接
try:
    # 连接193（MySQL）
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4"
    )
    print("✅ 193数据库连接成功！")
    #查找符合条件的合同编号
    try:
        with connection.cursor() as cursor:
            # SQL逻辑：左连接发货表的分组统计结果，过滤无未发货单的合同
            sql = """
                   select a.htbh AS contract_id from hlzb_htmxb a left join hlzb_tbdeliveryinfo b on a.htbh=b.HTBH and a.cpxh=b.CPXH where DELIVERY_DATE is not null and prostatus='制造中'
            """
            cursor.execute(sql)
            contract_ids = cursor.fetchall()  # 返回[(id1,), (id2,), ...]
            print(f"✅ 筛选出{len(contract_ids)}个待更新的合同")

    except pymysql.MySQLError as mysql_err:
        print(f"❌ 查找合同失败：{mysql_err}")
        raise

    # -------------------------- 4. 更新产品状态为「已发货」 --------------------------
    if contract_ids:
        try:
            with connection.cursor() as cursor:
                update_sql = """
                    UPDATE hlzb_htmxb
                    SET prostatus = '已发货'
                    WHERE htbh = %s  -- 改用=匹配单个值（更简单）
                      AND prostatus = '制造中'  -- 幂等性：避免重复更新
                """
                success = 0
                fail = 0
                fail_details = []

                # 修正点2：遍历元组列表，提取单个contract_id
                for contract_id_tuple in contract_ids:
                    contract_id = contract_id_tuple[0]  # 提取元组中的第一个元素
                    try:
                        cursor.execute(update_sql, (contract_id,))
                        success += 1  # 修正点3：计数在try块内
                    except Exception as e:
                        fail += 1
                        fail_details.append(f"合同编号{contract_id}：{str(e)}")

                connection.commit()
                print(f"📊 同步完成：成功{success}条，失败{fail}条")

                if fail > 0:
                    print("❌ 失败详情：")
                    for detail in fail_details:
                        print(f"- {detail}")

        except pymysql.MySQLError as mysql_err:
            print(f"❌ 更新合同失败：{mysql_err}")
            connection.rollback()  # 失败时回滚
        except Exception as e:
            print(f"❌ 更新逻辑错误：{e}")
            connection.rollback()

    else:
        print("ℹ️ 无需要更新的合同")

except pymysql.MySQLError as mysql_err:
    print(f"❌ 193数据库错误：{mysql_err}")
except Exception as e:
    print(f"❌ 程序异常：{e}", exc_info=True)
finally:
    # -------------------------- 5. 关闭连接 --------------------------
    if connection:
        connection.close()
        print("✅ 数据库连接已关闭")

