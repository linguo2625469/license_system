const LogService = require('../../services/logService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 日志管理控制器
 * 处理日志查询和统计
 */
class LogController {
  /**
   * 获取授权日志列表
   * GET /api/admin/logs/auth
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getAuthLogs(req, res) {
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

      if (action) {
        options.action = action;
      }

      if (authCodeId) {
        const authCodeIdNum = parseInt(authCodeId);
        if (isNaN(authCodeIdNum)) {
          return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
        }
        options.authCodeId = authCodeIdNum;
      }

      if (deviceId) {
        const deviceIdNum = parseInt(deviceId);
        if (isNaN(deviceIdNum)) {
          return ResponseFormatter.validationError(res, '设备 ID 必须是整数');
        }
        options.deviceId = deviceIdNum;
      }

      if (fingerprint) {
        options.fingerprint = fingerprint;
      }

      if (ip) {
        options.ip = ip;
      }

      if (startDate) {
        options.startDate = startDate;
      }

      if (endDate) {
        options.endDate = endDate;
      }

      // 获取授权日志列表
      const result = await LogService.getAuthLogs(options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取授权日志列表成功'
      );
    } catch (error) {
      logger.error('获取授权日志列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取授权日志列表失败');
    }
  }


  /**
   * 获取点卡扣点日志列表
   * GET /api/admin/logs/points
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getPointDeductLogs(req, res) {
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

      if (authCodeId) {
        const authCodeIdNum = parseInt(authCodeId);
        if (isNaN(authCodeIdNum)) {
          return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
        }
        options.authCodeId = authCodeIdNum;
      }

      if (authCode) {
        options.authCode = authCode;
      }

      if (deviceId) {
        const deviceIdNum = parseInt(deviceId);
        if (isNaN(deviceIdNum)) {
          return ResponseFormatter.validationError(res, '设备 ID 必须是整数');
        }
        options.deviceId = deviceIdNum;
      }

      if (deductType) {
        const validTypes = ['per_use', 'per_hour', 'per_day'];
        if (!validTypes.includes(deductType)) {
          return ResponseFormatter.validationError(res, '扣点类型无效');
        }
        options.deductType = deductType;
      }

      if (ip) {
        options.ip = ip;
      }

      if (startDate) {
        options.startDate = startDate;
      }

      if (endDate) {
        options.endDate = endDate;
      }

      // 获取点卡扣点日志列表
      const result = await LogService.getPointDeductLogs(options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取点卡扣点日志列表成功'
      );
    } catch (error) {
      logger.error('获取点卡扣点日志列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取点卡扣点日志列表失败');
    }
  }

  /**
   * 获取授权日志统计信息
   * GET /api/admin/logs/auth/stats
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getAuthLogStats(req, res) {
    try {
      const { softwareId, startDate, endDate } = req.query;

      // 构建查询选项
      const options = {};

      if (softwareId) {
        const softwareIdNum = parseInt(softwareId);
        if (isNaN(softwareIdNum)) {
          return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
        }
        options.softwareId = softwareIdNum;
      }

      if (startDate) {
        options.startDate = startDate;
      }

      if (endDate) {
        options.endDate = endDate;
      }

      // 获取统计信息
      const stats = await LogService.getAuthLogStats(options);

      return ResponseFormatter.success(res, stats, '获取授权日志统计成功');
    } catch (error) {
      logger.error('获取授权日志统计失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取授权日志统计失败');
    }
  }

  /**
   * 获取点卡扣点日志统计信息
   * GET /api/admin/logs/points/stats
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getPointDeductLogStats(req, res) {
    try {
      const { authCodeId, startDate, endDate } = req.query;

      // 构建查询选项
      const options = {};

      if (authCodeId) {
        const authCodeIdNum = parseInt(authCodeId);
        if (isNaN(authCodeIdNum)) {
          return ResponseFormatter.validationError(res, '授权码 ID 必须是整数');
        }
        options.authCodeId = authCodeIdNum;
      }

      if (startDate) {
        options.startDate = startDate;
      }

      if (endDate) {
        options.endDate = endDate;
      }

      // 获取统计信息
      const stats = await LogService.getPointDeductLogStats(options);

      return ResponseFormatter.success(res, stats, '获取点卡扣点日志统计成功');
    } catch (error) {
      logger.error('获取点卡扣点日志统计失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取点卡扣点日志统计失败');
    }
  }
}

module.exports = LogController;
