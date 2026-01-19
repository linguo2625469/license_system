const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const appConfig = require('../config/app');
const Logger = require('../utils/logger');

/**
 * 速率限制错误处理函数
 */
const rateLimitHandler = (req, res) => {
  Logger.logSecurity('速率限制触发', {
    ip: req.ip,
    url: req.originalUrl,
    method: req.method
  });

  return res.status(429).json({
    success: false,
    code: 'E9903',
    message: '请求过于频繁，请稍后再试',
    data: null,
    timestamp: Date.now()
  });
};

/**
 * 跳过成功请求的计数（可选配置）
 * 只对失败的请求进行限制
 */
const skipSuccessfulRequests = (req, res) => {
  return res.statusCode < 400;
};

/**
 * 管理端 API 速率限制
 * 100 请求/15分钟/IP
 */
const adminRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.admin.windowMs,
  max: appConfig.rateLimit.admin.max,
  message: '管理端请求过于频繁，请稍后再试',
  standardHeaders: true, // 返回 RateLimit-* 头
  legacyHeaders: false, // 禁用 X-RateLimit-* 头
  handler: rateLimitHandler,
  // 使用 IP 作为标识（支持 IPv6）
  keyGenerator: ipKeyGenerator
});

/**
 * 客户端激活 API 速率限制
 * 10 请求/小时/IP
 */
const clientActivateRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.clientActivate.windowMs,
  max: appConfig.rateLimit.clientActivate.max,
  message: '激活请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // 可以结合 IP 和 AppKey 进行限制（支持 IPv6）
    const appKey = req.headers['x-app-key'] || 'unknown';
    return `${ipKeyGenerator(req)}-${appKey}`;
  }
});

/**
 * 客户端验证 API 速率限制
 * 60 请求/分钟/IP
 */
const clientVerifyRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.clientVerify.windowMs,
  max: appConfig.rateLimit.clientVerify.max,
  message: '验证请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    const appKey = req.headers['x-app-key'] || 'unknown';
    return `${ipKeyGenerator(req)}-${appKey}`;
  }
});

/**
 * 心跳 API 速率限制
 * 120 请求/分钟/IP
 */
const heartbeatRateLimit = rateLimit({
  windowMs: appConfig.rateLimit.heartbeat.windowMs,
  max: appConfig.rateLimit.heartbeat.max,
  message: '心跳请求过于频繁',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    const appKey = req.headers['x-app-key'] || 'unknown';
    return `${ipKeyGenerator(req)}-${appKey}`;
  },
  // 心跳请求不记录成功的请求
  skipSuccessfulRequests: true
});

/**
 * 通用 API 速率限制（用于未特别配置的接口）
 * 60 请求/分钟/IP
 */
const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 60,
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * 严格的速率限制（用于敏感操作）
 * 5 请求/分钟/IP
 */
const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 5,
  message: '操作过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * 创建自定义速率限制中间件
 * @param {Object} options - 速率限制配置
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 错误消息
 * @param {Function} options.keyGenerator - 自定义 key 生成函数
 * @returns {Function} Express 中间件
 */
const createRateLimit = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 60,
    message: options.message || '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: options.keyGenerator || ipKeyGenerator,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false
  });
};

module.exports = {
  adminRateLimit,
  clientActivateRateLimit,
  clientVerifyRateLimit,
  heartbeatRateLimit,
  generalRateLimit,
  strictRateLimit,
  createRateLimit
};
