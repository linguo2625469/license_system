const { Software, AuthCode, Device } = require('../models');
const CryptoService = require('../utils/crypto');
const logger = require('../utils/logger');

/**
 * 软件管理服务
 * 处理软件的创建、查询、更新和删除
 */
class SoftwareService {
  /**
   * 创建新软件
   * @param {Object} data - 软件数据
   * @param {string} data.name - 软件名称
   * @param {string} [data.notice] - 软件公告
   * @param {string} [data.version] - 软件版本
   * @param {string} [data.downloadUrl] - 下载链接
   * @returns {Promise<Object>} 创建的软件对象（不包含私钥）
   */
  static async createSoftware(data) {
    try {
      // 生成 RSA 密钥对（异步）
      const { publicKey, privateKey } = await CryptoService.generateRSAKeyPair(2048);
      
      // 生成唯一的 AppKey
      const appKey = CryptoService.generateRandomString(32);
      
      // 加密私钥存储
      const encryptedPrivateKey = CryptoService.encryptPrivateKey(privateKey);
      
      // 创建软件记录
      const software = await Software.create({
        name: data.name,
        appKey,
        publicKey,
        privateKey: encryptedPrivateKey,
        notice: data.notice || null,
        version: data.version || '1.0.0',
        downloadUrl: data.downloadUrl || null,
        status: true
      });

      logger.info('软件创建成功', {
        softwareId: software.id,
        name: software.name,
        appKey: software.appKey
      });

      // 返回软件信息（不包含私钥）
      return {
        id: software.id,
        name: software.name,
        appKey: software.appKey,
        publicKey: software.publicKey,
        status: software.status,
        notice: software.notice,
        version: software.version,
        downloadUrl: software.downloadUrl,
        createdAt: software.createdAt,
        updatedAt: software.updatedAt
      };
    } catch (error) {
      logger.error('创建软件失败', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 获取软件列表
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=10] - 每页数量
   * @param {boolean} [options.status] - 状态筛选
   * @param {string} [options.search] - 搜索关键词（软件名称）
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getSoftwareList(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search
      } = options;

      const offset = (page - 1) * limit;
      
      // 构建查询条件
      const where = {};
      
      if (status !== undefined) {
        where.status = status;
      }
      
      if (search) {
        where.name = {
          [require('sequelize').Op.like]: `%${search}%`
        };
      }

      // 查询软件列表
      const { count, rows } = await Software.findAndCountAll({
        where,
        attributes: [
          'id', 'name', 'appKey', 'publicKey', 'status',
          'notice', 'version', 'downloadUrl', 'createdAt', 'updatedAt'
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
      logger.error('获取软件列表失败', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * 根据 ID 获取软件详情
   * @param {number} softwareId - 软件 ID
   * @param {boolean} [includePrivateKey=false] - 是否包含私钥（解密后）
   * @returns {Promise<Object>} 软件对象
   */
  static async getSoftwareById(softwareId, includePrivateKey = false) {
    try {
      const software = await Software.findByPk(softwareId, {
        attributes: [
          'id', 'name', 'appKey', 'publicKey', 'privateKey', 'status',
          'notice', 'version', 'downloadUrl', 'createdAt', 'updatedAt'
        ]
      });

      if (!software) {
        return null;
      }

      const result = {
        id: software.id,
        name: software.name,
        appKey: software.appKey,
        publicKey: software.publicKey,
        status: software.status,
        notice: software.notice,
        version: software.version,
        downloadUrl: software.downloadUrl,
        createdAt: software.createdAt,
        updatedAt: software.updatedAt
      };

      // 如果需要私钥，解密后返回
      if (includePrivateKey) {
        result.privateKey = CryptoService.decryptPrivateKey(software.privateKey);
      }

      return result;
    } catch (error) {
      logger.error('获取软件详情失败', {
        error: error.message,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 根据 AppKey 获取软件
   * @param {string} appKey - AppKey
   * @param {boolean} [includePrivateKey=false] - 是否包含私钥（解密后）
   * @returns {Promise<Object>} 软件对象
   */
  static async getSoftwareByAppKey(appKey, includePrivateKey = false) {
    try {
      const software = await Software.findOne({
        where: { appKey },
        attributes: [
          'id', 'name', 'appKey', 'publicKey', 'privateKey', 'status',
          'notice', 'version', 'downloadUrl', 'createdAt', 'updatedAt'
        ]
      });

      if (!software) {
        return null;
      }

      const result = {
        id: software.id,
        name: software.name,
        appKey: software.appKey,
        publicKey: software.publicKey,
        status: software.status,
        notice: software.notice,
        version: software.version,
        downloadUrl: software.downloadUrl,
        createdAt: software.createdAt,
        updatedAt: software.updatedAt
      };

      // 如果需要私钥，解密后返回
      if (includePrivateKey) {
        result.privateKey = CryptoService.decryptPrivateKey(software.privateKey);
      }

      return result;
    } catch (error) {
      logger.error('根据 AppKey 获取软件失败', {
        error: error.message,
        appKey
      });
      throw error;
    }
  }

  /**
   * 更新软件信息
   * @param {number} softwareId - 软件 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.name] - 软件名称
   * @param {string} [data.notice] - 软件公告
   * @param {string} [data.version] - 软件版本
   * @param {string} [data.downloadUrl] - 下载链接
   * @param {boolean} [data.status] - 启用状态
   * @returns {Promise<Object>} 更新后的软件对象
   */
  static async updateSoftware(softwareId, data) {
    try {
      const software = await Software.findByPk(softwareId);

      if (!software) {
        return null;
      }

      // 更新允许的字段（AppKey 和密钥对不允许修改）
      const updateData = {};
      
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.notice !== undefined) {
        updateData.notice = data.notice;
      }
      if (data.version !== undefined) {
        updateData.version = data.version;
      }
      if (data.downloadUrl !== undefined) {
        updateData.downloadUrl = data.downloadUrl;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      await software.update(updateData);

      logger.info('软件更新成功', {
        softwareId: software.id,
        updateData
      });

      // 返回更新后的软件信息（不包含私钥）
      return {
        id: software.id,
        name: software.name,
        appKey: software.appKey,
        publicKey: software.publicKey,
        status: software.status,
        notice: software.notice,
        version: software.version,
        downloadUrl: software.downloadUrl,
        createdAt: software.createdAt,
        updatedAt: software.updatedAt
      };
    } catch (error) {
      logger.error('更新软件失败', {
        error: error.message,
        softwareId,
        data
      });
      throw error;
    }
  }

  /**
   * 删除软件
   * 注意：会级联删除所有关联的授权码和设备记录
   * @param {number} softwareId - 软件 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteSoftware(softwareId) {
    try {
      const software = await Software.findByPk(softwareId);

      if (!software) {
        return false;
      }

      // 记录删除前的统计信息
      const authCodeCount = await AuthCode.count({ where: { softwareId } });
      const deviceCount = await Device.count({ where: { softwareId } });

      // 删除软件（会级联删除关联数据）
      await software.destroy();

      logger.info('软件删除成功', {
        softwareId,
        name: software.name,
        deletedAuthCodes: authCodeCount,
        deletedDevices: deviceCount
      });

      return true;
    } catch (error) {
      logger.error('删除软件失败', {
        error: error.message,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 重新生成软件的 RSA 密钥对
   * 注意：这会使所有使用旧密钥加密的数据失效
   * @param {number} softwareId - 软件 ID
   * @returns {Promise<Object>} 新的密钥对信息
   */
  static async regenerateKeys(softwareId) {
    try {
      const software = await Software.findByPk(softwareId);

      if (!software) {
        return null;
      }

      // 生成新的 RSA 密钥对（异步）
      const { publicKey, privateKey } = await CryptoService.generateRSAKeyPair(2048);
      
      // 加密私钥
      const encryptedPrivateKey = CryptoService.encryptPrivateKey(privateKey);

      // 更新密钥
      await software.update({
        publicKey,
        privateKey: encryptedPrivateKey
      });

      logger.warn('软件密钥对已重新生成', {
        softwareId,
        name: software.name
      });

      return {
        publicKey,
        privateKey // 返回解密后的私钥供管理员保存
      };
    } catch (error) {
      logger.error('重新生成密钥失败', {
        error: error.message,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 获取软件统计信息
   * @param {number} softwareId - 软件 ID
   * @returns {Promise<Object>} 统计信息
   */
  static async getSoftwareStats(softwareId) {
    try {
      const software = await Software.findByPk(softwareId);

      if (!software) {
        return null;
      }

      // 统计授权码数量
      const totalAuthCodes = await AuthCode.count({ where: { softwareId } });
      const activeAuthCodes = await AuthCode.count({
        where: { softwareId, status: 'active' }
      });
      const unusedAuthCodes = await AuthCode.count({
        where: { softwareId, status: 'unused' }
      });
      const expiredAuthCodes = await AuthCode.count({
        where: { softwareId, status: 'expired' }
      });

      // 统计设备数量
      const totalDevices = await Device.count({ where: { softwareId } });
      const activeDevices = await Device.count({
        where: { softwareId, status: 'active' }
      });

      return {
        softwareId,
        name: software.name,
        authCodes: {
          total: totalAuthCodes,
          active: activeAuthCodes,
          unused: unusedAuthCodes,
          expired: expiredAuthCodes
        },
        devices: {
          total: totalDevices,
          active: activeDevices
        }
      };
    } catch (error) {
      logger.error('获取软件统计信息失败', {
        error: error.message,
        softwareId
      });
      throw error;
    }
  }
}

module.exports = SoftwareService;
