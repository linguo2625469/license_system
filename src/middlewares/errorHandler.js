const Logger = require('../utils/logger');
const ResponseFormatter = require('../utils/response');

/**
 * 404 Not Found 处理中间件
 * 当没有路由匹配时调用
 */
const notFoundHandler = (req, res, next) => {
  Logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  return ResponseFormatter.notFound(res, `路由不存在: ${req.method} ${req.originalUrl}`);
};

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 记录错误日志
  Logger.error('全局错误处理器捕获错误', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Sequelize 数据库错误
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => e.message);
    return ResponseFormatter.validationError(res, errors);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'unknown';
    return ResponseFormatter.error(
      res,
      'E9907',
      `数据重复: ${field} 已存在`,
      400
    );
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return ResponseFormatter.error(
      res,
      'E9901',
      '数据库外键约束错误',
      400
    );
  }

  if (err.name === 'SequelizeDatabaseError') {
    return ResponseFormatter.error(
      res,
      'E9901',
      '数据库操作错误',
      500
    );
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return ResponseFormatter.error(
      res,
      'E0102',
      'JWT 令牌无效',
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseFormatter.error(
      res,
      'E0103',
      'JWT 令牌已过期',
      401
    );
  }

  // Joi 验证错误
  if (err.name === 'ValidationError' && err.isJoi) {
    const errors = err.details.map(detail => detail.message);
    return ResponseFormatter.validationError(res, errors);
  }

  // 自定义业务错误
  if (err.code && ResponseFormatter.hasErrorCode(err.code)) {
    return ResponseFormatter.error(
      res,
      err.code,
      err.message,
      err.statusCode || 400
    );
  }

  // 语法错误（如 JSON 解析错误）
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ResponseFormatter.error(
      res,
      'E9907',
      '请求数据格式错误',
      400
    );
  }

  // 默认服务器错误
  return ResponseFormatter.serverError(res, err, err.message || '服务器内部错误');
};

/**
 * 异步路由错误包装器
 * 用于包装异步路由处理函数，自动捕获 Promise rejection
 * 
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的函数
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建自定义错误类
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, data = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 创建特定类型的错误
 */
class AuthError extends AppError {
  constructor(code = 'E0102', message = '认证失败') {
    super(code, message, 401);
    this.name = 'AuthError';
  }
}

class ValidationError extends AppError {
  constructor(message = '参数验证失败', errors = []) {
    super('E9902', message, 400, { errors });
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super('E9905', message, 404);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = '禁止访问') {
    super('E9906', message, 403);
    this.name = 'ForbiddenError';
  }
}

class DatabaseError extends AppError {
  constructor(message = '数据库错误') {
    super('E9901', message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * 请求日志中间件
 * 记录所有 API 请求
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // 监听响应完成事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    Logger.logRequest(req, res.statusCode, responseTime);
  });

  next();
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  requestLogger,
  // 错误类
  AppError,
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DatabaseError
};
