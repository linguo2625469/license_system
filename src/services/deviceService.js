const { Device, DeviceBlacklist, AuthCode, Software } = require('../models');
const FingerprintService = require('../utils/fingerprint');
const logger = require('../utils/logger');

/**
 * 设备管理服务
 * 处理设备绑定、查询和黑名单检查
 */
class DeviceService {
  /**
   * 绑定设备到授权码
   * @param {number} authCodeId - 授权码 ID
   * @param {string} fingerprint - 设备指纹
   * @param {Object} deviceInfo - 设备信息
   * @param {string} deviceInfo.platform - 平台
   * @param {string} deviceInfo.osVersion - 操作系统版本
   * @param {string} deviceInfo.cpuId - CPU ID
   * @param {string} deviceInfo.boardSerial - 主板序列号
   * @param {string} deviceInfo.diskSerial - 硬盘序列号
   * @param {string} deviceInfo.macAddress - MAC 地址
   * @param {string} [ip] - IP 地址
   * @returns {Promise<Object>} 设备对象
   */
  static async bindDevice(authCodeId, fingerprint, deviceInfo, ip = null) {
    try {
      // 验证指纹格式
      if (!FingerprintService.verifyFingerprint(fingerprint)) {
        throw new Error('设备指纹格式无效');
      }

      // 获取授权码信息
      const authCode = await AuthCode.findByPk(authCodeId, {
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id']
          }
        ]
      });

      if (!authCode) {
        throw new Error('授权码不存在');
      }

      const softwareId = authCode.software.id;

      // 检查设备是否已存在
      let device = await Device.findOne({
        where: { fingerprint }
      });

      if (device) {
        // 设备已存在，更新绑定信息
        await device.update({
          authCodeId,
          softwareId,
          platform: deviceInfo.platform || device.platform,
          osVersion: deviceInfo.osVersion || device.osVersion,
          cpuId: deviceInfo.cpuId || device.cpuId,
          boardSerial: deviceInfo.boardSerial || device.boardSerial,
          diskSerial: deviceInfo.diskSerial || device.diskSerial,
          macAddress: deviceInfo.macAddress || device.macAddress,
          status: 'active',
          lastIp: ip || device.lastIp,
          lastHeartbeat: new Date()
        });

        logger.info('设备重新绑定成功', {
          deviceId: device.id,
          authCodeId,
          fingerprint
        });
      } else {
        // 创建新设备
        device = await Device.create({
          softwareId,
          authCodeId,
          fingerprint,
          machineCode: fingerprint, // 兼容字段
          platform: deviceInfo.platform,
          osVersion: deviceInfo.osVersion,
          cpuId: deviceInfo.cpuId,
          boardSerial: deviceInfo.boardSerial,
          diskSerial: deviceInfo.diskSerial,
          macAddress: deviceInfo.macAddress,
          status: 'active',
          lastIp: ip,
          lastHeartbeat: new Date()
        });

        logger.info('设备绑定成功', {
          deviceId: device.id,
          authCodeId,
          fingerprint
        });
      }

      return device;
    } catch (error) {
      logger.error('设备绑定失败', {
        error: error.message,
        authCodeId,
        fingerprint
      });
      throw error;
    }
  }

  /**
   * 获取授权码绑定的所有设备
   * @param {number} authCodeId - 授权码 ID
   * @returns {Promise<Array>} 设备列表
   */
  static async getDevicesByAuthCode(authCodeId) {
    try {
      const devices = await Device.findAll({
        where: { authCodeId },
        order: [['createdAt', 'DESC']]
      });

      return devices;
    } catch (error) {
      logger.error('获取授权码设备列表失败', {
        error: error.message,
        authCodeId
      });
      throw error;
    }
  }

  /**
   * 检查设备是否在黑名单中
   * @param {string} fingerprint - 设备指纹
   * @param {number} [softwareId] - 软件 ID（可选，用于检查软件特定黑名单）
   * @returns {Promise<Object>} { isBlacklisted: boolean, reason?: string }
   */
  static async isDeviceBlacklisted(fingerprint, softwareId = null) {
    try {
      const where = { fingerprint };

      // 检查全局黑名单或软件特定黑名单
      const blacklistEntry = await DeviceBlacklist.findOne({
        where: {
          fingerprint,
          softwareId: softwareId ? [null, softwareId] : null
        },
        order: [['createdAt', 'DESC']]
      });

      if (blacklistEntry) {
        return {
          isBlacklisted: true,
          reason: blacklistEntry.reason || '设备已被封禁'
        };
      }

      return {
        isBlacklisted: false
      };
    } catch (error) {
      logger.error('检查设备黑名单失败', {
        error: error.message,
        fingerprint,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 添加设备到黑名单
   * @param {string} fingerprint - 设备指纹
   * @param {string} reason - 封禁原因
   * @param {number} [softwareId] - 软件 ID（null 表示全局黑名单）
   * @param {number} [adminId] - 管理员 ID
   * @returns {Promise<Object>} 黑名单记录
   */
  static async addToBlacklist(fingerprint, reason, softwareId = null, adminId = null) {
    try {
      // 检查是否已在黑名单
      const existing = await DeviceBlacklist.findOne({
        where: { fingerprint, softwareId }
      });

      if (existing) {
        throw new Error('设备已在黑名单中');
      }

      const blacklistEntry = await DeviceBlacklist.create({
        fingerprint,
        reason,
        softwareId,
        adminId
      });

      // 更新设备状态为 blacklisted
      await Device.update(
        { status: 'blacklisted' },
        { where: { fingerprint } }
      );

      logger.info('设备添加到黑名单', {
        fingerprint,
        reason,
        softwareId,
        adminId
      });

      return blacklistEntry;
    } catch (error) {
      logger.error('添加设备到黑名单失败', {
        error: error.message,
        fingerprint
      });
      throw error;
    }
  }

  /**
   * 从黑名单移除设备
   * @param {number} blacklistId - 黑名单记录 ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async removeFromBlacklist(blacklistId) {
    try {
      const blacklistEntry = await DeviceBlacklist.findByPk(blacklistId);

      if (!blacklistEntry) {
        return false;
      }

      const fingerprint = blacklistEntry.fingerprint;

      await blacklistEntry.destroy();

      // 恢复设备状态
      await Device.update(
        { status: 'active' },
        { where: { fingerprint } }
      );

      logger.info('设备从黑名单移除', {
        blacklistId,
        fingerprint
      });

      return true;
    } catch (error) {
      logger.error('从黑名单移除设备失败', {
        error: error.message,
        blacklistId
      });
      throw error;
    }
  }

  /**
   * 获取设备详情
   * @param {number} deviceId - 设备 ID
   * @returns {Promise<Object>} 设备对象
   */
  static async getDeviceById(deviceId) {
    try {
      const device = await Device.findByPk(deviceId, {
        include: [
          {
            model: AuthCode,
            as: 'authCode',
            attributes: ['id', 'code', 'status', 'expireTime', 'remainingPoints']
          },
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'name', 'appKey']
          }
        ]
      });

      return device;
    } catch (error) {
      logger.error('获取设备详情失败', {
        error: error.message,
        deviceId
      });
      throw error;
    }
  }

  /**
   * 根据指纹获取设备
   * @param {string} fingerprint - 设备指纹
   * @returns {Promise<Object>} 设备对象
   */
  static async getDeviceByFingerprint(fingerprint) {
    try {
      const device = await Device.findOne({
        where: { fingerprint },
        include: [
          {
            model: AuthCode,
            as: 'authCode',
            attributes: ['id', 'code', 'status', 'expireTime', 'remainingPoints']
          }
        ]
      });

      return device;
    } catch (error) {
      logger.error('根据指纹获取设备失败', {
        error: error.message,
        fingerprint
      });
      throw error;
    }
  }

  /**
   * 解绑设备（管理员强制解绑，不增加换绑计数）
   * @param {number} authCodeId - 授权码 ID
   * @param {number} deviceId - 设备 ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async unbindDevice(authCodeId, deviceId) {
    try {
      const device = await Device.findOne({
        where: {
          id: deviceId,
          authCodeId
        }
      });

      if (!device) {
        throw new Error('设备不存在或未绑定到此授权码');
      }

      await device.update({
        authCodeId: null,
        status: 'inactive'
      });

      logger.info('管理员强制解绑设备成功', {
        deviceId,
        authCodeId,
        fingerprint: device.fingerprint
      });

      return true;
    } catch (error) {
      logger.error('管理员强制解绑设备失败', {
        error: error.message,
        deviceId,
        authCodeId
      });
      throw error;
    }
  }

  /**
   * 换绑设备（验证换绑次数、解绑旧设备、绑定新设备）
   * @param {string} code - 授权码
   * @param {string} oldFingerprint - 旧设备指纹
   * @param {string} newFingerprint - 新设备指纹
   * @param {Object} deviceInfo - 新设备信息
   * @param {string} [ip] - IP 地址
   * @returns {Promise<Object>} { authCode, oldDevice, newDevice }
   */
  static async rebindDevice(code, oldFingerprint, newFingerprint, deviceInfo, ip = null) {
    try {
      // 验证新设备指纹格式
      if (!FingerprintService.verifyFingerprint(newFingerprint)) {
        throw new Error('新设备指纹格式无效');
      }

      // 获取授权码
      const authCode = await AuthCode.findOne({
        where: { code },
        include: [
          {
            model: Software,
            as: 'software',
            attributes: ['id', 'status']
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

      if (authCode.status === 'unused') {
        throw new Error('授权码未激活，无法换绑');
      }

      // 检查换绑次数限制
      if (authCode.rebindCount >= authCode.allowRebind) {
        throw new Error('换绑次数已达上限');
      }

      // 检查新设备黑名单
      const blacklistCheck = await this.isDeviceBlacklisted(
        newFingerprint,
        authCode.softwareId
      );

      if (blacklistCheck.isBlacklisted) {
        throw new Error(blacklistCheck.reason || '新设备已被封禁');
      }

      // 查找旧设备
      const oldDevice = await Device.findOne({
        where: {
          fingerprint: oldFingerprint,
          authCodeId: authCode.id
        }
      });

      if (!oldDevice) {
        throw new Error('旧设备未绑定到此授权码');
      }

      // 检查新设备是否已绑定到此授权码
      const existingNewDevice = await Device.findOne({
        where: {
          fingerprint: newFingerprint,
          authCodeId: authCode.id
        }
      });

      if (existingNewDevice) {
        throw new Error('新设备已绑定到此授权码');
      }

      // 解绑旧设备
      await oldDevice.update({
        authCodeId: null,
        status: 'inactive'
      });

      // 绑定新设备
      const newDevice = await this.bindDevice(
        authCode.id,
        newFingerprint,
        deviceInfo,
        ip
      );

      // 增加换绑计数
      await authCode.increment('rebindCount');
      await authCode.reload();

      logger.info('设备换绑成功', {
        authCodeId: authCode.id,
        code: authCode.code,
        oldDeviceId: oldDevice.id,
        oldFingerprint,
        newDeviceId: newDevice.id,
        newFingerprint,
        rebindCount: authCode.rebindCount
      });

      return {
        authCode,
        oldDevice,
        newDevice
      };
    } catch (error) {
      logger.error('设备换绑失败', {
        error: error.message,
        code,
        oldFingerprint,
        newFingerprint
      });
      throw error;
    }
  }
}

module.exports = DeviceService;
