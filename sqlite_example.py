import sqlite3
import os

# 数据库文件路径
DB_FILE = "example.db"

def create_connection():
    """创建数据库连接"""
    conn = None
    try:
        conn = sqlite3.connect(DB_FILE)
        print(f"成功连接到SQLite数据库，版本: {sqlite3.sqlite_version}")
        return conn
    except sqlite3.Error as e:
        print(f"连接SQLite数据库时出错: {e}")
    return conn

def create_table(conn):
    """创建表"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            age INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        print("表创建成功或已存在")
    except sqlite3.Error as e:
        print(f"创建表时出错: {e}")

def insert_user(conn, name, email, age=None):
    """插入用户数据"""
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email, age) VALUES (?, ?, ?)", (name, email, age))
        conn.commit()
        print(f"用户 {name} 插入成功，ID: {cursor.lastrowid}")
    except sqlite3.Error as e:
        print(f"插入用户数据时出错: {e}")

def get_all_users(conn):
    """获取所有用户"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users")
        rows = cursor.fetchall()

        print("\n所有用户:")
        for row in rows:
            print(f"ID: {row[0]}, 姓名: {row[1]}, 邮箱: {row[2]}, 年龄: {row[3]}, 创建时间: {row[4]}")
        return rows
    except sqlite3.Error as e:
        print(f"获取用户数据时出错: {e}")
        return []

def update_user(conn, user_id, name=None, email=None, age=None):
    """更新用户信息"""
    try:
        cursor = conn.cursor()
        update_fields = []
        params = []

        if name:
            update_fields.append("name = ?")
            params.append(name)
        if email:
            update_fields.append("email = ?")
            params.append(email)
        if age is not None:
            update_fields.append("age = ?")
            params.append(age)

        if not update_fields:
            print("没有提供要更新的字段")
            return False

        params.append(user_id)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()

        if cursor.rowcount > 0:
            print(f"用户ID {user_id} 更新成功")
            return True
        else:
            print(f"未找到用户ID {user_id}")
            return False
    except sqlite3.Error as e:
        print(f"更新用户数据时出错: {e}")
        return False

def delete_user(conn, user_id):
    """删除用户"""
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()

        if cursor.rowcount > 0:
            print(f"用户ID {user_id} 删除成功")
            return True
        else:
            print(f"未找到用户ID {user_id}")
            return False
    except sqlite3.Error as e:
        print(f"删除用户数据时出错: {e}")
        return False

def search_users_by_name(conn, name_pattern):
    """按姓名搜索用户"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE name LIKE ?", (f"%{name_pattern}%",))
        rows = cursor.fetchall()

        print(f"\n姓名包含 '{name_pattern}' 的用户:")
        for row in rows:
            print(f"ID: {row[0]}, 姓名: {row[1]}, 邮箱: {row[2]}, 年龄: {row[3]}")
        return rows
    except sqlite3.Error as e:
        print(f"搜索用户时出错: {e}")
        return []

def main():
    # 检查数据库文件是否存在，如果存在则删除
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
        print(f"已删除现有数据库文件: {DB_FILE}")

    # 创建数据库连接
    conn = create_connection()
    if conn is None:
        print("无法创建数据库连接！程序终止。")
        return

    # 创建表
    create_table(conn)

    # 插入一些示例数据
    print("\n插入示例数据...")
    insert_user(conn, "张三", "zhangsan@example.com", 25)
    insert_user(conn, "李四", "lisi@example.com", 30)
    insert_user(conn, "王五", "wangwu@example.com", 28)
    insert_user(conn, "赵六", "zhaoliu@example.com", 35)

    # 获取并显示所有用户
    get_all_users(conn)

    # 更新用户信息
    print("\n更新用户信息...")
    update_user(conn, 1, name="张三丰", age=26)

    # 搜索用户
    print("\n搜索用户...")
    search_users_by_name(conn, "张")

    # 删除用户
    print("\n删除用户...")
    delete_user(conn, 4)

    # 再次显示所有用户
    get_all_users(conn)

    # 关闭数据库连接
    conn.close()
    print("\n数据库连接已关闭")

if __name__ == "__main__":
    main()
