const { OnlineSession, Device, AuthCode } = require('../models');
const { Op } = require('sequelize');
const appConfig = require('../config/app');
const logger = require('../utils/logger');
const CryptoService = require('../utils/crypto');

/**
 * 心跳服务
 * 处理在线会话管理、心跳更新、超时检测等
 */
class HeartbeatService {
  /**
   * 创建在线会话
   * @param {number} deviceId - 设备 ID
   * @param {number} authCodeId - 授权码 ID
   * @param {number} softwareId - 软件 ID
   * @param {string} token - 会话令牌
   * @param {string} ip - IP 地址
   * @param {string} userAgent - User Agent
   * @param {number} tokenExpireHours - 令牌过期时间（小时）
   * @returns {Promise<Object>} 创建的会话对象
   */
  static async createSession(deviceId, authCodeId, softwareId, token, ip = null, userAgent = null, tokenExpireHours = 24) {
    try {
      // 生成令牌哈希
      const tokenHash = CryptoService.sha256(token);
      
      // 计算令牌过期时间
      const tokenExpireTime = new Date();
      tokenExpireTime.setHours(tokenExpireTime.getHours() + tokenExpireHours);
      
      const now = new Date();
      
      // 检查是否已存在该设备的会话
      const existingSession = await OnlineSession.findOne({
        where: {
          deviceId,
          authCodeId,
          isValid: true
        }
      });
      
      if (existingSession) {
        // 更新现有会话
        existingSession.tokenHash = tokenHash;
        existingSession.ip = ip;
        existingSession.userAgent = userAgent;
        existingSession.loginTime = now;
        existingSession.lastHeartbeat = now;
        existingSession.tokenExpireTime = tokenExpireTime;
        existingSession.forceOffline = false;
        existingSession.isValid = true;
        
        await existingSession.save();
        
        logger.info('更新在线会话', {
          sessionId: existingSession.id,
          deviceId,
          authCodeId
        });
        
        return existingSession;
      }
      
      // 创建新会话
      const session = await OnlineSession.create({
        deviceId,
        softwareId,
        authCodeId,
        tokenHash,
        ip,
        userAgent,
        isValid: true,
        loginTime: now,
        lastHeartbeat: now,
        tokenExpireTime,
        forceOffline: false
      });
      
      logger.info('创建在线会话', {
        sessionId: session.id,
        deviceId,
        authCodeId,
        softwareId
      });
      
      return session;
    } catch (error) {
      logger.error('创建在线会话失败', {
        error: error.message,
        deviceId,
        authCodeId
      });
      throw new Error('创建在线会话失败');
    }
  }

  /**
   * 更新心跳时间
   * @param {string} token - 会话令牌
   * @returns {Promise<Object>} { success: boolean, session?: Object, message: string }
   */
  static async updateHeartbeat(token) {
    try {
      // 生成令牌哈希
      const tokenHash = CryptoService.sha256(token);
      
      // 查找会话
      const session = await OnlineSession.findOne({
        where: {
          tokenHash,
          isValid: true
        },
        include: [
          {
            model: Device,
            as: 'device'
          },
          {
            model: AuthCode,
            as: 'authCode'
          }
        ]
      });
      
      if (!session) {
        return {
          success: false,
          message: '会话不存在或已失效'
        };
      }
      
      // 检查是否被强制下线
      if (session.forceOffline) {
        return {
          success: false,
          message: '设备已被强制下线'
        };
      }
      
      // 检查令牌是否过期
      const now = new Date();
      if (session.tokenExpireTime && now > session.tokenExpireTime) {
        // 标记会话为无效
        session.isValid = false;
        await session.save();
        
        return {
          success: false,
          message: '会话令牌已过期'
        };
      }
      
      // 更新心跳时间
      session.lastHeartbeat = now;
      await session.save();
      
      logger.debug('更新心跳时间', {
        sessionId: session.id,
        deviceId: session.deviceId
      });
      
      return {
        success: true,
        session,
        message: '心跳更新成功'
      };
    } catch (error) {
      logger.error('更新心跳失败', {
        error: error.message
      });
      throw new Error('更新心跳失败');
    }
  }

  /**
   * 检查超时会话（定时任务调用）
   * @returns {Promise<number>} 标记为离线的会话数量
   */
  static async checkTimeout() {
    try {
      const timeoutSeconds = appConfig.heartbeatTimeout;
      const timeoutDate = new Date();
      timeoutDate.setSeconds(timeoutDate.getSeconds() - timeoutSeconds);
      
      // 查找超时的会话
      const timeoutSessions = await OnlineSession.findAll({
        where: {
          isValid: true,
          forceOffline: false,
          lastHeartbeat: {
            [Op.lt]: timeoutDate
          }
        }
      });
      
      if (timeoutSessions.length === 0) {
        return 0;
      }
      
      // 标记为离线
      const sessionIds = timeoutSessions.map(s => s.id);
      const updateCount = await OnlineSession.update(
        { isValid: false },
        {
          where: {
            id: {
              [Op.in]: sessionIds
            }
          }
        }
      );
      
      logger.info('检查心跳超时', {
        timeoutCount: updateCount[0],
        timeoutSeconds,
        sessionIds
      });
      
      return updateCount[0];
    } catch (error) {
      logger.error('检查心跳超时失败', {
        error: error.message
      });
      throw new Error('检查心跳超时失败');
    }
  }

  /**
   * 获取在线设备列表
   * @param {number} softwareId - 软件 ID（可选）
   * @param {number} authCodeId - 授权码 ID（可选）
   * @returns {Promise<Array>} 在线设备列表
   */
  static async getOnlineDevices(softwareId = null, authCodeId = null) {
    try {
      const where = {
        isValid: true,
        forceOffline: false
      };
      
      if (softwareId) {
        where.softwareId = softwareId;
      }
      
      if (authCodeId) {
        where.authCodeId = authCodeId;
      }
      
      // 查询在线会话
      const sessions = await OnlineSession.findAll({
        where,
        include: [
          {
            model: Device,
            as: 'device',
            attributes: ['id', 'fingerprint', 'platform', 'osVersion', 'status']
          },
          {
            model: AuthCode,
            as: 'authCode',
            attributes: ['id', 'code', 'isPointCard', 'status']
          }
        ],
        order: [['lastHeartbeat', 'DESC']]
      });
      
      // 计算在线时长
      const now = new Date();
      const onlineDevices = sessions.map(session => {
        const onlineDuration = Math.floor((now - new Date(session.loginTime)) / 1000); // 秒
        const lastHeartbeatAgo = Math.floor((now - new Date(session.lastHeartbeat)) / 1000); // 秒
        
        return {
          sessionId: session.id,
          deviceId: session.deviceId,
          authCodeId: session.authCodeId,
          device: session.device,
          authCode: session.authCode,
          ip: session.ip,
          userAgent: session.userAgent,
          loginTime: session.loginTime,
          lastHeartbeat: session.lastHeartbeat,
          onlineDuration,
          lastHeartbeatAgo,
          tokenExpireTime: session.tokenExpireTime
        };
      });
      
      logger.debug('获取在线设备列表', {
        softwareId,
        authCodeId,
        count: onlineDevices.length
      });
      
      return onlineDevices;
    } catch (error) {
      logger.error('获取在线设备列表失败', {
        error: error.message,
        softwareId,
        authCodeId
      });
      throw new Error('获取在线设备列表失败');
    }
  }

  /**
   * 强制设备下线
   * @param {number} sessionId - 会话 ID
   * @returns {Promise<Object>} { success: boolean, message: string }
   */
  static async forceOffline(sessionId) {
    try {
      // 查找会话
      const session = await OnlineSession.findByPk(sessionId);
      
      if (!session) {
        return {
          success: false,
          message: '会话不存在'
        };
      }
      
      // 标记为强制下线
      session.forceOffline = true;
      session.isValid = false;
      await session.save();
      
      logger.info('强制设备下线', {
        sessionId,
        deviceId: session.deviceId,
        authCodeId: session.authCodeId
      });
      
      return {
        success: true,
        message: '设备已强制下线'
      };
    } catch (error) {
      logger.error('强制设备下线失败', {
        error: error.message,
        sessionId
      });
      throw new Error('强制设备下线失败');
    }
  }

  /**
   * 强制单点登录（将同一授权码的其他会话下线）
   * @param {number} authCodeId - 授权码 ID
   * @param {number} currentSessionId - 当前会话 ID（保留此会话）
   * @returns {Promise<number>} 下线的会话数量
   */
  static async enforceSingleLogin(authCodeId, currentSessionId) {
    try {
      // 查找同一授权码的其他有效会话
      const otherSessions = await OnlineSession.findAll({
        where: {
          authCodeId,
          isValid: true,
          id: {
            [Op.ne]: currentSessionId
          }
        }
      });
      
      if (otherSessions.length === 0) {
        return 0;
      }
      
      // 标记为强制下线
      const sessionIds = otherSessions.map(s => s.id);
      const updateCount = await OnlineSession.update(
        {
          forceOffline: true,
          isValid: false
        },
        {
          where: {
            id: {
              [Op.in]: sessionIds
            }
          }
        }
      );
      
      logger.info('强制单点登录', {
        authCodeId,
        currentSessionId,
        offlineCount: updateCount[0],
        offlineSessionIds: sessionIds
      });
      
      return updateCount[0];
    } catch (error) {
      logger.error('强制单点登录失败', {
        error: error.message,
        authCodeId,
        currentSessionId
      });
      throw new Error('强制单点登录失败');
    }
  }

  /**
   * 验证会话令牌
   * @param {string} token - 会话令牌
   * @returns {Promise<Object>} { valid: boolean, session?: Object, reason?: string }
   */
  static async verifySession(token) {
    try {
      const tokenHash = CryptoService.sha256(token);
      
      const session = await OnlineSession.findOne({
        where: {
          tokenHash,
          isValid: true
        },
        include: [
          {
            model: Device,
            as: 'device'
          },
          {
            model: AuthCode,
            as: 'authCode'
          }
        ]
      });
      
      if (!session) {
        return {
          valid: false,
          reason: '会话不存在或已失效'
        };
      }
      
      if (session.forceOffline) {
        return {
          valid: false,
          reason: '设备已被强制下线'
        };
      }
      
      const now = new Date();
      if (session.tokenExpireTime && now > session.tokenExpireTime) {
        // 标记会话为无效
        session.isValid = false;
        await session.save();
        
        return {
          valid: false,
          reason: '会话令牌已过期'
        };
      }
      
      return {
        valid: true,
        session
      };
    } catch (error) {
      logger.error('验证会话令牌失败', {
        error: error.message
      });
      throw new Error('验证会话令牌失败');
    }
  }
}

module.exports = HeartbeatService;
