const { AuthCode, Software, Device } = require('../models');
const { Op } = require('sequelize');
const CryptoService = require('../utils/crypto');
const DeviceService = require('./deviceService');
const BlacklistService = require('./blacklistService');
const FingerprintService = require('../utils/fingerprint');
const logger = require('../utils/logger');

/**
 * 授权码管理服务
 * 处理授权码的生成、查询、更新、删除和激活
 */
class LicenseService {
  /**
   * 批量生成唯一授权码
   * @param {number} softwareId - 软件 ID
   * @param {Object} config - 授权码配置
   * @param {boolean} config.isPointCard - 是否为点卡
   * @param {string} [config.cardType] - 时长卡类型
   * @param {number} [config.duration] - 时长数值
   * @param {string} [config.activateMode] - 激活模式
   * @param {Date} [config.startTime] - 定时激活开始时间
   * @param {number} [config.totalPoints] - 点卡总点数
   * @param {string} [config.deductType] - 扣点类型
   * @param {number} [config.deductAmount] - 每次扣点数量
   * @param {number} [config.maxDevices] - 最大设备数
   * @param {number} [config.allowRebind] - 允许换绑次数
   * @param {boolean} [config.singleOnline] - 单点登录
   * @param {string} [config.remark] - 备注
   * @param {number} count - 生成数量
   * @returns {Promise<Array>} 生成的授权码数组
   */
  static async generateLicenses(softwareId, config, count) {
    try {
      // 验证软件是否存在
      const software = await Software.findByPk(softwareId);
      if (!software) {
        throw new Error('软件不存在');
      }

      // 生成唯一授权码
      const codes = [];
      const existingCodes = new Set();
      
      // 获取已存在的授权码（用于去重）
      const existing = await AuthCode.findAll({
        attributes: ['code'],
        raw: true
      });
      existing.forEach(item => existingCodes.add(item.code));

      // 生成指定数量的唯一授权码
      while (codes.length < count) {
        const code = this._generateLicenseCode();
        
        // 确保唯一性
        if (!existingCodes.has(code) && !codes.includes(code)) {
          codes.push(code);
          existingCodes.add(code);
        }
      }

      // 准备批量插入的数据
      const authCodes = codes.map(code => {
        const authCodeData = {
          softwareId,
          code,
          isPointCard: config.isPointCard || false,
          maxDevices: config.maxDevices || 1,
          allowRebind: config.allowRebind || 0,
          rebindCount: 0,
          singleOnline: config.singleOnline !== undefined ? config.singleOnline : true,
          status: 'unused',
          remark: config.remark || null
        };

        // 时长卡配置
        if (!config.isPointCard) {
          authCodeData.cardType = config.cardType || 'day';
          authCodeData.duration = config.duration || 1;
          authCodeData.activateMode = config.activateMode || 'first_use';
          
          // 如果是定时激活模式，需要设置开始时间和到期时间
          if (config.activateMode === 'scheduled' && config.startTime) {
            authCodeData.startTime = config.startTime;
            authCodeData.expireTime = this._calculateExpireTime(
              config.startTime,
              config.cardType,
              config.duration
            );
          }
        } else {
          // 点卡配置
          authCodeData.totalPoints = config.totalPoints || 0;
          authCodeData.remainingPoints = config.totalPoints || 0;
          authCodeData.deductType = config.deductType || 'per_use';
          authCodeData.deductAmount = config.deductAmount || 1;
        }

        return authCodeData;
      });

      // 批量创建授权码
      const createdAuthCodes = await AuthCode.bulkCreate(authCodes);

      logger.info('批量生成授权码成功', {
        softwareId,
        count: createdAuthCodes.length,
        isPointCard: config.isPointCard
      });

      return createdAuthCodes;
    } catch (error) {
      logger.error('批量生成授权码失败', {
        error: error.message,
        softwareId,
        count
      });
      throw error;
    }
  }

  /**
   * 获取授权码列表
   * @param {Object} options - 查询选项
   * @param {number} [options.softwareId] - 软件 ID
   * @param {string} [options.status] - 状态筛选
   * @param {boolean} [options.isPointCard] - 是否为点卡
   * @param {string} [options.search] - 搜索关键词（授权码）
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=10] - 每页数量
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getLicenseList(options = {}) {
    try {
      const {
        softwareId,
        status,
        isPointCard,
        search,
        page = 1,
        limit = 10
      } = options;

      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      
      if (softwareId) {
        where.softwareId = softwareId;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (isPointCard !== undefined) {
        where.isPointCard = isPointCard;
      }
      
      if (search) {
        where.code = {
          [Op.like]: `%${search}%`
        };
      }

      // 查询授权码列表
      const { count, rows } = await AuthCode.findAndCountAll({
        where,
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        items: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } catch (error) {
      logger.error('获取授权码列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 获取授权码详情
   * @param {number} authCodeId - 授权码 ID
   * @returns {Promise<Object>} 授权码对象（包含关联的设备信息）
   */
  static async getLicenseDetail(authCodeId) {
    try {
      const authCode = await AuthCode.findByPk(authCodeId, {
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey', 'version']
          },
          {
            model: Device,
            as: 'devices',
            attributes: [
              'id', 'fingerprint', 'platform', 'osVersion',
              'status', 'lastHeartbeat', 'lastIp', 'createdAt'
            ]
          }
        ]
      });

      if (!authCode) {
        return null;
      }

      return authCode;
    } catch (error) {
      logger.error('获取授权码详情失败', {
        error: error.message,
        authCodeId
      });
      throw error;
    }
  }

  /**
   * 根据授权码字符串获取授权码
   * @param {string} code - 授权码字符串
   * @returns {Promise<Object>} 授权码对象
   */
  static async getLicenseByCode(code) {
    try {
      const authCode = await AuthCode.findOne({
        where: { code },
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey', 'status']
          }
        ]
      });

      return authCode;
    } catch (error) {
      logger.error('根据授权码获取失败', {
        error: error.message,
        code
      });
      throw error;
    }
  }

  /**
   * 更新授权码
   * @param {number} authCodeId - 授权码 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.status] - 状态
   * @param {number} [data.maxDevices] - 最大设备数
   * @param {number} [data.allowRebind] - 允许换绑次数
   * @param {boolean} [data.singleOnline] - 单点登录
   * @param {string} [data.remark] - 备注
   * @param {Date} [data.startTime] - 开始时间（定时激活）
   * @param {Date} [data.expireTime] - 到期时间
   * @param {number} [data.remainingPoints] - 剩余点数
   * @returns {Promise<Object>} 更新后的授权码对象
   */
  static async updateLicense(authCodeId, data) {
    try {
      const authCode = await AuthCode.findByPk(authCodeId);

      if (!authCode) {
        return null;
      }

      // 检查是否手动激活授权码
      const isManualActivation = 
        data.status === 'active' && 
        authCode.status === 'unused' && 
        !authCode.usedTime;

      // 更新允许的字段
      const updateData = {};
      
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.maxDevices !== undefined) {
        updateData.maxDevices = data.maxDevices;
      }
      if (data.allowRebind !== undefined) {
        updateData.allowRebind = data.allowRebind;
      }
      if (data.singleOnline !== undefined) {
        updateData.singleOnline = data.singleOnline;
      }
      if (data.remark !== undefined) {
        updateData.remark = data.remark;
      }
      if (data.startTime !== undefined) {
        updateData.startTime = data.startTime;
      }
      if (data.expireTime !== undefined) {
        updateData.expireTime = data.expireTime;
      }
      if (data.remainingPoints !== undefined) {
        updateData.remainingPoints = data.remainingPoints;
      }

      // 如果是手动激活，自动设置激活时间和到期时间
      if (isManualActivation) {
        const now = new Date();
        updateData.usedTime = now;

        // 如果是时长卡且没有手动设置到期时间，自动计算
        if (!authCode.isPointCard && !data.expireTime) {
          if (authCode.cardType === 'permanent') {
            // 永久卡设置为 100 年后
            updateData.expireTime = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
          } else if (authCode.cardType && authCode.duration) {
            // 根据卡类型和时长计算到期时间
            const timeUnits = {
              minute: 60 * 1000,
              hour: 60 * 60 * 1000,
              day: 24 * 60 * 60 * 1000,
              week: 7 * 24 * 60 * 60 * 1000,
              month: 30 * 24 * 60 * 60 * 1000,
              quarter: 90 * 24 * 60 * 60 * 1000,
              year: 365 * 24 * 60 * 60 * 1000
            };

            const durationMs = authCode.duration * (timeUnits[authCode.cardType] || 0);
            
            // 如果是定时激活且有开始时间，从开始时间计算
            if (authCode.activateMode === 'scheduled' && authCode.startTime) {
              const startTime = new Date(authCode.startTime);
              updateData.expireTime = new Date(startTime.getTime() + durationMs);
            } else {
              // 首次使用激活，从当前时间计算
              updateData.expireTime = new Date(now.getTime() + durationMs);
            }
          }
        }

        // 如果是点卡，设置剩余点数
        if (authCode.isPointCard && authCode.totalPoints && !data.remainingPoints) {
          updateData.remainingPoints = authCode.totalPoints;
        }

        logger.info('授权码手动激活', {
          authCodeId,
          code: authCode.code,
          cardType: authCode.cardType,
          isPointCard: authCode.isPointCard,
          usedTime: updateData.usedTime,
          expireTime: updateData.expireTime,
          remainingPoints: updateData.remainingPoints
        });
      }

      await authCode.update(updateData);

      logger.info('授权码更新成功', {
        authCodeId,
        code: authCode.code,
        updateData,
        isManualActivation
      });

      return authCode;
    } catch (error) {
      logger.error('更新授权码失败', {
        error: error.message,
        authCodeId,
        data
      });
      throw error;
    }
  }

  /**
   * 调整授权码时间（增加或减少）
   * @param {number} authCodeId - 授权码 ID
   * @param {Object} adjustment - 调整参数
   * @param {string} adjustment.type - 调整类型：'add' 增加, 'subtract' 减少
   * @param {number} adjustment.value - 调整数值
   * @param {string} adjustment.unit - 时间单位：'minute', 'hour', 'day', 'week', 'month', 'year'
   * @param {string} [adjustment.reason] - 调整原因
   * @returns {Promise<Object>} 更新后的授权码对象
   */
  static async adjustLicenseTime(authCodeId, adjustment) {
    try {
      const authCode = await AuthCode.findByPk(authCodeId);

      if (!authCode) {
        throw new Error('授权码不存在');
      }

      // 只有时长卡才能调整时间
      if (authCode.isPointCard) {
        throw new Error('点卡不支持时间调整');
      }

      // 永久卡不需要调整时间
      if (authCode.cardType === 'permanent') {
        throw new Error('永久卡不需要调整时间');
      }

      // 未激活的卡不能调整时间
      if (authCode.status === 'unused') {
        throw new Error('未激活的授权码不能调整时间');
      }

      if (!authCode.expireTime) {
        throw new Error('授权码没有到期时间');
      }

      const { type, value, unit, reason } = adjustment;

      // 计算时间调整量（毫秒）
      const timeUnits = {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };

      if (!timeUnits[unit]) {
        throw new Error('无效的时间单位');
      }

      const adjustmentMs = value * timeUnits[unit];
      const currentExpireTime = new Date(authCode.expireTime);
      let newExpireTime;

      if (type === 'add') {
        // 增加时间
        newExpireTime = new Date(currentExpireTime.getTime() + adjustmentMs);
      } else if (type === 'subtract') {
        // 减少时间
        newExpireTime = new Date(currentExpireTime.getTime() - adjustmentMs);
        
        // 确保不会减少到当前时间之前
        const now = new Date();
        if (newExpireTime < now) {
          newExpireTime = now;
        }
      } else {
        throw new Error('无效的调整类型，必须是 add 或 subtract');
      }

      // 更新到期时间
      await authCode.update({
        expireTime: newExpireTime
      });

      // 检查是否需要更新状态
      const now = new Date();
      if (newExpireTime <= now && authCode.status === 'active') {
        await authCode.update({ status: 'expired' });
      } else if (newExpireTime > now && authCode.status === 'expired') {
        await authCode.update({ status: 'active' });
      }

      logger.info('授权码时间调整成功', {
        authCodeId,
        code: authCode.code,
        type,
        value,
        unit,
        reason,
        oldExpireTime: currentExpireTime,
        newExpireTime
      });

      return {
        id: authCode.id,
        code: authCode.code,
        oldExpireTime: currentExpireTime,
        newExpireTime,
        adjustment: `${type === 'add' ? '+' : '-'}${value} ${unit}`,
        status: authCode.status
      };
    } catch (error) {
      logger.error('调整授权码时间失败', {
        error: error.message,
        authCodeId,
        adjustment
      });
      throw error;
    }
  }

  /**
   * 删除授权码
   * 注意：会解绑所有关联设备
   * @param {number} authCodeId - 授权码 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteLicense(authCodeId) {
    try {
      const authCode = await AuthCode.findByPk(authCodeId);

      if (!authCode) {
        return false;
      }

      // 解绑所有关联设备
      await Device.update(
        { authCodeId: null, status: 'inactive' },
        { where: { authCodeId } }
      );

      // 删除授权码
      await authCode.destroy();

      logger.info('授权码删除成功', {
        authCodeId,
        code: authCode.code
      });

      return true;
    } catch (error) {
      logger.error('删除授权码失败', {
        error: error.message,
        authCodeId
      });
      throw error;
    }
  }

  /**
   * 激活授权码
   * @param {string} code - 授权码
   * @param {string} fingerprint - 设备指纹
   * @param {Object} deviceInfo - 设备信息
   * @param {string} [ip] - IP 地址
   * @returns {Promise<Object>} { authCode, device, token }
   */
  static async activateLicense(code, fingerprint, deviceInfo, ip = null) {
    try {
      // 验证设备指纹格式
      if (!FingerprintService.verifyFingerprint(fingerprint)) {
        throw new Error('设备指纹格式无效');
      }

      // 获取授权码
      const authCode = await AuthCode.findOne({
        where: { code },
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey', 'status']
          }
        ]
      });

      if (!authCode) {
        throw new Error('授权码不存在');
      }

      // 检查软件是否启用
      if (!authCode.software.status) {
        throw new Error('软件已禁用');
      }

      // 检查授权码状态
      if (authCode.status === 'disabled') {
        throw new Error('授权码已被禁用');
      }

      if (authCode.status === 'expired') {
        throw new Error('授权码已过期');
      }

      // 检查设备黑名单
      const blacklistCheck = await BlacklistService.isDeviceBlacklisted(
        fingerprint,
        authCode.softwareId
      );

      if (blacklistCheck.isBlacklisted) {
        throw new Error(blacklistCheck.reason || '设备已被封禁');
      }

      // 检查 IP 黑名单（如果提供了 IP）
      if (ip) {
        const ipBlacklistCheck = await BlacklistService.isIpBlacklisted(
          ip,
          authCode.softwareId
        );

        if (ipBlacklistCheck.isBlacklisted) {
          throw new Error(ipBlacklistCheck.reason || 'IP 已被封禁');
        }
      }

      // 检查设备是否已绑定此授权码
      const existingDevice = await Device.findOne({
        where: {
          fingerprint,
          authCodeId: authCode.id
        }
      });

      if (existingDevice) {
        // 设备已绑定，直接返回（重复激活）
        logger.info('设备重复激活', {
          authCodeId: authCode.id,
          deviceId: existingDevice.id,
          fingerprint
        });

        return {
          authCode,
          device: existingDevice,
          isNewActivation: false
        };
      }

      // 检查设备数量限制
      const boundDevices = await DeviceService.getDevicesByAuthCode(authCode.id);
      
      if (boundDevices.length >= authCode.maxDevices) {
        throw new Error('设备数量已达上限');
      }

      // 首次激活处理
      if (authCode.status === 'unused') {
        const now = new Date();
        const updateData = {
          status: 'active',
          usedTime: now
        };

        // 处理时长卡
        if (!authCode.isPointCard) {
          if (authCode.activateMode === 'first_use') {
            // 首次使用激活模式：设置开始时间为当前时间
            updateData.startTime = now;
            updateData.expireTime = this._calculateExpireTime(
              now,
              authCode.cardType,
              authCode.duration
            );
          } else if (authCode.activateMode === 'scheduled') {
            // 定时激活模式：使用预设的开始时间和到期时间
            // 如果没有预设，则使用当前时间
            if (!authCode.startTime) {
              updateData.startTime = now;
              updateData.expireTime = this._calculateExpireTime(
                now,
                authCode.cardType,
                authCode.duration
              );
            }
            // 否则保持原有的 startTime 和 expireTime
          }
        } else {
          // 处理点卡：初始化剩余点数
          if (authCode.remainingPoints === 0 && authCode.totalPoints > 0) {
            updateData.remainingPoints = authCode.totalPoints;
          }
        }

        await authCode.update(updateData);
        await authCode.reload();
      }

      // 绑定设备
      const device = await DeviceService.bindDevice(
        authCode.id,
        fingerprint,
        deviceInfo,
        ip
      );

      logger.info('授权码激活成功', {
        authCodeId: authCode.id,
        code: authCode.code,
        deviceId: device.id,
        fingerprint,
        isPointCard: authCode.isPointCard
      });

      return {
        authCode,
        device,
        isNewActivation: true
      };
    } catch (error) {
      logger.error('授权码激活失败', {
        error: error.message,
        code,
        fingerprint
      });
      throw error;
    }
  }

  /**
   * 验证授权状态
   * @param {string} code - 授权码
   * @param {string} fingerprint - 设备指纹
   * @param {string} [ip] - IP 地址
   * @returns {Promise<Object>} { valid: boolean, authCode, device, reason? }
   */
  static async verifyLicense(code, fingerprint, ip = null) {
    try {
      // 验证设备指纹格式
      if (!FingerprintService.verifyFingerprint(fingerprint)) {
        return {
          valid: false,
          reason: '设备指纹格式无效'
        };
      }

      // 获取授权码
      const authCode = await AuthCode.findOne({
        where: { code },
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey', 'status']
          }
        ]
      });

      if (!authCode) {
        return {
          valid: false,
          reason: '授权码不存在'
        };
      }

      // 检查软件是否启用
      if (!authCode.software.status) {
        return {
          valid: false,
          reason: '软件已禁用'
        };
      }

      // 检查授权码状态
      if (authCode.status === 'disabled') {
        return {
          valid: false,
          reason: '授权码已被禁用'
        };
      }

      if (authCode.status === 'expired') {
        return {
          valid: false,
          reason: '授权码已过期'
        };
      }

      if (authCode.status === 'unused') {
        return {
          valid: false,
          reason: '授权码未激活'
        };
      }

      // 检查设备黑名单
      const deviceBlacklistCheck = await BlacklistService.isDeviceBlacklisted(
        fingerprint,
        authCode.softwareId
      );

      if (deviceBlacklistCheck.isBlacklisted) {
        return {
          valid: false,
          reason: deviceBlacklistCheck.reason || '设备已被封禁'
        };
      }

      // 检查 IP 黑名单（如果提供了 IP）
      if (ip) {
        const ipBlacklistCheck = await BlacklistService.isIpBlacklisted(
          ip,
          authCode.softwareId
        );

        if (ipBlacklistCheck.isBlacklisted) {
          return {
            valid: false,
            reason: ipBlacklistCheck.reason || 'IP 已被封禁'
          };
        }
      }

      // 检查设备是否绑定到此授权码
      const device = await Device.findOne({
        where: {
          fingerprint,
          authCodeId: authCode.id
        }
      });

      if (!device) {
        return {
          valid: false,
          reason: '设备未绑定到此授权码'
        };
      }

      // 检查设备状态
      if (device.status === 'blacklisted') {
        return {
          valid: false,
          reason: '设备已被封禁'
        };
      }

      if (device.status === 'inactive') {
        return {
          valid: false,
          reason: '设备已被停用'
        };
      }

      // 根据授权类型进行验证
      if (!authCode.isPointCard) {
        // 时长卡：检查到期时间
        if (authCode.expireTime) {
          const now = new Date();
          if (now > new Date(authCode.expireTime)) {
            // 更新授权码状态为已过期
            await authCode.update({ status: 'expired' });
            
            return {
              valid: false,
              reason: '授权已过期',
              authCode,
              device
            };
          }
        }
      } else {
        // 点卡：检查剩余点数
        if (authCode.remainingPoints <= 0) {
          // 更新授权码状态为已过期
          await authCode.update({ status: 'expired' });
          
          return {
            valid: false,
            reason: '点数已用完',
            authCode,
            device
          };
        }
      }

      // 验证通过
      logger.info('授权验证成功', {
        authCodeId: authCode.id,
        code: authCode.code,
        deviceId: device.id,
        fingerprint
      });

      return {
        valid: true,
        authCode,
        device
      };
    } catch (error) {
      logger.error('授权验证失败', {
        error: error.message,
        code,
        fingerprint
      });
      throw error;
    }
  }

  /**
   * 扣除点卡点数
   * @param {number} authCodeId - 授权码 ID
   * @param {number} amount - 扣除点数（可选，默认使用配置的 deductAmount）
   * @param {string} [reason] - 扣点原因
   * @param {number} [deviceId] - 设备 ID
   * @param {string} [ip] - IP 地址
   * @returns {Promise<Object>} { success: boolean, remainingPoints: number, authCode }
   */
  static async deductPoints(authCodeId, amount = null, reason = null, deviceId = null, ip = null) {
    try {
      const { PointDeductLog } = require('../models');
      
      // 获取授权码
      const authCode = await AuthCode.findByPk(authCodeId);

      if (!authCode) {
        throw new Error('授权码不存在');
      }

      // 检查是否为点卡
      if (!authCode.isPointCard) {
        throw new Error('该授权码不是点卡类型');
      }

      // 检查授权码状态
      if (authCode.status === 'disabled') {
        throw new Error('授权码已被禁用');
      }

      if (authCode.status === 'expired') {
        throw new Error('授权码已过期');
      }

      if (authCode.status === 'unused') {
        throw new Error('授权码未激活');
      }

      // 确定扣除点数
      const deductAmount = amount !== null ? amount : authCode.deductAmount;

      if (deductAmount <= 0) {
        throw new Error('扣除点数必须大于 0');
      }

      // 检查剩余点数是否足够
      if (authCode.remainingPoints < deductAmount) {
        throw new Error('点数不足');
      }

      // 计算扣点后的剩余点数
      const newRemainingPoints = authCode.remainingPoints - deductAmount;

      // 更新授权码剩余点数
      const updateData = {
        remainingPoints: newRemainingPoints
      };

      // 如果点数用完，标记为已过期
      if (newRemainingPoints <= 0) {
        updateData.status = 'expired';
      }

      await authCode.update(updateData);

      // 记录扣点日志
      await PointDeductLog.create({
        authCodeId: authCode.id,
        authCode: authCode.code,
        deviceId,
        deductType: authCode.deductType,
        deductAmount,
        remainingPoints: newRemainingPoints,
        reason,
        ip
      });

      logger.info('点卡扣点成功', {
        authCodeId: authCode.id,
        code: authCode.code,
        deductAmount,
        remainingPoints: newRemainingPoints,
        deviceId,
        reason
      });

      return {
        success: true,
        remainingPoints: newRemainingPoints,
        authCode
      };
    } catch (error) {
      logger.error('点卡扣点失败', {
        error: error.message,
        authCodeId,
        amount,
        reason
      });
      throw error;
    }
  }

  /**
   * 生成授权码字符串
   * 格式：XXXX-XXXX-XXXX-XXXX（16位，包含大写字母和数字）
   * @returns {string} 授权码
   * @private
   */
  static _generateLicenseCode() {
    const part1 = CryptoService.generateRandomString(4);
    const part2 = CryptoService.generateRandomString(4);
    const part3 = CryptoService.generateRandomString(4);
    const part4 = CryptoService.generateRandomString(4);
    
    return `${part1}-${part2}-${part3}-${part4}`;
  }

  /**
   * 计算到期时间
   * @param {Date} startTime - 开始时间
   * @param {string} cardType - 时长卡类型
   * @param {number} duration - 时长数值
   * @returns {Date} 到期时间
   * @private
   */
  static _calculateExpireTime(startTime, cardType, duration) {
    const start = new Date(startTime);
    let expireTime = new Date(start);

    switch (cardType) {
      case 'minute':
        expireTime.setMinutes(start.getMinutes() + duration);
        break;
      case 'hour':
        expireTime.setHours(start.getHours() + duration);
        break;
      case 'day':
        expireTime.setDate(start.getDate() + duration);
        break;
      case 'week':
        expireTime.setDate(start.getDate() + (duration * 7));
        break;
      case 'month':
        expireTime.setMonth(start.getMonth() + duration);
        break;
      case 'quarter':
        expireTime.setMonth(start.getMonth() + (duration * 3));
        break;
      case 'year':
        expireTime.setFullYear(start.getFullYear() + duration);
        break;
      case 'permanent':
        // 永久授权，设置为 100 年后
        expireTime.setFullYear(start.getFullYear() + 100);
        break;
      default:
        expireTime.setDate(start.getDate() + duration);
    }

    return expireTime;
  }
}

module.exports = LicenseService;
