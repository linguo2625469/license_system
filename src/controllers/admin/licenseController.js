const LicenseService = require('../../services/licenseService');
const DeviceService = require('../../services/deviceService');
const { AuthLog } = require('../../models');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 授权码管理控制器
 * 处理授权码的生成、查询、更新和删除操作
 */
class LicenseController {
  /**
   * 批量生成授权码
   * POST /api/admin/licenses/generate
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async generateLicenses(req, res) {
    try {
      const {
        softwareId,
        count,
        isPointCard,
        // 时长卡配置
        cardType,
        duration,
        activateMode,
        startTime,
        // 点卡配置
        totalPoints,
        deductType,
        deductAmount,
        // 设备配置
        maxDevices,
        allowRebind,
        singleOnline,
        remark
      } = req.body;

      // 参数验证
      if (!softwareId || isNaN(parseInt(softwareId))) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是有效的整数');
      }

      if (!count || isNaN(parseInt(count)) || count < 1 || count > 1000) {
        return ResponseFormatter.validationError(res, '生成数量必须在 1-1000 之间');
      }

      // 验证授权码类型配置
      if (isPointCard) {
        // 点卡验证
        if (!totalPoints || totalPoints < 1) {
          return ResponseFormatter.validationError(res, '点卡总点数必须大于 0');
        }
        if (!deductType || !['per_use', 'per_hour', 'per_day'].includes(deductType)) {
          return ResponseFormatter.validationError(res, '扣点类型必须是 per_use、per_hour 或 per_day');
        }
      } else {
        // 时长卡验证
        const validCardTypes = ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year', 'permanent'];
        if (!cardType || !validCardTypes.includes(cardType)) {
          return ResponseFormatter.validationError(res, '时长卡类型无效');
        }
        if (cardType !== 'permanent' && (!duration || duration < 1)) {
          return ResponseFormatter.validationError(res, '时长数值必须大于 0');
        }
        if (activateMode === 'scheduled' && !startTime) {
          return ResponseFormatter.validationError(res, '定时激活模式必须提供开始时间');
        }
      }

      // 构建配置对象
      const config = {
        isPointCard: Boolean(isPointCard),
        maxDevices: maxDevices || 1,
        allowRebind: allowRebind || 0,
        singleOnline: singleOnline !== undefined ? Boolean(singleOnline) : true,
        remark: remark || null
      };

      if (isPointCard) {
        config.totalPoints = parseInt(totalPoints);
        config.deductType = deductType;
        config.deductAmount = deductAmount || 1;
      } else {
        config.cardType = cardType;
        config.duration = cardType === 'permanent' ? 0 : parseInt(duration);
        config.activateMode = activateMode || 'first_use';
        if (activateMode === 'scheduled' && startTime) {
          config.startTime = new Date(startTime);
        }
      }

      // 生成授权码
      const licenses = await LicenseService.generateLicenses(
        parseInt(softwareId),
        config,
        parseInt(count)
      );

      logger.info('批量生成授权码成功', {
        softwareId,
        count: licenses.length,
        isPointCard,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, {
        licenses,
        count: licenses.length
      }, `成功生成 ${licenses.length} 个授权码`);
    } catch (error) {
      logger.error('批量生成授权码失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message === '软件不存在') {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      return ResponseFormatter.serverError(res, error, '批量生成授权码失败');
    }
  }

  /**
   * 获取授权码列表
   * GET /api/admin/licenses
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getLicenseList(req, res) {
    try {
      const {
        softwareId,
        status,
        isPointCard,
        search,
        page = 1,
        limit = 10
      } = req.query;

      // 参数验证
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

      if (softwareId) {
        const softwareIdNum = parseInt(softwareId);
        if (isNaN(softwareIdNum)) {
          return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
        }
        options.softwareId = softwareIdNum;
      }

      if (status) {
        const validStatuses = ['unused', 'active', 'expired', 'disabled'];
        if (!validStatuses.includes(status)) {
          return ResponseFormatter.validationError(res, '状态值无效');
        }
        options.status = status;
      }

      if (isPointCard !== undefined) {
        options.isPointCard = isPointCard === 'true' || isPointCard === '1';
      }

      if (search) {
        options.search = search.trim();
      }

      // 获取授权码列表
      const result = await LicenseService.getLicenseList(options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取授权码列表成功'
      );
    } catch (error) {
      logger.error('获取授权码列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取授权码列表失败');
    }
  }

  /**
   * 获取授权码详情
   * GET /api/admin/licenses/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getLicenseDetail(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const authCodeId = parseInt(id);
      if (isNaN(authCodeId)) {
        return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
      }

      // 获取授权码详情
      const license = await LicenseService.getLicenseDetail(authCodeId);

      if (!license) {
        return ResponseFormatter.notFound(res, '授权码不存在');
      }

      return ResponseFormatter.success(res, license, '获取授权码详情成功');
    } catch (error) {
      logger.error('获取授权码详情失败', {
        error: error.message,
        authCodeId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取授权码详情失败');
    }
  }

  /**
   * 更新授权码
   * PUT /api/admin/licenses/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateLicense(req, res) {
    try {
      const { id } = req.params;
      const {
        status,
        maxDevices,
        allowRebind,
        singleOnline,
        remark,
        startTime,
        expireTime,
        remainingPoints
      } = req.body;

      // 参数验证
      const authCodeId = parseInt(id);
      if (isNaN(authCodeId)) {
        return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
      }

      // 构建更新数据
      const updateData = {};

      if (status !== undefined) {
        const validStatuses = ['unused', 'active', 'expired', 'disabled'];
        if (!validStatuses.includes(status)) {
          return ResponseFormatter.validationError(res, '状态值无效');
        }
        updateData.status = status;
      }

      if (maxDevices !== undefined) {
        const maxDevicesNum = parseInt(maxDevices);
        if (isNaN(maxDevicesNum) || maxDevicesNum < 1) {
          return ResponseFormatter.validationError(res, '最大设备数必须大于 0');
        }
        updateData.maxDevices = maxDevicesNum;
      }

      if (allowRebind !== undefined) {
        const allowRebindNum = parseInt(allowRebind);
        if (isNaN(allowRebindNum) || allowRebindNum < 0) {
          return ResponseFormatter.validationError(res, '允许换绑次数不能为负数');
        }
        updateData.allowRebind = allowRebindNum;
      }

      if (singleOnline !== undefined) {
        updateData.singleOnline = Boolean(singleOnline);
      }

      if (remark !== undefined) {
        updateData.remark = remark;
      }

      if (startTime !== undefined) {
        updateData.startTime = startTime ? new Date(startTime) : null;
      }

      if (expireTime !== undefined) {
        updateData.expireTime = expireTime ? new Date(expireTime) : null;
      }

      if (remainingPoints !== undefined) {
        const remainingPointsNum = parseInt(remainingPoints);
        if (isNaN(remainingPointsNum) || remainingPointsNum < 0) {
          return ResponseFormatter.validationError(res, '剩余点数不能为负数');
        }
        updateData.remainingPoints = remainingPointsNum;
      }

      // 更新授权码
      const license = await LicenseService.updateLicense(authCodeId, updateData);

      if (!license) {
        return ResponseFormatter.notFound(res, '授权码不存在');
      }

      logger.info('授权码更新成功', {
        authCodeId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, license, '授权码更新成功');
    } catch (error) {
      logger.error('更新授权码失败', {
        error: error.message,
        authCodeId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '更新授权码失败');
    }
  }

  /**
   * 删除授权码
   * DELETE /api/admin/licenses/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteLicense(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const authCodeId = parseInt(id);
      if (isNaN(authCodeId)) {
        return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
      }

      // 删除授权码
      const deleted = await LicenseService.deleteLicense(authCodeId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '授权码不存在');
      }

      logger.info('授权码删除成功', {
        authCodeId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '授权码删除成功');
    } catch (error) {
      logger.error('删除授权码失败', {
        error: error.message,
        authCodeId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除授权码失败');
    }
  }

  /**
   * 强制解绑设备
   * POST /api/admin/licenses/:id/unbind
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async unbindDevice(req, res) {
    try {
      const { id } = req.params;
      const { deviceId } = req.body;

      // 参数验证
      const authCodeId = parseInt(id);
      if (isNaN(authCodeId)) {
        return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
      }

      const deviceIdNum = parseInt(deviceId);
      if (isNaN(deviceIdNum)) {
        return ResponseFormatter.validationError(res, '设备 ID 必须是整数');
      }

      // 验证授权码是否存在
      const authCode = await LicenseService.getLicenseDetail(authCodeId);
      if (!authCode) {
        return ResponseFormatter.notFound(res, '授权码不存在');
      }

      // 执行解绑操作
      const success = await DeviceService.unbindDevice(authCodeId, deviceIdNum);

      if (!success) {
        return ResponseFormatter.notFound(res, '设备不存在或未绑定到此授权码');
      }

      // 记录解绑日志
      await AuthLog.create({
        softwareId: authCode.softwareId,
        action: 'admin_unbind',
        authCodeId: authCode.id,
        deviceId: deviceIdNum,
        ip: req.ip || req.connection.remoteAddress,
        responseCode: 200,
        responseMsg: `管理员强制解绑设备 ${deviceIdNum}`
      });

      logger.info('管理员强制解绑设备成功', {
        authCodeId,
        deviceId: deviceIdNum,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '设备解绑成功');
    } catch (error) {
      logger.error('管理员强制解绑设备失败', {
        error: error.message,
        authCodeId: req.params.id,
        deviceId: req.body.deviceId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '设备解绑失败');
    }
  }

  /**
   * 调整授权码时间
   * POST /api/admin/licenses/:id/adjust-time
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async adjustLicenseTime(req, res) {
    try {
      const { id } = req.params;
      const { type, value, unit, reason } = req.body;

      // 参数验证
      if (!type || !['add', 'subtract'].includes(type)) {
        return ResponseFormatter.validationError(res, '调整类型必须是 add 或 subtract');
      }

      if (!value || isNaN(parseInt(value)) || value <= 0) {
        return ResponseFormatter.validationError(res, '调整数值必须是正整数');
      }

      const validUnits = ['minute', 'hour', 'day', 'week', 'month', 'year'];
      if (!unit || !validUnits.includes(unit)) {
        return ResponseFormatter.validationError(res, `时间单位必须是: ${validUnits.join(', ')}`);
      }

      const authCodeId = parseInt(id);
      if (isNaN(authCodeId)) {
        return ResponseFormatter.validationError(res, '授权码 ID 必须是有效的整数');
      }

      // 调整时间
      const result = await LicenseService.adjustLicenseTime(authCodeId, {
        type,
        value: parseInt(value),
        unit,
        reason
      });

      logger.info('管理员调整授权码时间', {
        authCodeId,
        type,
        value,
        unit,
        reason,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, result, '授权码时间调整成功');
    } catch (error) {
      logger.error('调整授权码时间失败', {
        error: error.message,
        authCodeId: req.params.id,
        body: req.body,
        adminId: req.admin?.id,
        ip: req.ip
      });

      if (error.message.includes('不存在') || error.message.includes('不支持') || error.message.includes('不能')) {
        return ResponseFormatter.error(res, 'E9902', error.message, 400);
      }

      return ResponseFormatter.serverError(res, error, '调整授权码时间失败');
    }
  }
}

module.exports = LicenseController;
