# 授权码管理系统

基于 Node.js + Express + MySQL 的授权码管理后端系统。

## 功能特性

- 多软件管理
- 灵活的授权码类型（时长卡和点卡）
- 设备指纹识别
- 实时在线监控
- 云控功能（远程变量、开关、公告、版本管理）
- 安全防护（RSA 加密、黑名单、速率限制）

## 技术栈

- Node.js 18+
- Express.js
- MySQL 8.0+
- Sequelize ORM
- JWT 认证
- RSA 加密

## 安装步骤

1. 克隆项目
```bash
git clone https://github.com/linguo2625469/license_system.git
cd license-system
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库等信息
```

4. 初始化数据库
```bash
# 创建数据库
mysql -u root -p < install.sql
```

5. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm start

# 使用 PM2
pm2 start ecosystem.config.js
```

## 测试

```bash
# 运行所有测试
npm test

# 运行测试并监听变化
npm run test:watch
```

## 项目结构

```
src/
├── config/              # 配置文件
├── models/              # 数据模型
├── controllers/         # 控制器
│   ├── admin/          # 管理端控制器
│   └── client/         # 客户端控制器
├── services/            # 业务逻辑服务
├── middlewares/         # 中间件
├── routes/              # 路由
├── utils/               # 工具函数
├── validators/          # 数据验证规则
└── app.js              # 应用入口
```

## API 文档

详见 API.md 文件。

## 许可证

ISC
