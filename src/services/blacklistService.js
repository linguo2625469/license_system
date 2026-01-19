const { DeviceBlacklist, IpBlacklist, Device } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * 黑名单管理服务
 * 处理设备和 IP 黑名单的添加、删除和检查
 */
class BlacklistService {
  /**
   * 添加设备到黑名单
   * @param {string} fingerprint - 设备指纹
   * @param {string} reason - 封禁原因
   * @param {number} [softwareId] - 软件 ID（null 表示全局黑名单）
   * @param {number} [adminId] - 管理员 ID
   * @returns {Promise<Object>} 黑名单记录
   */
  static async addDeviceToBlacklist(fingerprint, reason, softwareId = null, adminId = null) {
    try {
      // 检查是否已在黑名单
      const existing = await DeviceBlacklist.findOne({
        where: { 
          fingerprint, 
          softwareId: softwareId || null 
        }
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
  static async removeDeviceFromBlacklist(blacklistId) {
    try {
      const blacklistEntry = await DeviceBlacklist.findByPk(blacklistId);

      if (!blacklistEntry) {
        return false;
      }

      const fingerprint = blacklistEntry.fingerprint;

      await blacklistEntry.destroy();

      // 检查是否还有其他黑名单记录（全局或其他软件）
      const otherBlacklist = await DeviceBlacklist.findOne({
        where: { fingerprint }
      });

      // 只有在没有其他黑名单记录时才恢复设备状态
      if (!otherBlacklist) {
        await Device.update(
          { status: 'active' },
          { where: { fingerprint } }
        );
      }

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
   * 添加 IP 到黑名单
   * @param {string} ip - IP 地址
   * @param {string} reason - 封禁原因
   * @param {number} [softwareId] - 软件 ID（null 表示全局黑名单）
   * @returns {Promise<Object>} 黑名单记录
   */
  static async addIpToBlacklist(ip, reason, softwareId = null) {
    try {
      // 检查是否已在黑名单
      const existing = await IpBlacklist.findOne({
        where: { 
          ip, 
          softwareId: softwareId || null 
        }
      });

      if (existing) {
        throw new Error('IP 已在黑名单中');
      }

      const blacklistEntry = await IpBlacklist.create({
        ip,
        reason,
        softwareId
      });

      logger.info('IP 添加到黑名单', {
        ip,
        reason,
        softwareId
      });

      return blacklistEntry;
    } catch (error) {
      logger.error('添加 IP 到黑名单失败', {
        error: error.message,
        ip
      });
      throw error;
    }
  }

  /**
   * 从黑名单移除 IP
   * @param {number} blacklistId - 黑名单记录 ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async removeIpFromBlacklist(blacklistId) {
    try {
      const blacklistEntry = await IpBlacklist.findByPk(blacklistId);

      if (!blacklistEntry) {
        return false;
      }

      const ip = blacklistEntry.ip;

      await blacklistEntry.destroy();

      logger.info('IP 从黑名单移除', {
        blacklistId,
        ip
      });

      return true;
    } catch (error) {
      logger.error('从黑名单移除 IP 失败', {
        error: error.message,
        blacklistId
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
      const whereConditions = {
        fingerprint
      };

      // 检查全局黑名单或软件特定黑名单
      if (softwareId) {
        whereConditions.softwareId = {
          [Op.or]: [null, softwareId]
        };
      } else {
        whereConditions.softwareId = null;
      }

      const blacklistEntry = await DeviceBlacklist.findOne({
        where: whereConditions,
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
   * 检查 IP 是否在黑名单中
   * @param {string} ip - IP 地址
   * @param {number} [softwareId] - 软件 ID（可选，用于检查软件特定黑名单）
   * @returns {Promise<Object>} { isBlacklisted: boolean, reason?: string }
   */
  static async isIpBlacklisted(ip, softwareId = null) {
    try {
      const whereConditions = {
        ip
      };

      // 检查全局黑名单或软件特定黑名单
      if (softwareId) {
        whereConditions.softwareId = {
          [Op.or]: [null, softwareId]
        };
      } else {
        whereConditions.softwareId = null;
      }

      const blacklistEntry = await IpBlacklist.findOne({
        where: whereConditions,
        order: [['createdAt', 'DESC']]
      });

      if (blacklistEntry) {
        return {
          isBlacklisted: true,
          reason: blacklistEntry.reason || 'IP 已被封禁'
        };
      }

      return {
        isBlacklisted: false
      };
    } catch (error) {
      logger.error('检查 IP 黑名单失败', {
        error: error.message,
        ip,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 获取设备黑名单列表
   * @param {Object} options - 查询选项
   * @param {number} [options.softwareId] - 软件 ID
   * @param {number} [options.page] - 页码
   * @param {number} [options.limit] - 每页数量
   * @returns {Promise<Object>} { rows, count, totalPages }
   */
  static async getDeviceBlacklist(options = {}) {
    try {
      const { softwareId, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const where = {};
      if (softwareId !== undefined) {
        where.softwareId = softwareId;
      }

      const { rows, count } = await DeviceBlacklist.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        rows,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      };
    } catch (error) {
      logger.error('获取设备黑名单列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 获取 IP 黑名单列表
   * @param {Object} options - 查询选项
   * @param {number} [options.softwareId] - 软件 ID
   * @param {number} [options.page] - 页码
   * @param {number} [options.limit] - 每页数量
   * @returns {Promise<Object>} { rows, count, totalPages }
   */
  static async getIpBlacklist(options = {}) {
    try {
      const { softwareId, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const where = {};
      if (softwareId !== undefined) {
        where.softwareId = softwareId;
      }

      const { rows, count } = await IpBlacklist.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        rows,
        count,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      };
    } catch (error) {
      logger.error('获取 IP 黑名单列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }
}

module.exports = BlacklistService;
