require('dotenv').config();

module.exports = {
  // 应用配置
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  appName: process.env.APP_NAME || '授权码管理系统',
  
  // 心跳配置
  heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT || '30', 10), // 秒
  
  // RSA 密钥加密密码
  rsaEncryptionKey: process.env.RSA_ENCRYPTION_KEY || 'your_rsa_encryption_key_change_in_production',
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || './logs',
  
  // 速率限制配置
  rateLimit: {
    admin: {
      windowMs: 15 * 60 * 1000, // 15 分钟
      max: 100 // 最大请求数
    },
    clientActivate: {
      windowMs: 60 * 60 * 1000, // 1 小时
      max: 10
    },
    clientVerify: {
      windowMs: 60 * 1000, // 1 分钟
      max: 60
    },
    heartbeat: {
      windowMs: 60 * 1000, // 1 分钟
      max: 120
    }
  },
  
  // 防重放攻击配置
  nonceTimeout: 5 * 60 * 1000, // 5 分钟
  nonceCleanupInterval: 10 * 60 * 1000, // 10 分钟
  
  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
};
