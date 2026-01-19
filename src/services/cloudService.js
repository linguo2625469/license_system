const { RemoteVar, RemoteSwitch, Announcement, Version, Software } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * 云控服务
 * 处理远程变量、开关、公告和版本管理
 */
class CloudService {
  /**
   * 创建远程变量
   * @param {Object} data - 变量数据
   * @param {number} data.softwareId - 软件 ID
   * @param {string} data.varName - 变量名称
   * @param {any} data.varValue - 变量值
   * @param {string} data.varType - 变量类型 (string|number|boolean|json)
   * @param {string} [data.description] - 变量描述
   * @param {boolean} [data.status=true] - 启用状态
   * @returns {Promise<Object>} 创建的远程变量对象
   */
  static async createRemoteVar(data) {
    try {
      const { softwareId, varName, varValue, varType, description, status = true } = data;

      // 验证软件是否存在
      const software = await Software.findByPk(softwareId);
      if (!software) {
        throw new Error('软件不存在');
      }

      // 检查变量名是否已存在
      const existingVar = await RemoteVar.findOne({
        where: { softwareId, varName }
      });

      if (existingVar) {
        throw new Error('变量名已存在');
      }

      // 根据类型处理变量值
      let processedValue = varValue;
      
      if (varType === 'json') {
        // JSON 类型需要序列化
        if (typeof varValue === 'object') {
          processedValue = JSON.stringify(varValue);
        } else if (typeof varValue === 'string') {
          // 验证是否为有效 JSON
          try {
            JSON.parse(varValue);
            processedValue = varValue;
          } catch (e) {
            throw new Error('无效的 JSON 格式');
          }
        }
      } else if (varType === 'number') {
        // 数字类型转换
        const num = Number(varValue);
        if (isNaN(num)) {
          throw new Error('无效的数字格式');
        }
        processedValue = String(num);
      } else if (varType === 'boolean') {
        // 布尔类型转换
        processedValue = String(Boolean(varValue));
      } else {
        // 字符串类型
        processedValue = String(varValue);
      }

      // 创建远程变量
      const remoteVar = await RemoteVar.create({
        softwareId,
        varName,
        varValue: processedValue,
        varType,
        description: description || null,
        status
      });

      logger.info('远程变量创建成功', {
        remoteVarId: remoteVar.id,
        softwareId,
        varName
      });

      return remoteVar;
    } catch (error) {
      logger.error('创建远程变量失败', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 更新远程变量
   * @param {number} remoteVarId - 远程变量 ID
   * @param {Object} data - 更新数据
   * @param {any} [data.varValue] - 变量值
   * @param {string} [data.varType] - 变量类型
   * @param {string} [data.description] - 变量描述
   * @param {boolean} [data.status] - 启用状态
   * @returns {Promise<Object>} 更新后的远程变量对象
   */
  static async updateRemoteVar(remoteVarId, data) {
    try {
      const remoteVar = await RemoteVar.findByPk(remoteVarId);

      if (!remoteVar) {
        return null;
      }

      const updateData = {};

      // 更新变量值和类型
      if (data.varValue !== undefined || data.varType !== undefined) {
        const newType = data.varType || remoteVar.varType;
        const newValue = data.varValue !== undefined ? data.varValue : remoteVar.varValue;

        // 根据类型处理变量值
        if (newType === 'json') {
          if (typeof newValue === 'object') {
            updateData.varValue = JSON.stringify(newValue);
          } else if (typeof newValue === 'string') {
            try {
              JSON.parse(newValue);
              updateData.varValue = newValue;
            } catch (e) {
              throw new Error('无效的 JSON 格式');
            }
          }
        } else if (newType === 'number') {
          const num = Number(newValue);
          if (isNaN(num)) {
            throw new Error('无效的数字格式');
          }
          updateData.varValue = String(num);
        } else if (newType === 'boolean') {
          updateData.varValue = String(Boolean(newValue));
        } else {
          updateData.varValue = String(newValue);
        }

        if (data.varType !== undefined) {
          updateData.varType = newType;
        }
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      await remoteVar.update(updateData);

      logger.info('远程变量更新成功', {
        remoteVarId,
        updateData
      });

      return remoteVar;
    } catch (error) {
      logger.error('更新远程变量失败', {
        error: error.message,
        remoteVarId,
        data
      });
      throw error;
    }
  }

  /**
   * 删除远程变量
   * @param {number} remoteVarId - 远程变量 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteRemoteVar(remoteVarId) {
    try {
      const remoteVar = await RemoteVar.findByPk(remoteVarId);

      if (!remoteVar) {
        return false;
      }

      await remoteVar.destroy();

      logger.info('远程变量删除成功', {
        remoteVarId,
        varName: remoteVar.varName
      });

      return true;
    } catch (error) {
      logger.error('删除远程变量失败', {
        error: error.message,
        remoteVarId
      });
      throw error;
    }
  }

  /**
   * 获取远程变量列表（客户端使用）
   * @param {number} softwareId - 软件 ID
   * @param {string} [varName] - 可选的变量名（获取特定变量）
   * @returns {Promise<Array|Object>} 远程变量列表或单个变量
   */
  static async getRemoteVars(softwareId, varName = null) {
    try {
      const where = {
        softwareId,
        status: true // 只返回启用的变量
      };

      if (varName) {
        where.varName = varName;
      }

      const remoteVars = await RemoteVar.findAll({
        where,
        attributes: ['id', 'varName', 'varValue', 'varType', 'description'],
        order: [['varName', 'ASC']]
      });

      // 如果指定了变量名，返回单个变量
      if (varName) {
        if (remoteVars.length === 0) {
          return null;
        }
        
        const remoteVar = remoteVars[0];
        return this._parseVarValue(remoteVar);
      }

      // 返回所有变量，解析值
      return remoteVars.map(remoteVar => this._parseVarValue(remoteVar));
    } catch (error) {
      logger.error('获取远程变量失败', {
        error: error.message,
        softwareId,
        varName
      });
      throw error;
    }
  }

  /**
   * 获取远程变量列表（管理端使用）
   * @param {number} softwareId - 软件 ID
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @param {boolean} [options.status] - 状态筛选
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getRemoteVarList(softwareId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status
      } = options;

      const offset = (page - 1) * limit;
      
      const where = { softwareId };
      
      if (status !== undefined) {
        where.status = status;
      }

      const { count, rows } = await RemoteVar.findAndCountAll({
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
      logger.error('获取远程变量列表失败', {
        error: error.message,
        softwareId,
        options
      });
      throw error;
    }
  }

  /**
   * 解析变量值（根据类型）
   * @private
   * @param {Object} remoteVar - 远程变量对象
   * @returns {Object} 解析后的变量对象
   */
  static _parseVarValue(remoteVar) {
    const result = {
      id: remoteVar.id,
      varName: remoteVar.varName,
      varType: remoteVar.varType,
      description: remoteVar.description
    };

    // 根据类型解析值
    switch (remoteVar.varType) {
      case 'number':
        result.varValue = Number(remoteVar.varValue);
        break;
      case 'boolean':
        result.varValue = remoteVar.varValue === 'true';
        break;
      case 'json':
        try {
          result.varValue = JSON.parse(remoteVar.varValue);
        } catch (e) {
          result.varValue = remoteVar.varValue;
        }
        break;
      default:
        result.varValue = remoteVar.varValue;
    }

    return result;
  }

  /**
   * 创建远程开关
   * @param {Object} data - 开关数据
   * @param {number} data.softwareId - 软件 ID
   * @param {string} data.switchName - 开关名称
   * @param {string} data.switchKey - 开关键名
   * @param {boolean} [data.switchValue=false] - 开关值
   * @param {string} [data.description] - 开关描述
   * @returns {Promise<Object>} 创建的远程开关对象
   */
  static async createRemoteSwitch(data) {
    try {
      const { softwareId, switchName, switchKey, switchValue = false, description } = data;

      // 验证软件是否存在
      const software = await Software.findByPk(softwareId);
      if (!software) {
        throw new Error('软件不存在');
      }

      // 检查开关键名是否已存在
      const existingSwitch = await RemoteSwitch.findOne({
        where: { softwareId, switchKey }
      });

      if (existingSwitch) {
        throw new Error('开关键名已存在');
      }

      // 创建远程开关
      const remoteSwitch = await RemoteSwitch.create({
        softwareId,
        switchName,
        switchKey,
        switchValue: Boolean(switchValue),
        description: description || null
      });

      logger.info('远程开关创建成功', {
        remoteSwitchId: remoteSwitch.id,
        softwareId,
        switchKey
      });

      return remoteSwitch;
    } catch (error) {
      logger.error('创建远程开关失败', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 切换远程开关状态
   * @param {number} remoteSwitchId - 远程开关 ID
   * @param {boolean} switchValue - 开关值
   * @returns {Promise<Object>} 更新后的远程开关对象
   */
  static async toggleSwitch(remoteSwitchId, switchValue) {
    try {
      const remoteSwitch = await RemoteSwitch.findByPk(remoteSwitchId);

      if (!remoteSwitch) {
        return null;
      }

      await remoteSwitch.update({
        switchValue: Boolean(switchValue)
      });

      logger.info('远程开关切换成功', {
        remoteSwitchId,
        switchValue: Boolean(switchValue)
      });

      return remoteSwitch;
    } catch (error) {
      logger.error('切换远程开关失败', {
        error: error.message,
        remoteSwitchId,
        switchValue
      });
      throw error;
    }
  }

  /**
   * 更新远程开关
   * @param {number} remoteSwitchId - 远程开关 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.switchName] - 开关名称
   * @param {boolean} [data.switchValue] - 开关值
   * @param {string} [data.description] - 开关描述
   * @returns {Promise<Object>} 更新后的远程开关对象
   */
  static async updateRemoteSwitch(remoteSwitchId, data) {
    try {
      const remoteSwitch = await RemoteSwitch.findByPk(remoteSwitchId);

      if (!remoteSwitch) {
        return null;
      }

      const updateData = {};

      if (data.switchName !== undefined) {
        updateData.switchName = data.switchName;
      }

      if (data.switchValue !== undefined) {
        updateData.switchValue = Boolean(data.switchValue);
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      await remoteSwitch.update(updateData);

      logger.info('远程开关更新成功', {
        remoteSwitchId,
        updateData
      });

      return remoteSwitch;
    } catch (error) {
      logger.error('更新远程开关失败', {
        error: error.message,
        remoteSwitchId,
        data
      });
      throw error;
    }
  }

  /**
   * 删除远程开关
   * @param {number} remoteSwitchId - 远程开关 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteRemoteSwitch(remoteSwitchId) {
    try {
      const remoteSwitch = await RemoteSwitch.findByPk(remoteSwitchId);

      if (!remoteSwitch) {
        return false;
      }

      await remoteSwitch.destroy();

      logger.info('远程开关删除成功', {
        remoteSwitchId,
        switchKey: remoteSwitch.switchKey
      });

      return true;
    } catch (error) {
      logger.error('删除远程开关失败', {
        error: error.message,
        remoteSwitchId
      });
      throw error;
    }
  }

  /**
   * 获取远程开关列表（客户端使用）
   * @param {number} softwareId - 软件 ID
   * @param {string} [switchKey] - 可选的开关键名（获取特定开关）
   * @returns {Promise<Array|Object>} 远程开关列表或单个开关
   */
  static async getRemoteSwitches(softwareId, switchKey = null) {
    try {
      const where = { softwareId };

      if (switchKey) {
        where.switchKey = switchKey;
      }

      const remoteSwitches = await RemoteSwitch.findAll({
        where,
        attributes: ['id', 'switchName', 'switchKey', 'switchValue', 'description'],
        order: [['switchKey', 'ASC']]
      });

      // 如果指定了开关键名，返回单个开关
      if (switchKey) {
        if (remoteSwitches.length === 0) {
          return null;
        }
        return remoteSwitches[0];
      }

      // 返回所有开关
      return remoteSwitches;
    } catch (error) {
      logger.error('获取远程开关失败', {
        error: error.message,
        softwareId,
        switchKey
      });
      throw error;
    }
  }

  /**
   * 获取远程开关列表（管理端使用）
   * @param {number} softwareId - 软件 ID
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getRemoteSwitchList(softwareId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;
      
      const where = { softwareId };

      const { count, rows } = await RemoteSwitch.findAndCountAll({
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
      logger.error('获取远程开关列表失败', {
        error: error.message,
        softwareId,
        options
      });
      throw error;
    }
  }

  /**
   * 创建公告
   * @param {Object} data - 公告数据
   * @param {number} [data.softwareId] - 软件 ID (null 表示全局公告)
   * @param {string} data.title - 公告标题
   * @param {string} [data.content] - 公告内容
   * @param {string} [data.type='info'] - 公告类型 (info|warning|error|success)
   * @param {boolean} [data.isPopup=false] - 是否弹窗显示
   * @param {boolean} [data.showOnce=true] - 是否只显示一次
   * @param {boolean} [data.status=true] - 启用状态
   * @param {Date} [data.startTime] - 开始时间
   * @param {Date} [data.endTime] - 结束时间
   * @param {number} [data.sortOrder=0] - 排序顺序
   * @returns {Promise<Object>} 创建的公告对象
   */
  static async createAnnouncement(data) {
    try {
      const {
        softwareId,
        title,
        content,
        type = 'info',
        isPopup = false,
        showOnce = true,
        status = true,
        startTime,
        endTime,
        sortOrder = 0
      } = data;

      // 如果指定了软件 ID，验证软件是否存在
      if (softwareId) {
        const software = await Software.findByPk(softwareId);
        if (!software) {
          throw new Error('软件不存在');
        }
      }

      // 验证公告类型
      const validTypes = ['info', 'warning', 'error', 'success'];
      if (!validTypes.includes(type)) {
        throw new Error('公告类型必须是 info、warning、error 或 success');
      }

      // 验证时间范围
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
          throw new Error('开始时间必须早于结束时间');
        }
      }

      // 创建公告
      const announcement = await Announcement.create({
        softwareId: softwareId || null,
        title,
        content: content || null,
        type,
        isPopup: Boolean(isPopup),
        showOnce: Boolean(showOnce),
        status: Boolean(status),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        sortOrder: parseInt(sortOrder) || 0
      });

      logger.info('公告创建成功', {
        announcementId: announcement.id,
        softwareId: softwareId || 'global',
        title
      });

      return announcement;
    } catch (error) {
      logger.error('创建公告失败', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 更新公告
   * @param {number} announcementId - 公告 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.title] - 公告标题
   * @param {string} [data.content] - 公告内容
   * @param {string} [data.type] - 公告类型
   * @param {boolean} [data.isPopup] - 是否弹窗显示
   * @param {boolean} [data.showOnce] - 是否只显示一次
   * @param {boolean} [data.status] - 启用状态
   * @param {Date} [data.startTime] - 开始时间
   * @param {Date} [data.endTime] - 结束时间
   * @param {number} [data.sortOrder] - 排序顺序
   * @returns {Promise<Object>} 更新后的公告对象
   */
  static async updateAnnouncement(announcementId, data) {
    try {
      const announcement = await Announcement.findByPk(announcementId);

      if (!announcement) {
        return null;
      }

      const updateData = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.content !== undefined) {
        updateData.content = data.content;
      }

      if (data.type !== undefined) {
        const validTypes = ['info', 'warning', 'error', 'success'];
        if (!validTypes.includes(data.type)) {
          throw new Error('公告类型必须是 info、warning、error 或 success');
        }
        updateData.type = data.type;
      }

      if (data.isPopup !== undefined) {
        updateData.isPopup = Boolean(data.isPopup);
      }

      if (data.showOnce !== undefined) {
        updateData.showOnce = Boolean(data.showOnce);
      }

      if (data.status !== undefined) {
        updateData.status = Boolean(data.status);
      }

      if (data.startTime !== undefined) {
        updateData.startTime = data.startTime ? new Date(data.startTime) : null;
      }

      if (data.endTime !== undefined) {
        updateData.endTime = data.endTime ? new Date(data.endTime) : null;
      }

      if (data.sortOrder !== undefined) {
        updateData.sortOrder = parseInt(data.sortOrder) || 0;
      }

      // 验证时间范围
      const finalStartTime = updateData.startTime !== undefined ? updateData.startTime : announcement.startTime;
      const finalEndTime = updateData.endTime !== undefined ? updateData.endTime : announcement.endTime;
      
      if (finalStartTime && finalEndTime && finalStartTime >= finalEndTime) {
        throw new Error('开始时间必须早于结束时间');
      }

      await announcement.update(updateData);

      logger.info('公告更新成功', {
        announcementId,
        updateData
      });

      return announcement;
    } catch (error) {
      logger.error('更新公告失败', {
        error: error.message,
        announcementId,
        data
      });
      throw error;
    }
  }

  /**
   * 删除公告
   * @param {number} announcementId - 公告 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteAnnouncement(announcementId) {
    try {
      const announcement = await Announcement.findByPk(announcementId);

      if (!announcement) {
        return false;
      }

      await announcement.destroy();

      logger.info('公告删除成功', {
        announcementId,
        title: announcement.title
      });

      return true;
    } catch (error) {
      logger.error('删除公告失败', {
        error: error.message,
        announcementId
      });
      throw error;
    }
  }

  /**
   * 获取公告列表（客户端使用）
   * 过滤有效期和状态
   * @param {number} softwareId - 软件 ID
   * @returns {Promise<Array>} 公告列表
   */
  static async getAnnouncements(softwareId) {
    try {
      const now = new Date();

      // 构建查询条件
      const where = {
        status: true, // 只返回启用的公告
        [Op.or]: [
          { softwareId }, // 软件特定公告
          { softwareId: null } // 全局公告
        ]
      };

      // 过滤有效期
      // 公告必须满足以下条件之一：
      // 1. 没有设置时间范围（startTime 和 endTime 都为 null）
      // 2. 只设置了 startTime，且当前时间 >= startTime
      // 3. 只设置了 endTime，且当前时间 <= endTime
      // 4. 同时设置了 startTime 和 endTime，且当前时间在范围内
      where[Op.and] = [
        {
          [Op.or]: [
            { startTime: null },
            { startTime: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { endTime: null },
            { endTime: { [Op.gte]: now } }
          ]
        }
      ];

      const announcements = await Announcement.findAll({
        where,
        attributes: ['id', 'title', 'content', 'type', 'isPopup', 'showOnce', 'startTime', 'endTime', 'sortOrder'],
        order: [
          ['sortOrder', 'DESC'], // 按排序顺序降序
          ['createdAt', 'DESC']  // 然后按创建时间降序
        ]
      });

      logger.info('客户端获取公告列表成功', {
        softwareId,
        count: announcements.length
      });

      return announcements;
    } catch (error) {
      logger.error('获取公告列表失败', {
        error: error.message,
        softwareId
      });
      throw error;
    }
  }

  /**
   * 获取公告列表（管理端使用）
   * @param {number} [softwareId] - 软件 ID (可选，用于筛选)
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @param {boolean} [options.status] - 状态筛选
   * @param {string} [options.type] - 类型筛选
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getAnnouncementList(softwareId = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type
      } = options;

      const offset = (page - 1) * limit;
      
      const where = {};
      
      if (softwareId !== null) {
        where.softwareId = softwareId;
      }
      
      if (status !== undefined) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      const { count, rows } = await Announcement.findAndCountAll({
        where,
        order: [
          ['sortOrder', 'DESC'],
          ['createdAt', 'DESC']
        ],
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
      logger.error('获取公告列表失败', {
        error: error.message,
        softwareId,
        options
      });
      throw error;
    }
  }

  /**
   * 创建版本
   * @param {Object} data - 版本数据
   * @param {number} data.softwareId - 软件 ID
   * @param {string} data.version - 版本号 (如 "1.0.0")
   * @param {number} [data.versionCode] - 版本号（用于比较，如 100）
   * @param {string} [data.title] - 版本标题
   * @param {string} [data.changelog] - 更新日志
   * @param {string} [data.downloadUrl] - 下载链接
   * @param {string} [data.fileSize] - 文件大小
   * @param {string} [data.fileMd5] - 文件 MD5
   * @param {boolean} [data.forceUpdate=false] - 是否强制更新
   * @param {string} [data.minVersion] - 最低兼容版本
   * @param {boolean} [data.status=true] - 启用状态
   * @returns {Promise<Object>} 创建的版本对象
   */
  static async createVersion(data) {
    try {
      const {
        softwareId,
        version,
        versionCode,
        title,
        changelog,
        downloadUrl,
        fileSize,
        fileMd5,
        forceUpdate = false,
        minVersion,
        status = true
      } = data;

      // 验证软件是否存在
      const software = await Software.findByPk(softwareId);
      if (!software) {
        throw new Error('软件不存在');
      }

      // 检查版本号是否已存在
      const existingVersion = await Version.findOne({
        where: { softwareId, version }
      });

      if (existingVersion) {
        throw new Error('版本号已存在');
      }

      // 如果没有提供 versionCode，尝试从版本号生成
      let finalVersionCode = versionCode;
      if (finalVersionCode === undefined) {
        finalVersionCode = this._parseVersionCode(version);
      }

      // 创建版本
      const versionRecord = await Version.create({
        softwareId,
        version,
        versionCode: finalVersionCode,
        title: title || null,
        changelog: changelog || null,
        downloadUrl: downloadUrl || null,
        fileSize: fileSize || null,
        fileMd5: fileMd5 || null,
        forceUpdate: Boolean(forceUpdate),
        minVersion: minVersion || null,
        status: Boolean(status)
      });

      logger.info('版本创建成功', {
        versionId: versionRecord.id,
        softwareId,
        version
      });

      return versionRecord;
    } catch (error) {
      logger.error('创建版本失败', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * 更新版本
   * @param {number} versionId - 版本 ID
   * @param {Object} data - 更新数据
   * @param {string} [data.version] - 版本号
   * @param {number} [data.versionCode] - 版本号（用于比较）
   * @param {string} [data.title] - 版本标题
   * @param {string} [data.changelog] - 更新日志
   * @param {string} [data.downloadUrl] - 下载链接
   * @param {string} [data.fileSize] - 文件大小
   * @param {string} [data.fileMd5] - 文件 MD5
   * @param {boolean} [data.forceUpdate] - 是否强制更新
   * @param {string} [data.minVersion] - 最低兼容版本
   * @param {boolean} [data.status] - 启用状态
   * @returns {Promise<Object>} 更新后的版本对象
   */
  static async updateVersion(versionId, data) {
    try {
      const versionRecord = await Version.findByPk(versionId);

      if (!versionRecord) {
        return null;
      }

      const updateData = {};

      if (data.version !== undefined) {
        // 检查新版本号是否与其他版本冲突
        const existingVersion = await Version.findOne({
          where: {
            softwareId: versionRecord.softwareId,
            version: data.version,
            id: { [Op.ne]: versionId }
          }
        });

        if (existingVersion) {
          throw new Error('版本号已存在');
        }

        updateData.version = data.version;

        // 如果更新了版本号但没有提供新的 versionCode，重新生成
        if (data.versionCode === undefined) {
          updateData.versionCode = this._parseVersionCode(data.version);
        }
      }

      if (data.versionCode !== undefined) {
        updateData.versionCode = data.versionCode;
      }

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.changelog !== undefined) {
        updateData.changelog = data.changelog;
      }

      if (data.downloadUrl !== undefined) {
        updateData.downloadUrl = data.downloadUrl;
      }

      if (data.fileSize !== undefined) {
        updateData.fileSize = data.fileSize;
      }

      if (data.fileMd5 !== undefined) {
        updateData.fileMd5 = data.fileMd5;
      }

      if (data.forceUpdate !== undefined) {
        updateData.forceUpdate = Boolean(data.forceUpdate);
      }

      if (data.minVersion !== undefined) {
        updateData.minVersion = data.minVersion;
      }

      if (data.status !== undefined) {
        updateData.status = Boolean(data.status);
      }

      await versionRecord.update(updateData);

      logger.info('版本更新成功', {
        versionId,
        updateData
      });

      return versionRecord;
    } catch (error) {
      logger.error('更新版本失败', {
        error: error.message,
        versionId,
        data
      });
      throw error;
    }
  }

  /**
   * 删除版本
   * @param {number} versionId - 版本 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteVersion(versionId) {
    try {
      const versionRecord = await Version.findByPk(versionId);

      if (!versionRecord) {
        return false;
      }

      await versionRecord.destroy();

      logger.info('版本删除成功', {
        versionId,
        version: versionRecord.version
      });

      return true;
    } catch (error) {
      logger.error('删除版本失败', {
        error: error.message,
        versionId
      });
      throw error;
    }
  }

  /**
   * 检查更新
   * @param {number} softwareId - 软件 ID
   * @param {string} currentVersion - 当前版本号
   * @returns {Promise<Object|null>} 更新信息或 null（无需更新）
   */
  static async checkUpdate(softwareId, currentVersion) {
    try {
      // 解析当前版本的 versionCode
      const currentVersionCode = this._parseVersionCode(currentVersion);

      // 查找最新的启用版本
      const latestVersion = await Version.findOne({
        where: {
          softwareId,
          status: true
        },
        order: [['versionCode', 'DESC']],
        attributes: ['id', 'version', 'versionCode', 'title', 'changelog', 'downloadUrl', 'fileSize', 'fileMd5', 'forceUpdate', 'minVersion']
      });

      // 如果没有找到版本记录
      if (!latestVersion) {
        logger.info('检查更新：未找到版本记录', {
          softwareId,
          currentVersion
        });
        return null;
      }

      // 比较版本号
      if (latestVersion.versionCode > currentVersionCode) {
        // 有新版本
        logger.info('检查更新：发现新版本', {
          softwareId,
          currentVersion,
          latestVersion: latestVersion.version
        });

        return {
          hasUpdate: true,
          version: latestVersion.version,
          versionCode: latestVersion.versionCode,
          title: latestVersion.title,
          changelog: latestVersion.changelog,
          downloadUrl: latestVersion.downloadUrl,
          fileSize: latestVersion.fileSize,
          fileMd5: latestVersion.fileMd5,
          forceUpdate: latestVersion.forceUpdate,
          minVersion: latestVersion.minVersion
        };
      } else {
        // 已是最新版本
        logger.info('检查更新：已是最新版本', {
          softwareId,
          currentVersion
        });

        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: latestVersion.version
        };
      }
    } catch (error) {
      logger.error('检查更新失败', {
        error: error.message,
        softwareId,
        currentVersion
      });
      throw error;
    }
  }

  /**
   * 获取版本列表（管理端使用）
   * @param {number} softwareId - 软件 ID
   * @param {Object} options - 查询选项
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.limit=20] - 每页数量
   * @param {boolean} [options.status] - 状态筛选
   * @returns {Promise<Object>} { items, total, page, limit }
   */
  static async getVersionList(softwareId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status
      } = options;

      const offset = (page - 1) * limit;
      
      const where = { softwareId };
      
      if (status !== undefined) {
        where.status = status;
      }

      const { count, rows } = await Version.findAndCountAll({
        where,
        order: [['versionCode', 'DESC']],
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
      logger.error('获取版本列表失败', {
        error: error.message,
        softwareId,
        options
      });
      throw error;
    }
  }

  /**
   * 解析版本号为 versionCode
   * 将语义化版本号（如 "1.2.3"）转换为整数（如 10203）
   * @private
   * @param {string} version - 版本号字符串
   * @returns {number} 版本代码
   */
  static _parseVersionCode(version) {
    try {
      // 移除 'v' 前缀（如果有）
      const cleanVersion = version.replace(/^v/, '');
      
      // 分割版本号
      const parts = cleanVersion.split('.');
      
      // 确保至少有 3 个部分，不足的补 0
      while (parts.length < 3) {
        parts.push('0');
      }

      // 取前 3 个部分
      const [major, minor, patch] = parts.slice(0, 3).map(p => {
        // 移除非数字字符（如 "1.0.0-beta" -> "1.0.0"）
        const num = parseInt(p.replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
      });

      // 计算 versionCode: major * 10000 + minor * 100 + patch
      // 例如: 1.2.3 -> 10203
      const versionCode = major * 10000 + minor * 100 + patch;

      return versionCode;
    } catch (error) {
      logger.warn('解析版本号失败，使用默认值 0', {
        version,
        error: error.message
      });
      return 0;
    }
  }
}

module.exports = CloudService;
