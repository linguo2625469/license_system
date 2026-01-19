/**
 * 授权码管理系统 - 应用入口
 * 
 * 功能:
 * - 初始化 Express 应用
 * - 配置中间件（body-parser、cors、helmet、日志等）
 * - 挂载路由
 * - 错误处理
 * - 启动服务器
 * - 数据库连接
 * - 定时任务
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const appConfig = require('./config/app');
const Logger = require('./utils/logger');
const { sequelize } = require('./models');
const { 
  notFoundHandler, 
  errorHandler, 
  requestLogger 
} = require('./middlewares/errorHandler');
const scheduledTasks = require('./utils/scheduledTasks');
const fs = require('fs');
  const path = require('path');
  const mysql = require('mysql2/promise');
// 导入路由
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');

// Swagger 文档
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// 创建 Express 应用
const app = express();

// ==================== 基础中间件配置 ====================

// 1. 安全中间件 - Helmet
// 设置各种 HTTP 头以提高安全性
app.use(helmet({
  contentSecurityPolicy: false, // 如果需要可以自定义 CSP 策略
  crossOriginEmbedderPolicy: false
}));

// 2. CORS 配置
// 允许跨域请求
app.use(cors(appConfig.cors));

// 3. 请求体解析中间件
// 解析 JSON 格式的请求体
app.use(express.json({ limit: '10mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. 请求日志中间件
// 记录所有 API 请求
app.use(requestLogger);

// ==================== 健康检查路由 ====================
// 用于监控系统是否正常运行
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '系统运行正常',
    data: {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      environment: appConfig.env,
      version: '1.0.0'
    }
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '欢迎使用授权码管理系统 API',
    data: {
      name: appConfig.appName,
      version: '1.0.0',
      environment: appConfig.env,
      endpoints: {
        admin: '/api/admin',
        client: '/api/client',
        health: '/health',
        docs: '/api-docs',
        swagger: '/api-docs.json'
      }
    }
  });
});

// ==================== API 路由挂载 ====================

// Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '授权码管理系统 API 文档'
}));

// Swagger JSON 规范（可用于导入到 Postman 等工具）
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 管理端路由
app.use('/api/admin', adminRoutes);

// 客户端路由
app.use('/api/client', clientRoutes);

// ==================== 错误处理 ====================

// 404 处理 - 必须在所有路由之后
app.use(notFoundHandler);

// 全局错误处理中间件 - 必须在最后
app.use(errorHandler);

// ==================== 数据库连接 ====================

/**
 * 测试数据库连接并初始化数据库
 */
async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    Logger.info('数据库连接成功');
    
    // 检查数据库是否已初始化（检查 admins 表是否存在）
    const [results] = await sequelize.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'admins'"
    );
    
    const isInitialized = results[0].count > 0;
    if (!isInitialized) {
      Logger.info('检测到数据库未初始化，开始执行 install.sql...');
      // 创建支持多语句的连接
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'license_system',
        multipleStatements: true // 允许执行多条 SQL 语句
      });
      
      try {
        // 读取并执行 SQL 文件
        const sqlFilePath = path.join(__dirname, '../install.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // 直接执行整个 SQL 文件
        await connection.query(sqlContent);
        
        Logger.info('数据库初始化完成');
      } finally {
        await connection.end();
      }
    } else {
      Logger.info('数据库已初始化，跳过 install.sql 执行');
    }
    
    return true;
  } catch (error) {
    Logger.error('数据库连接或初始化失败', error);
    return false;
  }
}

// ==================== 启动定时任务 ====================

/**
 * 启动系统定时任务
 */
function startScheduledTasks() {
  try {
    scheduledTasks.startAll();
    Logger.info('定时任务启动成功');
  } catch (error) {
    Logger.error('定时任务启动失败', error);
  }
}

// ==================== 服务器启动 ====================

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 1. 测试数据库连接
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      Logger.error('数据库连接失败，服务器启动中止');
      process.exit(1);
    }
    
    // 2. 启动定时任务
    startScheduledTasks();
    
    // 3. 启动 HTTP 服务器
    const PORT = appConfig.port;
    
    app.listen(PORT, () => {
      Logger.info(`服务器启动成功`);
      Logger.info(`环境: ${appConfig.env}`);
      Logger.info(`端口: ${PORT}`);
      Logger.info(`管理端 API: http://localhost:${PORT}/api/admin`);
      Logger.info(`客户端 API: http://localhost:${PORT}/api/client`);
      Logger.info(`健康检查: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    Logger.error('服务器启动失败', error);
    process.exit(1);
  }
}

// ==================== 优雅关闭 ====================

/**
 * 优雅关闭服务器
 * 处理 SIGTERM 和 SIGINT 信号
 */
function gracefulShutdown(signal) {
  Logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
  
  // 停止定时任务
  try {
    scheduledTasks.stopAll();
    Logger.info('定时任务已停止');
  } catch (error) {
    Logger.error('停止定时任务失败', error);
  }
  
  // 关闭数据库连接
  sequelize.close()
    .then(() => {
      Logger.info('数据库连接已关闭');
      Logger.info('服务器已优雅关闭');
      process.exit(0);
    })
    .catch((error) => {
      Logger.error('关闭数据库连接失败', error);
      process.exit(1);
    });
}

// 监听进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  Logger.error('未捕获的异常', error);
  gracefulShutdown('uncaughtException');
});

// 监听未处理的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('未处理的 Promise rejection', {
    reason,
    promise
  });
});

// ==================== 启动应用 ====================

// 只在直接运行此文件时启动服务器
// 如果是被其他模块引入（如测试），则不启动
if (require.main === module) {
  startServer();
}

// 导出 app 供测试使用
module.exports = app;
