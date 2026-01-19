const { AuthLog, PointDeductLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 日志服务
 * 处理日志查询和管理
 */
class LogService {
  /**
   * 获取授权日志列表
   * @param {Object} options - 查询选项
   * @param {number} [options.softwareId] - 软件 ID
   * @param {string} [options.action] - 操作类型
   * @param {number} [options.authCodeId] - 授权码 ID
   * @param {number} [options.deviceId] - 设备 ID
   * @param {string} [options.fingerprint] - 设备指纹
   * @param {string} [options.ip] - IP 地址
   * @param {Date} [options.startDate] - 开始日期
   * @param {Date} [options.endDate] - 结束日期
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getAuthLogs(options = {}) {
    try {
      const {
        softwareId,
        action,
        authCodeId,
        deviceId,
        fingerprint,
        ip,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      
      if (softwareId) {
        where.softwareId = softwareId;
      }
      
      if (action) {
        where.action = action;
      }
      
      if (authCodeId) {
        where.authCodeId = authCodeId;
      }
      
      if (deviceId) {
        where.deviceId = deviceId;
      }
      
      if (fingerprint) {
        where.fingerprint = fingerprint;
      }
      
      if (ip) {
        where.ip = {
          [Op.like]: `%${ip}%`
        };
      }

      
      // 日期范围筛选
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 查询授权日志列表
      const { count, rows } = await AuthLog.findAndCountAll({
        where,
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
      logger.error('获取授权日志列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 获取点卡扣点日志列表
   * @param {Object} options - 查询选项
   * @param {number} [options.authCodeId] - 授权码 ID
   * @param {string} [options.authCode] - 授权码字符串
   * @param {number} [options.deviceId] - 设备 ID
   * @param {string} [options.deductType] - 扣点类型
   * @param {string} [options.ip] - IP 地址
   * @param {Date} [options.startDate] - 开始日期
   * @param {Date} [options.endDate] - 结束日期
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getPointDeductLogs(options = {}) {
    try {
      const {
        authCodeId,
        authCode,
        deviceId,
        deductType,
        ip,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      
      if (authCodeId) {
        where.authCodeId = authCodeId;
      }
      
      if (authCode) {
        where.authCode = {
          [Op.like]: `%${authCode}%`
        };
      }
      
      if (deviceId) {
        where.deviceId = deviceId;
      }
      
      if (deductType) {
        where.deductType = deductType;
      }
      
      if (ip) {
        where.ip = {
          [Op.like]: `%${ip}%`
        };
      }
      
      // 日期范围筛选
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 查询扣点日志列表
      const { count, rows } = await PointDeductLog.findAndCountAll({
        where,
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
      logger.error('获取点卡扣点日志列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }


  /**
   * 获取授权日志统计信息
   * @param {Object} options - 查询选项
   * @param {number} [options.softwareId] - 软件 ID
   * @param {Date} [options.startDate] - 开始日期
   * @param {Date} [options.endDate] - 结束日期
   * @returns {Promise<Object>} 统计信息
   */
  static async getAuthLogStats(options = {}) {
    try {
      const { softwareId, startDate, endDate } = options;
      
      // 构建查询条件
      const where = {};
      
      if (softwareId) {
        where.softwareId = softwareId;
      }
      
      // 日期范围筛选
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 统计各类操作的数量
      const totalCount = await AuthLog.count({ where });
      
      const activateCount = await AuthLog.count({
        where: { ...where, action: 'activate' }
      });
      
      const verifyCount = await AuthLog.count({
        where: { ...where, action: 'verify' }
      });
      
      const rebindCount = await AuthLog.count({
        where: { ...where, action: 'rebind' }
      });
      
      const deductPointsCount = await AuthLog.count({
        where: { ...where, action: 'deduct_points' }
      });

      return {
        total: totalCount,
        activate: activateCount,
        verify: verifyCount,
        rebind: rebindCount,
        deductPoints: deductPointsCount
      };
    } catch (error) {
      logger.error('获取授权日志统计失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 获取点卡扣点日志统计信息
   * @param {Object} options - 查询选项
   * @param {number} [options.authCodeId] - 授权码 ID
   * @param {Date} [options.startDate] - 开始日期
   * @param {Date} [options.endDate] - 结束日期
   * @returns {Promise<Object>} 统计信息
   */
  static async getPointDeductLogStats(options = {}) {
    try {
      const { authCodeId, startDate, endDate } = options;
      
      // 构建查询条件
      const where = {};
      
      if (authCodeId) {
        where.authCodeId = authCodeId;
      }
      
      // 日期范围筛选
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }

      // 统计总扣点次数和总扣点数量
      const totalCount = await PointDeductLog.count({ where });
      
      const sumResult = await PointDeductLog.sum('deductAmount', { where });
      const totalDeducted = sumResult || 0;

      return {
        totalCount,
        totalDeducted
      };
    } catch (error) {
      logger.error('获取点卡扣点日志统计失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }
}

module.exports = LogService;
