# DataThinkDev

数据驱动的企业信息管理系统，基于 Flask-RESTful 构建，集成多个业务模块。

## 技术栈

- **后端**: Python / Flask / Flask-RESTful / gevent
- **数据库**: MySQL / Oracle / PostgreSQL / SQL Server / Greenplum / SQLite
- **前端**: jQuery EasyUI / Element UI / Bootstrap 5 / ECharts / FullCalendar
- **日志**: loguru

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 🗓️ 值班日历 | `duty_date/` | 员工值班排班与日历展示 |
| ⛽ 油费计算器 | `fuel_cost_calculator/` | 基于实时油价的出行成本计算 |
| 🎓 精益专家 | `LeanSpecialist/` | 精益人才培养，含报名、自评、时间线、证书 |
| 📋 合同管理 | `contract_management/` | 合同台账、模板、审批流程 |
| 📱 扫码授权 | `scancodeDelegation/` | 扫码授权委托管理 |
| 📝 职称评审 | `title_assessment/` | 职称申报与评审管理 |
| ✅ 智能质检 | `smart_quality/` | 智能质量检查 |
| 🔍 来料检验 | `inbound_inspection/` | 入库物料检验 |
| 📦 发货通知单台账 | `imes_zbs/` | 钢材发货通知单CRUD管理，支持新增/编辑/审核/复制 |

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/suemika/DataThinkDev.git
cd DataThinkDev

# 2. 创建虚拟环境并安装依赖
python3 -m venv venv
source venv/bin/activate
pip install flask flask-restful flask-cors gevent loguru xlrd xlwt requests

# 3. 配置数据库连接
# 编辑 mysql.py / oracle.py / postgresql.py 等文件中的数据库连接信息

# 4. 启动服务
python app.py
# 或
python main.py
```

## 项目结构

```
DataThinkDev/
├── app.py                  # Flask 应用入口
├── main.py                 # 主应用（含更多功能）
├── dbroute.py              # 数据库路由
├── login.py                # 登录认证
├── utils.py                # 工具函数
├── mysql.py                # MySQL 连接器
├── oracle.py               # Oracle 连接器
├── postgresql.py           # PostgreSQL 连接器
├── sqlserver.py            # SQL Server 连接器
├── greenplum.py            # Greenplum 连接器
├── gluesource/             # 动态 Servlet 加载目录
├── static/program/         # 前端业务模块
│   ├── duty_date/          # 值班日历
│   ├── fuel_cost_calculator/ # 油费计算器
│   ├── LeanSpecialist/     # 精益专家
│   ├── contract_management/ # 合同管理
│   ├── scancodeDelegation/ # 扫码授权
│   ├── title_assessment/   # 职称评审
│   ├── smart_quality/      # 智能质检
│   ├── inbound_inspection/ # 来料检验
│   ├── imes_zbs/           # 发货通知单台账
│   └── vendor/             # 共享前端依赖
└── static/                 # 其他静态资源
```

## 部署

| 项目 | 信息 |
|------|------|
| **服务器** | 192.168.1.8（CentOS 8，x86_64） |
| **主机名** | web_docker_C8_2_1_8 |
| **部署路径** | `/data/DataThinkDev/` |
| **容器镜像** | `imcflask20250618` |
| **容器名** | imc1 ~ imc205（多实例） |
| **挂载** | `/data/DataThinkDev` → 容器内 `/data` |

### 连接方式

```bash
# 安装 sshpass（macOS）
brew install hudochenkov/sshpass/sshpass

# SSH 连接
sshpass -p '1234Qwer.' ssh -o StrictHostKeyChecking=no root@192.168.1.8
```

| 连接信息 | 值 |
|----------|-----|
| **用户** | `root` |
| **IP** | `192.168.1.8` |
| **端口** | `22` |
| **认证** | 密码 |

## License

MIT
