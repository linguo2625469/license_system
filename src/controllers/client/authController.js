const LicenseService = require('../../services/licenseService');
const DeviceService = require('../../services/deviceService');
const HeartbeatService = require('../../services/heartbeatService');
const { AuthLog, AuthCode } = require('../../models');
const ResponseFormatter = require('../../utils/response');
const CryptoService = require('../../utils/crypto');
const logger = require('../../utils/logger');

/**
 * 客户端授权控制器
 * 处理授权码激活、验证等操作
 */
class ClientAuthController {
  /**
   * 激活授权码
   * POST /api/client/auth/activate
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.code - 授权码
   * @param {string} req.body.fingerprint - 设备指纹
   * @param {Object} req.body.deviceInfo - 设备信息
   * @param {Object} res - 响应对象
   */
  static async activate(req, res) {
    try {
      const { code, fingerprint, deviceInfo } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const softwareId = req.software?.id; // 从 AppKey 中间件获取

      // 验证必填字段
      if (!code || !fingerprint || !deviceInfo) {
        return ResponseFormatter.error(res, 'E9902', '缺少必填参数', 400);
      }

      // 激活授权码
      const result = await LicenseService.activateLicense(
        code,
        fingerprint,
        deviceInfo,
        ip
      );

      const { authCode, device, isNewActivation } = result;

      // 生成会话令牌
      const token = CryptoService.generateUUID();

      // 创建在线会话
      const userAgent = req.get('user-agent') || null;
      await HeartbeatService.createSession(
        device.id,
        authCode.id,
        authCode.softwareId,
        token,
        ip,
        userAgent,
        24 // 令牌有效期 24 小时
      );

      // 如果授权码设置为单点登录，强制其他设备下线
      if (authCode.singleOnline) {
        const session = await HeartbeatService.verifySession(token);
        if (session.valid) {
          await HeartbeatService.enforceSingleLogin(authCode.id, session.session.id);
        }
      }

      // 记录激活日志
      await AuthLog.create({
        softwareId: authCode.softwareId,
        action: isNewActivation ? 'activate' : 'reactivate',
        authCodeId: authCode.id,
        deviceId: device.id,
        fingerprint,
        ip,
        responseCode: 200,
        responseMsg: '激活成功'
      });

      // 构建响应数据
      const responseData = {
        token,
        authCode: {
          code: authCode.code,
          isPointCard: authCode.isPointCard,
          status: authCode.status
        },
        device: {
          id: device.id,
          fingerprint: device.fingerprint,
          platform: device.platform
        }
      };

      // 根据授权类型添加相应信息
      if (authCode.isPointCard) {
        responseData.authCode.totalPoints = authCode.totalPoints;
        responseData.authCode.remainingPoints = authCode.remainingPoints;
        responseData.authCode.deductType = authCode.deductType;
        responseData.authCode.deductAmount = authCode.deductAmount;
      } else {
        responseData.authCode.cardType = authCode.cardType;
        responseData.authCode.duration = authCode.duration;
        responseData.authCode.startTime = authCode.startTime;
        responseData.authCode.expireTime = authCode.expireTime;
      }

      logger.info('客户端激活成功', {
        code,
        deviceId: device.id,
        isNewActivation
      });

      return ResponseFormatter.success(res, responseData, isNewActivation ? '激活成功' : '设备已激活');
    } catch (error) {
      logger.error('客户端激活失败', {
        error: error.message,
        code: req.body.code
      });

      // 记录失败日志
      try {
        await AuthLog.create({
          softwareId: req.software?.id,
          action: 'activate',
          fingerprint: req.body.fingerprint,
          ip: req.ip || req.connection.remoteAddress,
          responseCode: 400,
          responseMsg: error.message
        });
      } catch (logError) {
        logger.error('记录激活失败日志失败', { error: logError.message });
      }

      // 根据错误类型返回相应的错误码
      let errorCode = 'E0201';
      let statusCode = 400;

      if (error.message.includes('不存在')) {
        errorCode = 'E0201';
      } else if (error.message.includes('已过期')) {
        errorCode = 'E0202';
      } else if (error.message.includes('已被禁用')) {
        errorCode = 'E0203';
      } else if (error.message.includes('设备数量已达上限')) {
        errorCode = 'E0204';
      } else if (error.message.includes('设备指纹格式无效')) {
        errorCode = 'E0301';
      } else if (error.message.includes('设备已被封禁') || error.message.includes('黑名单')) {
        errorCode = 'E0303';
      } else if (error.message.includes('软件已禁用')) {
        errorCode = 'E0105';
      }

      return ResponseFormatter.error(res, errorCode, error.message, statusCode);
    }
  }

  /**
   * 换绑设备
   * POST /api/client/auth/rebind
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.code - 授权码
   * @param {string} req.body.oldFingerprint - 旧设备指纹
   * @param {string} req.body.newFingerprint - 新设备指纹
   * @param {Object} req.body.deviceInfo - 新设备信息
   * @param {Object} res - 响应对象
   */
  static async rebind(req, res) {
    try {
      const { code, oldFingerprint, newFingerprint, deviceInfo } = req.body;
      const ip = req.ip || req.connection.remoteAddress;
      const softwareId = req.software?.id;

      // 验证必填字段
      if (!code || !oldFingerprint || !newFingerprint || !deviceInfo) {
        return ResponseFormatter.error(res, 'E9902', '缺少必填参数', 400);
      }

      // 验证新旧指纹不能相同
      if (oldFingerprint === newFingerprint) {
        return ResponseFormatter.error(res, 'E9902', '新旧设备指纹不能相同', 400);
      }

      // 执行换绑操作
      const result = await DeviceService.rebindDevice(
        code,
        oldFingerprint,
        newFingerprint,
        deviceInfo,
        ip
      );

      const { authCode, oldDevice, newDevice } = result;

      // 生成新的会话令牌
      const token = CryptoService.generateUUID();

      // 创建在线会话
      const userAgent = req.get('user-agent') || null;
      await HeartbeatService.createSession(
        newDevice.id,
        authCode.id,
        authCode.softwareId,
        token,
        ip,
        userAgent,
        24 // 令牌有效期 24 小时
      );

      // 如果授权码设置为单点登录，强制其他设备下线
      if (authCode.singleOnline) {
        const session = await HeartbeatService.verifySession(token);
        if (session.valid) {
          await HeartbeatService.enforceSingleLogin(authCode.id, session.session.id);
        }
      }

      // 记录换绑日志
      await AuthLog.create({
        softwareId: authCode.softwareId,
        action: 'rebind',
        authCodeId: authCode.id,
        deviceId: newDevice.id,
        fingerprint: newFingerprint,
        ip,
        responseCode: 200,
        responseMsg: `换绑成功，从设备 ${oldDevice.id} 换绑到设备 ${newDevice.id}`
      });

      // 构建响应数据
      const responseData = {
        token,
        authCode: {
          code: authCode.code,
          isPointCard: authCode.isPointCard,
          status: authCode.status,
          rebindCount: authCode.rebindCount,
          allowRebind: authCode.allowRebind,
          remainingRebinds: authCode.allowRebind - authCode.rebindCount
        },
        oldDevice: {
          id: oldDevice.id,
          fingerprint: oldDevice.fingerprint
        },
        newDevice: {
          id: newDevice.id,
          fingerprint: newDevice.fingerprint,
          platform: newDevice.platform
        }
      };

      // 根据授权类型添加相应信息
      if (authCode.isPointCard) {
        responseData.authCode.totalPoints = authCode.totalPoints;
        responseData.authCode.remainingPoints = authCode.remainingPoints;
        responseData.authCode.deductType = authCode.deductType;
      } else {
        responseData.authCode.cardType = authCode.cardType;
        responseData.authCode.startTime = authCode.startTime;
        responseData.authCode.expireTime = authCode.expireTime;
      }

      logger.info('客户端换绑成功', {
        code,
        oldDeviceId: oldDevice.id,
        newDeviceId: newDevice.id,
        rebindCount: authCode.rebindCount
      });

      return ResponseFormatter.success(res, responseData, '换绑成功');
    } catch (error) {
      logger.error('客户端换绑失败', {
        error: error.message,
        code: req.body.code,
        oldFingerprint: req.body.oldFingerprint,
        newFingerprint: req.body.newFingerprint
      });

      // 记录失败日志
      try {
        await AuthLog.create({
          softwareId: req.software?.id,
          action: 'rebind',
          fingerprint: req.body.newFingerprint,
          ip: req.ip || req.connection.remoteAddress,
          responseCode: 400,
          responseMsg: error.message
        });
      } catch (logError) {
        logger.error('记录换绑失败日志失败', { error: logError.message });
      }

      // 根据错误类型返回相应的错误码
      let errorCode = 'E0201';
      let statusCode = 400;

      if (error.message.includes('不存在')) {
        errorCode = 'E0201';
      } else if (error.message.includes('已过期')) {
        errorCode = 'E0202';
      } else if (error.message.includes('已被禁用')) {
        errorCode = 'E0203';
      } else if (error.message.includes('换绑次数已达上限')) {
        errorCode = 'E0205';
      } else if (error.message.includes('设备指纹格式无效')) {
        errorCode = 'E0301';
      } else if (error.message.includes('未绑定')) {
        errorCode = 'E0302';
      } else if (error.message.includes('已被封禁') || error.message.includes('黑名单')) {
        errorCode = 'E0303';
      } else if (error.message.includes('软件已禁用')) {
        errorCode = 'E0105';
      } else if (error.message.includes('未激活')) {
        errorCode = 'E0207';
      }

      return ResponseFormatter.error(res, errorCode, error.message, statusCode);
    }
  }

  /**
   * 验证授权状态
   * POST /api/client/auth/verify
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.code - 授权码
   * @param {string} req.body.fingerprint - 设备指纹
   * @param {Object} res - 响应对象
   */
  static async verify(req, res) {
    try {
      const { code, fingerprint } = req.body;
      const ip = req.ip || req.connection.remoteAddress;

      // 验证必填字段
      if (!code || !fingerprint) {
        return ResponseFormatter.error(res, 'E9902', '缺少必填参数', 400);
      }

      // 执行授权验证
      const result = await LicenseService.verifyLicense(code, fingerprint, ip);

      // 记录验证日志
      await AuthLog.create({
        softwareId: req.software?.id,
        action: 'verify',
        authCodeId: result.authCode?.id,
        deviceId: result.device?.id,
        fingerprint,
        ip,
        responseCode: result.valid ? 200 : 400,
        responseMsg: result.valid ? '验证成功' : result.reason
      });

      if (!result.valid) {
        // 验证失败，返回错误
        let errorCode = 'E0201';

        if (result.reason.includes('不存在')) {
          errorCode = 'E0201';
        } else if (result.reason.includes('已过期') || result.reason.includes('点数已用完')) {
          errorCode = 'E0202';
        } else if (result.reason.includes('已被禁用')) {
          errorCode = 'E0203';
        } else if (result.reason.includes('未激活')) {
          errorCode = 'E0207';
        } else if (result.reason.includes('设备指纹格式无效')) {
          errorCode = 'E0301';
        } else if (result.reason.includes('未绑定')) {
          errorCode = 'E0302';
        } else if (result.reason.includes('已被封禁') || result.reason.includes('黑名单')) {
          errorCode = result.reason.includes('IP') ? 'E0304' : 'E0303';
        } else if (result.reason.includes('软件已禁用')) {
          errorCode = 'E0105';
        } else if (result.reason.includes('已被停用')) {
          errorCode = 'E0302';
        }

        logger.warn('授权验证失败', {
          code,
          fingerprint,
          reason: result.reason
        });

        return ResponseFormatter.error(res, errorCode, result.reason, 400);
      }

      // 验证成功，构建响应数据
      const { authCode, device } = result;

      const responseData = {
        valid: true,
        authCode: {
          code: authCode.code,
          isPointCard: authCode.isPointCard,
          status: authCode.status
        },
        device: {
          id: device.id,
          fingerprint: device.fingerprint,
          platform: device.platform,
          status: device.status
        }
      };

      // 根据授权类型添加相应信息
      if (authCode.isPointCard) {
        responseData.authCode.totalPoints = authCode.totalPoints;
        responseData.authCode.remainingPoints = authCode.remainingPoints;
        responseData.authCode.deductType = authCode.deductType;
        responseData.authCode.deductAmount = authCode.deductAmount;
      } else {
        responseData.authCode.cardType = authCode.cardType;
        responseData.authCode.duration = authCode.duration;
        responseData.authCode.startTime = authCode.startTime;
        responseData.authCode.expireTime = authCode.expireTime;
        
        // 计算剩余时间（秒）
        if (authCode.expireTime) {
          const now = new Date();
          const expireTime = new Date(authCode.expireTime);
          const remainingSeconds = Math.max(0, Math.floor((expireTime - now) / 1000));
          responseData.authCode.remainingSeconds = remainingSeconds;
        }
      }

      logger.info('授权验证成功', {
        code,
        deviceId: device.id,
        fingerprint
      });

      return ResponseFormatter.success(res, responseData, '验证成功');
    } catch (error) {
      logger.error('授权验证失败', {
        error: error.message,
        code: req.body.code,
        fingerprint: req.body.fingerprint
      });

      // 记录失败日志
      try {
        await AuthLog.create({
          softwareId: req.software?.id,
          action: 'verify',
          fingerprint: req.body.fingerprint,
          ip: req.ip || req.connection.remoteAddress,
          responseCode: 500,
          responseMsg: error.message
        });
      } catch (logError) {
        logger.error('记录验证失败日志失败', { error: logError.message });
      }

      return ResponseFormatter.error(res, 'E9904', '服务器内部错误', 500);
    }
  }

  /**
   * 扣除点卡点数
   * POST /api/client/points/deduct
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.code - 授权码
   * @param {string} req.body.fingerprint - 设备指纹
   * @param {number} [req.body.amount] - 扣除点数（可选，默认使用配置的 deductAmount）
   * @param {string} [req.body.reason] - 扣点原因
   * @param {Object} res - 响应对象
   */
  static async deductPoints(req, res) {
    try {
      const { code, fingerprint, amount, reason } = req.body;
      const ip = req.ip || req.connection.remoteAddress;

      // 验证必填字段
      if (!code || !fingerprint) {
        return ResponseFormatter.error(res, 'E9902', '缺少必填参数', 400);
      }

      // 首先验证授权状态
      const verifyResult = await LicenseService.verifyLicense(code, fingerprint, ip);

      if (!verifyResult.valid) {
        // 验证失败，返回错误
        let errorCode = 'E0201';

        if (verifyResult.reason.includes('不存在')) {
          errorCode = 'E0201';
        } else if (verifyResult.reason.includes('已过期') || verifyResult.reason.includes('点数已用完')) {
          errorCode = 'E0202';
        } else if (verifyResult.reason.includes('已被禁用')) {
          errorCode = 'E0203';
        } else if (verifyResult.reason.includes('未激活')) {
          errorCode = 'E0207';
        } else if (verifyResult.reason.includes('设备指纹格式无效')) {
          errorCode = 'E0301';
        } else if (verifyResult.reason.includes('未绑定')) {
          errorCode = 'E0302';
        } else if (verifyResult.reason.includes('已被封禁') || verifyResult.reason.includes('黑名单')) {
          errorCode = verifyResult.reason.includes('IP') ? 'E0304' : 'E0303';
        }

        logger.warn('扣点前验证失败', {
          code,
          fingerprint,
          reason: verifyResult.reason
        });

        return ResponseFormatter.error(res, errorCode, verifyResult.reason, 400);
      }

      const { authCode, device } = verifyResult;

      // 检查是否为点卡
      if (!authCode.isPointCard) {
        return ResponseFormatter.error(res, 'E0206', '该授权码不是点卡类型', 400);
      }

      // 执行扣点操作
      const deductResult = await LicenseService.deductPoints(
        authCode.id,
        amount,
        reason,
        device.id,
        ip
      );

      // 记录扣点日志到授权日志
      await AuthLog.create({
        softwareId: authCode.softwareId,
        action: 'deduct_points',
        authCodeId: authCode.id,
        deviceId: device.id,
        fingerprint,
        ip,
        responseCode: 200,
        responseMsg: `扣点成功，剩余点数: ${deductResult.remainingPoints}`
      });

      // 构建响应数据
      const responseData = {
        success: true,
        authCode: {
          code: authCode.code,
          totalPoints: authCode.totalPoints,
          remainingPoints: deductResult.remainingPoints,
          deductType: authCode.deductType,
          deductAmount: authCode.deductAmount,
          status: deductResult.authCode.status
        },
        deductInfo: {
          deductedAmount: amount || authCode.deductAmount,
          reason: reason || null
        }
      };

      logger.info('点卡扣点成功', {
        code,
        deviceId: device.id,
        deductedAmount: amount || authCode.deductAmount,
        remainingPoints: deductResult.remainingPoints
      });

      return ResponseFormatter.success(res, responseData, '扣点成功');
    } catch (error) {
      logger.error('点卡扣点失败', {
        error: error.message,
        code: req.body.code,
        fingerprint: req.body.fingerprint,
        amount: req.body.amount
      });

      // 记录失败日志
      try {
        await AuthLog.create({
          softwareId: req.software?.id,
          action: 'deduct_points',
          fingerprint: req.body.fingerprint,
          ip: req.ip || req.connection.remoteAddress,
          responseCode: 400,
          responseMsg: error.message
        });
      } catch (logError) {
        logger.error('记录扣点失败日志失败', { error: logError.message });
      }

      // 根据错误类型返回相应的错误码
      let errorCode = 'E0206';
      let statusCode = 400;

      if (error.message.includes('不存在')) {
        errorCode = 'E0201';
      } else if (error.message.includes('点数不足')) {
        errorCode = 'E0206';
      } else if (error.message.includes('已过期')) {
        errorCode = 'E0202';
      } else if (error.message.includes('已被禁用')) {
        errorCode = 'E0203';
      } else if (error.message.includes('未激活')) {
        errorCode = 'E0207';
      } else if (error.message.includes('不是点卡类型')) {
        errorCode = 'E0206';
      } else if (error.message.includes('扣除点数必须大于')) {
        errorCode = 'E9902';
      }

      return ResponseFormatter.error(res, errorCode, error.message, statusCode);
    }
  }

  /**
   * 发送心跳
   * POST /api/client/heartbeat
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.token - 客户端token
   * @param {Object} res - 响应对象
   */
  static async heartbeat(req, res) {
    try {
      // 从 Authorization header 获取令牌
      const { token } = req.body;
      if (!token ) {
        return ResponseFormatter.error(res, 'E0401', '缺少会话令牌', 401);
      }
      
      // 更新心跳
      const result = await HeartbeatService.updateHeartbeat(token);
      
      if (!result.success) {
        // 心跳更新失败
        let errorCode = 'E0401';
        
        if (result.message.includes('不存在') || result.message.includes('失效')) {
          errorCode = 'E0401';
        } else if (result.message.includes('强制下线')) {
          errorCode = 'E0403';
        } else if (result.message.includes('过期')) {
          errorCode = 'E0402';
        }
        
        logger.warn('心跳更新失败', {
          reason: result.message
        });
        
        return ResponseFormatter.error(res, errorCode, result.message, 401);
      }
      
      // 心跳成功
      const responseData = {
        online: true,
        serverTime: Date.now(),
        lastHeartbeat: result.session.lastHeartbeat
      };
      
      logger.debug('心跳更新成功', {
        sessionId: result.session.id,
        deviceId: result.session.deviceId
      });
      
      return ResponseFormatter.success(res, responseData, '心跳成功');
    } catch (error) {
      logger.error('心跳处理失败', {
        error: error.message
      });
      
      return ResponseFormatter.error(res, 'E9904', '服务器内部错误', 500);
    }
  }
}

module.exports = ClientAuthController;
