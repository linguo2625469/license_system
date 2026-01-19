const BlacklistService = require('../../services/blacklistService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 黑名单管理控制器
 * 处理设备和 IP 黑名单的管理接口
 */
class BlacklistController {
  /**
   * 添加设备到黑名单
   * POST /api/admin/blacklist/devices
   */
  static async addDeviceToBlacklist(req, res) {
    try {
      const { fingerprint, reason, softwareId } = req.body;
      const adminId = req.admin.id;

      if (!fingerprint) {
        return ResponseFormatter.error(res, 'E9902', '设备指纹不能为空', 400);
      }

      if (!reason) {
        return ResponseFormatter.error(res, 'E9902', '封禁原因不能为空', 400);
      }

      const blacklistEntry = await BlacklistService.addDeviceToBlacklist(
        fingerprint,
        reason,
        softwareId || null,
        adminId
      );

      logger.info('管理员添加设备到黑名单', {
        adminId,
        fingerprint,
        softwareId,
        blacklistId: blacklistEntry.id
      });

      return ResponseFormatter.success(res, {
        id: blacklistEntry.id,
        fingerprint: blacklistEntry.fingerprint,
        reason: blacklistEntry.reason,
        softwareId: blacklistEntry.softwareId,
        createdAt: blacklistEntry.createdAt
      }, '设备已添加到黑名单');
    } catch (error) {
      logger.error('添加设备到黑名单失败', {
        error: error.message,
        body: req.body
      });

      if (error.message === '设备已在黑名单中') {
        return ResponseFormatter.error(res, 'E0303', error.message, 400);
      }

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }

  /**
   * 从黑名单移除设备
   * DELETE /api/admin/blacklist/devices/:id
   */
  static async removeDeviceFromBlacklist(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.id;

      const success = await BlacklistService.removeDeviceFromBlacklist(parseInt(id));

      if (!success) {
        return ResponseFormatter.error(res, 'E0303', '黑名单记录不存在', 404);
      }

      logger.info('管理员从黑名单移除设备', {
        adminId,
        blacklistId: id
      });

      return ResponseFormatter.success(res, null, '设备已从黑名单移除');
    } catch (error) {
      logger.error('从黑名单移除设备失败', {
        error: error.message,
        blacklistId: req.params.id
      });

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }

  /**
   * 添加 IP 到黑名单
   * POST /api/admin/blacklist/ips
   */
  static async addIpToBlacklist(req, res) {
    try {
      const { ip, reason, softwareId } = req.body;

      if (!ip) {
        return ResponseFormatter.error(res, 'E9902', 'IP 地址不能为空', 400);
      }

      if (!reason) {
        return ResponseFormatter.error(res, 'E9902', '封禁原因不能为空', 400);
      }

      const blacklistEntry = await BlacklistService.addIpToBlacklist(
        ip,
        reason,
        softwareId || null
      );

      logger.info('管理员添加 IP 到黑名单', {
        adminId: req.admin.id,
        ip,
        softwareId,
        blacklistId: blacklistEntry.id
      });

      return ResponseFormatter.success(res, {
        id: blacklistEntry.id,
        ip: blacklistEntry.ip,
        reason: blacklistEntry.reason,
        softwareId: blacklistEntry.softwareId,
        createdAt: blacklistEntry.createdAt
      }, 'IP 已添加到黑名单');
    } catch (error) {
      logger.error('添加 IP 到黑名单失败', {
        error: error.message,
        body: req.body
      });

      if (error.message === 'IP 已在黑名单中') {
        return ResponseFormatter.error(res, 'E0304', error.message, 400);
      }

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }

  /**
   * 从黑名单移除 IP
   * DELETE /api/admin/blacklist/ips/:id
   */
  static async removeIpFromBlacklist(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.admin.id;

      const success = await BlacklistService.removeIpFromBlacklist(parseInt(id));

      if (!success) {
        return ResponseFormatter.error(res, 'E0304', '黑名单记录不存在', 404);
      }

      logger.info('管理员从黑名单移除 IP', {
        adminId,
        blacklistId: id
      });

      return ResponseFormatter.success(res, null, 'IP 已从黑名单移除');
    } catch (error) {
      logger.error('从黑名单移除 IP 失败', {
        error: error.message,
        blacklistId: req.params.id
      });

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }

  /**
   * 获取设备黑名单列表
   * GET /api/admin/blacklist/devices
   */
  static async getDeviceBlacklist(req, res) {
    try {
      const { softwareId, page, limit } = req.query;

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      if (softwareId) {
        options.softwareId = parseInt(softwareId);
      }

      const result = await BlacklistService.getDeviceBlacklist(options);

      return ResponseFormatter.success(res, {
        items: result.rows,
        pagination: {
          total: result.count,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          pageSize: options.limit
        }
      });
    } catch (error) {
      logger.error('获取设备黑名单列表失败', {
        error: error.message,
        query: req.query
      });

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }

  /**
   * 获取 IP 黑名单列表
   * GET /api/admin/blacklist/ips
   */
  static async getIpBlacklist(req, res) {
    try {
      const { softwareId, page, limit } = req.query;

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      if (softwareId) {
        options.softwareId = parseInt(softwareId);
      }

      const result = await BlacklistService.getIpBlacklist(options);

      return ResponseFormatter.success(res, {
        items: result.rows,
        pagination: {
          total: result.count,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          pageSize: options.limit
        }
      });
    } catch (error) {
      logger.error('获取 IP 黑名单列表失败', {
        error: error.message,
        query: req.query
      });

      return ResponseFormatter.error(res, 'E9999', error.message, 500);
    }
  }
}

module.exports = BlacklistController;
