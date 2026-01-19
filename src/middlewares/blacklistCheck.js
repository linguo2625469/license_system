const BlacklistService = require('../services/blacklistService');
const ResponseFormatter = require('../utils/response');
const Logger = require('../utils/logger');

/**
 * IP 黑名单检查中间件
 * 用于客户端 API 的 IP 黑名单验证
 */
const checkIpBlacklist = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const softwareId = req.software ? req.software.id : null;

    // 检查 IP 是否在黑名单中
    const blacklistCheck = await BlacklistService.isIpBlacklisted(ip, softwareId);

    if (blacklistCheck.isBlacklisted) {
      Logger.logSecurity('IP 黑名单拦截', {
        ip,
        softwareId,
        reason: blacklistCheck.reason,
        url: req.originalUrl
      });

      return ResponseFormatter.error(
        res,
        'E0304',
        blacklistCheck.reason || 'IP 已被封禁',
        403
      );
    }

    next();
  } catch (error) {
    Logger.error('IP 黑名单检查中间件错误', error);
    // 如果检查失败，为了安全起见，继续执行（避免因为检查失败导致服务不可用）
    next();
  }
};

/**
 * 设备黑名单检查中间件
 * 用于客户端 API 的设备黑名单验证
 * 需要在请求体中包含 fingerprint 字段
 */
const checkDeviceBlacklist = async (req, res, next) => {
  try {
    const fingerprint = req.body.fingerprint;
    const softwareId = req.software ? req.software.id : null;

    // 如果没有提供指纹，跳过检查（由后续业务逻辑处理）
    if (!fingerprint) {
      return next();
    }

    // 检查设备是否在黑名单中
    const blacklistCheck = await BlacklistService.isDeviceBlacklisted(
      fingerprint,
      softwareId
    );

    if (blacklistCheck.isBlacklisted) {
      Logger.logSecurity('设备黑名单拦截', {
        fingerprint,
        softwareId,
        reason: blacklistCheck.reason,
        url: req.originalUrl,
        ip: req.ip
      });

      return ResponseFormatter.error(
        res,
        'E0303',
        blacklistCheck.reason || '设备已被封禁',
        403
      );
    }

    next();
  } catch (error) {
    Logger.error('设备黑名单检查中间件错误', error);
    // 如果检查失败，为了安全起见，继续执行（避免因为检查失败导致服务不可用）
    next();
  }
};

module.exports = {
  checkIpBlacklist,
  checkDeviceBlacklist
};
