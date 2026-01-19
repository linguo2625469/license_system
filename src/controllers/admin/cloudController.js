const CloudService = require('../../services/cloudService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 云控管理控制器（管理端）
 * 处理远程变量、开关、公告和版本管理
 */
class CloudController {
  /**
   * 创建远程变量
   * POST /api/admin/cloud/vars
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async createRemoteVar(req, res) {
    try {
      const { softwareId, varName, varValue, varType, description, status } = req.body;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      if (!varName || varName.trim() === '') {
        return ResponseFormatter.validationError(res, '变量名不能为空');
      }

      if (varValue === undefined || varValue === null) {
        return ResponseFormatter.validationError(res, '变量值不能为空');
      }

      if (!varType || !['string', 'number', 'boolean', 'json'].includes(varType)) {
        return ResponseFormatter.validationError(res, '变量类型必须是 string、number、boolean 或 json');
      }

      // 创建远程变量
      const remoteVar = await CloudService.createRemoteVar({
        softwareId: parseInt(softwareId),
        varName: varName.trim(),
        varValue,
        varType,
        description,
        status: status !== undefined ? Boolean(status) : true
      });

      logger.info('远程变量创建成功', {
        remoteVarId: remoteVar.id,
        softwareId,
        varName,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, remoteVar, '远程变量创建成功');
    } catch (error) {
      logger.error('创建远程变量失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '软件不存在') {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      if (error.message === '变量名已存在') {
        return ResponseFormatter.error(res, 'E0501', '变量名已存在', 400);
      }

      if (error.message.includes('无效')) {
        return ResponseFormatter.validationError(res, error.message);
      }

      return ResponseFormatter.serverError(res, error, '创建远程变量失败');
    }
  }

  /**
   * 获取远程变量列表
   * GET /api/admin/cloud/vars
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getRemoteVarList(req, res) {
    try {
      const {
        softwareId,
        page = 1,
        limit = 20,
        status
      } = req.query;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return ResponseFormatter.validationError(res, '页码必须是大于 0 的整数');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ResponseFormatter.validationError(res, '每页数量必须在 1-100 之间');
      }

      // 构建查询选项
      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (status !== undefined) {
        options.status = status === 'true' || status === '1';
      }

      // 获取远程变量列表
      const result = await CloudService.getRemoteVarList(parseInt(softwareId), options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取远程变量列表成功'
      );
    } catch (error) {
      logger.error('获取远程变量列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取远程变量列表失败');
    }
  }

  /**
   * 更新远程变量
   * PUT /api/admin/cloud/vars/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateRemoteVar(req, res) {
    try {
      const { id } = req.params;
      const { varValue, varType, description, status } = req.body;

      // 参数验证
      const remoteVarId = parseInt(id);
      if (isNaN(remoteVarId)) {
        return ResponseFormatter.validationError(res, '远程变量 ID 必须是整数');
      }

      if (varType && !['string', 'number', 'boolean', 'json'].includes(varType)) {
        return ResponseFormatter.validationError(res, '变量类型必须是 string、number、boolean 或 json');
      }

      // 构建更新数据
      const updateData = {};

      if (varValue !== undefined) {
        updateData.varValue = varValue;
      }

      if (varType !== undefined) {
        updateData.varType = varType;
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (status !== undefined) {
        updateData.status = Boolean(status);
      }

      // 更新远程变量
      const remoteVar = await CloudService.updateRemoteVar(remoteVarId, updateData);

      if (!remoteVar) {
        return ResponseFormatter.notFound(res, '远程变量不存在');
      }

      logger.info('远程变量更新成功', {
        remoteVarId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, remoteVar, '远程变量更新成功');
    } catch (error) {
      logger.error('更新远程变量失败', {
        error: error.message,
        remoteVarId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message.includes('无效')) {
        return ResponseFormatter.validationError(res, error.message);
      }

      return ResponseFormatter.serverError(res, error, '更新远程变量失败');
    }
  }

  /**
   * 删除远程变量
   * DELETE /api/admin/cloud/vars/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteRemoteVar(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const remoteVarId = parseInt(id);
      if (isNaN(remoteVarId)) {
        return ResponseFormatter.validationError(res, '远程变量 ID 必须是整数');
      }

      // 删除远程变量
      const deleted = await CloudService.deleteRemoteVar(remoteVarId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '远程变量不存在');
      }

      logger.info('远程变量删除成功', {
        remoteVarId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '远程变量删除成功');
    } catch (error) {
      logger.error('删除远程变量失败', {
        error: error.message,
        remoteVarId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除远程变量失败');
    }
  }

  /**
   * 创建远程开关
   * POST /api/admin/cloud/switches
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async createRemoteSwitch(req, res) {
    try {
      const { softwareId, switchName, switchKey, switchValue, description } = req.body;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      if (!switchName || switchName.trim() === '') {
        return ResponseFormatter.validationError(res, '开关名称不能为空');
      }

      if (!switchKey || switchKey.trim() === '') {
        return ResponseFormatter.validationError(res, '开关键名不能为空');
      }

      // 创建远程开关
      const remoteSwitch = await CloudService.createRemoteSwitch({
        softwareId: parseInt(softwareId),
        switchName: switchName.trim(),
        switchKey: switchKey.trim(),
        switchValue: switchValue !== undefined ? Boolean(switchValue) : false,
        description
      });

      logger.info('远程开关创建成功', {
        remoteSwitchId: remoteSwitch.id,
        softwareId,
        switchKey,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, remoteSwitch, '远程开关创建成功');
    } catch (error) {
      logger.error('创建远程开关失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '软件不存在') {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      if (error.message === '开关键名已存在') {
        return ResponseFormatter.error(res, 'E0502', '开关键名已存在', 400);
      }

      return ResponseFormatter.serverError(res, error, '创建远程开关失败');
    }
  }

  /**
   * 获取远程开关列表
   * GET /api/admin/cloud/switches
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getRemoteSwitchList(req, res) {
    try {
      const {
        softwareId,
        page = 1,
        limit = 20
      } = req.query;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return ResponseFormatter.validationError(res, '页码必须是大于 0 的整数');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ResponseFormatter.validationError(res, '每页数量必须在 1-100 之间');
      }

      // 构建查询选项
      const options = {
        page: pageNum,
        limit: limitNum
      };

      // 获取远程开关列表
      const result = await CloudService.getRemoteSwitchList(parseInt(softwareId), options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取远程开关列表成功'
      );
    } catch (error) {
      logger.error('获取远程开关列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取远程开关列表失败');
    }
  }

  /**
   * 更新远程开关
   * PUT /api/admin/cloud/switches/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateRemoteSwitch(req, res) {
    try {
      const { id } = req.params;
      const { switchName, switchValue, description } = req.body;

      // 参数验证
      const remoteSwitchId = parseInt(id);
      if (isNaN(remoteSwitchId)) {
        return ResponseFormatter.validationError(res, '远程开关 ID 必须是整数');
      }

      // 构建更新数据
      const updateData = {};

      if (switchName !== undefined) {
        updateData.switchName = switchName;
      }

      if (switchValue !== undefined) {
        updateData.switchValue = Boolean(switchValue);
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      // 更新远程开关
      const remoteSwitch = await CloudService.updateRemoteSwitch(remoteSwitchId, updateData);

      if (!remoteSwitch) {
        return ResponseFormatter.notFound(res, '远程开关不存在');
      }

      logger.info('远程开关更新成功', {
        remoteSwitchId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, remoteSwitch, '远程开关更新成功');
    } catch (error) {
      logger.error('更新远程开关失败', {
        error: error.message,
        remoteSwitchId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '更新远程开关失败');
    }
  }

  /**
   * 切换远程开关状态
   * PATCH /api/admin/cloud/switches/:id/toggle
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async toggleRemoteSwitch(req, res) {
    try {
      const { id } = req.params;
      const { switchValue } = req.body;

      // 参数验证
      const remoteSwitchId = parseInt(id);
      if (isNaN(remoteSwitchId)) {
        return ResponseFormatter.validationError(res, '远程开关 ID 必须是整数');
      }

      if (switchValue === undefined) {
        return ResponseFormatter.validationError(res, '开关值不能为空');
      }

      // 切换远程开关
      const remoteSwitch = await CloudService.toggleSwitch(remoteSwitchId, switchValue);

      if (!remoteSwitch) {
        return ResponseFormatter.notFound(res, '远程开关不存在');
      }

      logger.info('远程开关切换成功', {
        remoteSwitchId,
        switchValue: Boolean(switchValue),
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, remoteSwitch, '远程开关切换成功');
    } catch (error) {
      logger.error('切换远程开关失败', {
        error: error.message,
        remoteSwitchId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '切换远程开关失败');
    }
  }

  /**
   * 删除远程开关
   * DELETE /api/admin/cloud/switches/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteRemoteSwitch(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const remoteSwitchId = parseInt(id);
      if (isNaN(remoteSwitchId)) {
        return ResponseFormatter.validationError(res, '远程开关 ID 必须是整数');
      }

      // 删除远程开关
      const deleted = await CloudService.deleteRemoteSwitch(remoteSwitchId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '远程开关不存在');
      }

      logger.info('远程开关删除成功', {
        remoteSwitchId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '远程开关删除成功');
    } catch (error) {
      logger.error('删除远程开关失败', {
        error: error.message,
        remoteSwitchId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除远程开关失败');
    }
  }

  /**
   * 创建公告
   * POST /api/admin/cloud/announcements
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async createAnnouncement(req, res) {
    try {
      const {
        softwareId,
        title,
        content,
        type,
        isPopup,
        showOnce,
        status,
        startTime,
        endTime,
        sortOrder
      } = req.body;

      // 参数验证
      if (!title || title.trim() === '') {
        return ResponseFormatter.validationError(res, '公告标题不能为空');
      }

      if (type && !['info', 'warning', 'error', 'success'].includes(type)) {
        return ResponseFormatter.validationError(res, '公告类型必须是 info、warning、error 或 success');
      }

      // 创建公告
      const announcement = await CloudService.createAnnouncement({
        softwareId: softwareId ? parseInt(softwareId) : null,
        title: title.trim(),
        content,
        type,
        isPopup,
        showOnce,
        status,
        startTime,
        endTime,
        sortOrder
      });

      logger.info('公告创建成功', {
        announcementId: announcement.id,
        softwareId: softwareId || 'global',
        title,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, announcement, '公告创建成功');
    } catch (error) {
      logger.error('创建公告失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '软件不存在') {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      if (error.message.includes('时间')) {
        return ResponseFormatter.validationError(res, error.message);
      }

      return ResponseFormatter.serverError(res, error, '创建公告失败');
    }
  }

  /**
   * 获取公告列表
   * GET /api/admin/cloud/announcements
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getAnnouncementList(req, res) {
    try {
      const {
        softwareId,
        page = 1,
        limit = 20,
        status,
        type
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return ResponseFormatter.validationError(res, '页码必须是大于 0 的整数');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ResponseFormatter.validationError(res, '每页数量必须在 1-100 之间');
      }

      // 构建查询选项
      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (status !== undefined) {
        options.status = status === 'true' || status === '1';
      }

      if (type) {
        options.type = type;
      }

      // 获取公告列表
      const result = await CloudService.getAnnouncementList(
        softwareId ? parseInt(softwareId) : null,
        options
      );

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取公告列表成功'
      );
    } catch (error) {
      logger.error('获取公告列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取公告列表失败');
    }
  }

  /**
   * 更新公告
   * PUT /api/admin/cloud/announcements/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        type,
        isPopup,
        showOnce,
        status,
        startTime,
        endTime,
        sortOrder
      } = req.body;

      // 参数验证
      const announcementId = parseInt(id);
      if (isNaN(announcementId)) {
        return ResponseFormatter.validationError(res, '公告 ID 必须是整数');
      }

      if (type && !['info', 'warning', 'error', 'success'].includes(type)) {
        return ResponseFormatter.validationError(res, '公告类型必须是 info、warning、error 或 success');
      }

      // 构建更新数据
      const updateData = {};

      if (title !== undefined) {
        if (title.trim() === '') {
          return ResponseFormatter.validationError(res, '公告标题不能为空');
        }
        updateData.title = title.trim();
      }

      if (content !== undefined) {
        updateData.content = content;
      }

      if (type !== undefined) {
        updateData.type = type;
      }

      if (isPopup !== undefined) {
        updateData.isPopup = Boolean(isPopup);
      }

      if (showOnce !== undefined) {
        updateData.showOnce = Boolean(showOnce);
      }

      if (status !== undefined) {
        updateData.status = Boolean(status);
      }

      if (startTime !== undefined) {
        updateData.startTime = startTime;
      }

      if (endTime !== undefined) {
        updateData.endTime = endTime;
      }

      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }

      // 更新公告
      const announcement = await CloudService.updateAnnouncement(announcementId, updateData);

      if (!announcement) {
        return ResponseFormatter.notFound(res, '公告不存在');
      }

      logger.info('公告更新成功', {
        announcementId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, announcement, '公告更新成功');
    } catch (error) {
      logger.error('更新公告失败', {
        error: error.message,
        announcementId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message.includes('时间')) {
        return ResponseFormatter.validationError(res, error.message);
      }

      return ResponseFormatter.serverError(res, error, '更新公告失败');
    }
  }

  /**
   * 删除公告
   * DELETE /api/admin/cloud/announcements/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const announcementId = parseInt(id);
      if (isNaN(announcementId)) {
        return ResponseFormatter.validationError(res, '公告 ID 必须是整数');
      }

      // 删除公告
      const deleted = await CloudService.deleteAnnouncement(announcementId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '公告不存在');
      }

      logger.info('公告删除成功', {
        announcementId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '公告删除成功');
    } catch (error) {
      logger.error('删除公告失败', {
        error: error.message,
        announcementId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除公告失败');
    }
  }

  /**
   * 创建版本
   * POST /api/admin/cloud/versions
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async createVersion(req, res) {
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
        forceUpdate,
        minVersion,
        status
      } = req.body;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      if (!version || version.trim() === '') {
        return ResponseFormatter.validationError(res, '版本号不能为空');
      }

      // 创建版本
      const versionRecord = await CloudService.createVersion({
        softwareId: parseInt(softwareId),
        version: version.trim(),
        versionCode,
        title,
        changelog,
        downloadUrl,
        fileSize,
        fileMd5,
        forceUpdate,
        minVersion,
        status
      });

      logger.info('版本创建成功', {
        versionId: versionRecord.id,
        softwareId,
        version,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, versionRecord, '版本创建成功');
    } catch (error) {
      logger.error('创建版本失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '软件不存在') {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      if (error.message === '版本号已存在') {
        return ResponseFormatter.error(res, 'E0503', '版本号已存在', 400);
      }

      return ResponseFormatter.serverError(res, error, '创建版本失败');
    }
  }

  /**
   * 获取版本列表
   * GET /api/admin/cloud/versions
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getVersionList(req, res) {
    try {
      const {
        softwareId,
        page = 1,
        limit = 20,
        status
      } = req.query;

      // 参数验证
      if (!softwareId) {
        return ResponseFormatter.validationError(res, '软件 ID 不能为空');
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return ResponseFormatter.validationError(res, '页码必须是大于 0 的整数');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ResponseFormatter.validationError(res, '每页数量必须在 1-100 之间');
      }

      // 构建查询选项
      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (status !== undefined) {
        options.status = status === 'true' || status === '1';
      }

      // 获取版本列表
      const result = await CloudService.getVersionList(parseInt(softwareId), options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取版本列表成功'
      );
    } catch (error) {
      logger.error('获取版本列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取版本列表失败');
    }
  }

  /**
   * 更新版本
   * PUT /api/admin/cloud/versions/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateVersion(req, res) {
    try {
      const { id } = req.params;
      const {
        version,
        versionCode,
        title,
        changelog,
        downloadUrl,
        fileSize,
        fileMd5,
        forceUpdate,
        minVersion,
        status
      } = req.body;

      // 参数验证
      const versionId = parseInt(id);
      if (isNaN(versionId)) {
        return ResponseFormatter.validationError(res, '版本 ID 必须是整数');
      }

      // 构建更新数据
      const updateData = {};

      if (version !== undefined) {
        if (version.trim() === '') {
          return ResponseFormatter.validationError(res, '版本号不能为空');
        }
        updateData.version = version.trim();
      }

      if (versionCode !== undefined) {
        updateData.versionCode = versionCode;
      }

      if (title !== undefined) {
        updateData.title = title;
      }

      if (changelog !== undefined) {
        updateData.changelog = changelog;
      }

      if (downloadUrl !== undefined) {
        updateData.downloadUrl = downloadUrl;
      }

      if (fileSize !== undefined) {
        updateData.fileSize = fileSize;
      }

      if (fileMd5 !== undefined) {
        updateData.fileMd5 = fileMd5;
      }

      if (forceUpdate !== undefined) {
        updateData.forceUpdate = Boolean(forceUpdate);
      }

      if (minVersion !== undefined) {
        updateData.minVersion = minVersion;
      }

      if (status !== undefined) {
        updateData.status = Boolean(status);
      }

      // 更新版本
      const versionRecord = await CloudService.updateVersion(versionId, updateData);

      if (!versionRecord) {
        return ResponseFormatter.notFound(res, '版本不存在');
      }

      logger.info('版本更新成功', {
        versionId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, versionRecord, '版本更新成功');
    } catch (error) {
      logger.error('更新版本失败', {
        error: error.message,
        versionId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '版本号已存在') {
        return ResponseFormatter.error(res, 'E0503', '版本号已存在', 400);
      }

      return ResponseFormatter.serverError(res, error, '更新版本失败');
    }
  }

  /**
   * 删除版本
   * DELETE /api/admin/cloud/versions/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteVersion(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const versionId = parseInt(id);
      if (isNaN(versionId)) {
        return ResponseFormatter.validationError(res, '版本 ID 必须是整数');
      }

      // 删除版本
      const deleted = await CloudService.deleteVersion(versionId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '版本不存在');
      }

      logger.info('版本删除成功', {
        versionId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '版本删除成功');
    } catch (error) {
      logger.error('删除版本失败', {
        error: error.message,
        versionId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除版本失败');
    }
  }
}

module.exports = CloudController;
