const winston = require('winston');
const path = require('path');
const fs = require('fs');
const appConfig = require('../config/app');

// 确保日志目录存在
const logDir = appConfig.logDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台输出格式（开发环境更友好）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // 如果有额外的元数据，格式化输出
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// 创建 Winston logger 实例
const logger = winston.createLogger({
  level: appConfig.logLevel,
  format: logFormat,
  defaultMeta: { service: appConfig.appName },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // 警告日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'warn.log'),
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  // 未捕获的 Promise rejection
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 开发环境添加控制台输出
if (appConfig.env === 'development') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

/**
 * 日志工具类
 * 提供结构化的日志记录方法
 */
class Logger {
  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  static info(message, meta = {}) {
    logger.info(message, meta);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Error|Object} error - 错误对象或元数据
   */
  static error(message, error = {}) {
    if (error instanceof Error) {
      logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...error
      });
    } else {
      logger.error(message, error);
    }
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 元数据
   */
  static debug(message, meta = {}) {
    logger.debug(message, meta);
  }

  /**
   * 记录授权操作日志
   * @param {string} action - 操作类型 (activate, verify, rebind, etc.)
   * @param {Object} data - 日志数据
   */
  static logAuth(action, data = {}) {
    logger.info(`授权操作: ${action}`, {
      action,
      type: 'auth',
      ...data
    });
  }

  /**
   * 记录管理操作日志
   * @param {string} action - 操作类型
   * @param {Object} data - 日志数据
   */
  static logAdmin(action, data = {}) {
    logger.info(`管理操作: ${action}`, {
      action,
      type: 'admin',
      ...data
    });
  }

  /**
   * 记录安全事件日志
   * @param {string} event - 事件类型
   * @param {Object} data - 日志数据
   */
  static logSecurity(event, data = {}) {
    logger.warn(`安全事件: ${event}`, {
      event,
      type: 'security',
      ...data
    });
  }

  /**
   * 记录 API 请求日志
   * @param {Object} req - Express request 对象
   * @param {number} statusCode - 响应状态码
   * @param {number} responseTime - 响应时间（毫秒）
   */
  static logRequest(req, statusCode, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      type: 'request'
    };

    if (statusCode >= 500) {
      logger.error('API 请求错误', logData);
    } else if (statusCode >= 400) {
      logger.warn('API 请求失败', logData);
    } else {
      logger.info('API 请求', logData);
    }
  }

  /**
   * 记录数据库操作日志
   * @param {string} operation - 操作类型
   * @param {Object} data - 日志数据
   */
  static logDatabase(operation, data = {}) {
    logger.debug(`数据库操作: ${operation}`, {
      operation,
      type: 'database',
      ...data
    });
  }

  /**
   * 记录心跳日志
   * @param {Object} data - 心跳数据
   */
  static logHeartbeat(data = {}) {
    logger.debug('心跳', {
      type: 'heartbeat',
      ...data
    });
  }

  /**
   * 记录点卡扣点日志
   * @param {Object} data - 扣点数据
   */
  static logPointDeduct(data = {}) {
    logger.info('点卡扣点', {
      type: 'point_deduct',
      ...data
    });
  }

  /**
   * 获取原始 winston logger 实例
   * @returns {winston.Logger}
   */
  static getLogger() {
    return logger;
  }
}

module.exports = Logger;
