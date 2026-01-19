const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const ResponseFormatter = require('../utils/response');
const Logger = require('../utils/logger');
const { Software } = require('../models');

/**
 * JWT 认证中间件
 * 用于管理端 API 的认证
 */
const authenticateJWT = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      Logger.logSecurity('JWT 认证失败：未提供令牌', {
        ip: req.ip,
        url: req.originalUrl
      });
      return ResponseFormatter.error(res, 'E0106', '未提供认证令牌', 401);
    }

    // 验证 Bearer token 格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      Logger.logSecurity('JWT 认证失败：令牌格式错误', {
        ip: req.ip,
        url: req.originalUrl
      });
      return ResponseFormatter.error(res, 'E0107', '认证令牌格式错误', 401);
    }

    const token = parts[1];

    // 验证 JWT token
    jwt.verify(token, jwtConfig.secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          Logger.logSecurity('JWT 认证失败：令牌已过期', {
            ip: req.ip,
            url: req.originalUrl
          });
          return ResponseFormatter.error(res, 'E0103', 'JWT 令牌已过期', 401);
        }

        Logger.logSecurity('JWT 认证失败：令牌无效', {
          ip: req.ip,
          url: req.originalUrl,
          error: err.message
        });
        return ResponseFormatter.error(res, 'E0102', 'JWT 令牌无效', 401);
      }

      // 将解码后的用户信息附加到请求对象
      req.admin = {
        id: decoded.id,
        username: decoded.username
      };

      Logger.debug('JWT 认证成功', {
        adminId: decoded.id,
        username: decoded.username,
        url: req.originalUrl
      });

      next();
    });
  } catch (error) {
    Logger.error('JWT 认证中间件错误', error);
    return ResponseFormatter.serverError(res, error);
  }
};

/**
 * AppKey 认证中间件
 * 用于客户端 API 的软件识别
 */
const authenticateAppKey = async (req, res, next) => {
  try {
    // 从请求头获取 AppKey
    const appKey = req.headers['x-app-key'];

    if (!appKey) {
      Logger.logSecurity('AppKey 认证失败：未提供 AppKey', {
        ip: req.ip,
        url: req.originalUrl
      });
      return ResponseFormatter.error(res, 'E0104', '未提供 AppKey', 401);
    }

    // 查询软件信息
    const software = await Software.findOne({
      where: { appKey }
    });

    if (!software) {
      Logger.logSecurity('AppKey 认证失败：AppKey 无效', {
        ip: req.ip,
        url: req.originalUrl,
        appKey
      });
      return ResponseFormatter.error(res, 'E0104', 'AppKey 无效', 401);
    }

    // 检查软件是否启用
    if (!software.status) {
      Logger.logSecurity('AppKey 认证失败：软件已禁用', {
        ip: req.ip,
        url: req.originalUrl,
        appKey,
        softwareId: software.id
      });
      return ResponseFormatter.error(res, 'E0105', '软件已禁用', 403);
    }

    // 将软件信息附加到请求对象
    req.software = {
      id: software.id,
      name: software.name,
      appKey: software.appKey,
      publicKey: software.publicKey,
      privateKey: software.privateKey
    };

    Logger.debug('AppKey 认证成功', {
      softwareId: software.id,
      softwareName: software.name,
      url: req.originalUrl
    });

    next();
  } catch (error) {
    Logger.error('AppKey 认证中间件错误', error);
    return ResponseFormatter.serverError(res, error);
  }
};

/**
 * 可选的 JWT 认证中间件
 * 如果提供了 token 则验证，否则继续
 */
const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];

  jwt.verify(token, jwtConfig.secret, (err, decoded) => {
    if (!err && decoded) {
      req.admin = {
        id: decoded.id,
        username: decoded.username
      };
    }
    next();
  });
};

module.exports = {
  authenticateJWT,
  authenticateAppKey,
  optionalJWT
};
