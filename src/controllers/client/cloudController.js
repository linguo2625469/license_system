const CloudService = require('../../services/cloudService');
const SoftwareService = require('../../services/softwareService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 云控控制器（客户端）
 * 处理客户端获取远程变量、开关、公告和版本信息
 */
class CloudController {
  /**
   * 获取远程变量
   * GET /api/client/cloud/vars
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getRemoteVars(req, res) {
    try {
      const appKey = req.headers['x-app-key'];
      const { varName } = req.query;

      // 验证 AppKey
      if (!appKey) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 不能为空', 401);
      }

      // 获取软件信息
      const software = await SoftwareService.getSoftwareByAppKey(appKey);

      if (!software) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 无效', 401);
      }

      if (!software.status) {
        return ResponseFormatter.error(res, 'E0105', '软件已禁用', 403);
      }

      // 获取远程变量
      const remoteVars = await CloudService.getRemoteVars(software.id, varName);

      // 如果指定了变量名但未找到
      if (varName && !remoteVars) {
        return ResponseFormatter.notFound(res, '远程变量不存在');
      }

      logger.info('客户端获取远程变量成功', {
        softwareId: software.id,
        varName: varName || 'all',
        ip: req.ip
      });

      return ResponseFormatter.success(res, remoteVars, '获取远程变量成功');
    } catch (error) {
      logger.error('客户端获取远程变量失败', {
        error: error.message,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取远程变量失败');
    }
  }

  /**
   * 获取远程开关
   * GET /api/client/cloud/switches
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getRemoteSwitches(req, res) {
    try {
      const appKey = req.headers['x-app-key'];
      const { switchKey } = req.query;

      // 验证 AppKey
      if (!appKey) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 不能为空', 401);
      }

      // 获取软件信息
      const software = await SoftwareService.getSoftwareByAppKey(appKey);

      if (!software) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 无效', 401);
      }

      if (!software.status) {
        return ResponseFormatter.error(res, 'E0105', '软件已禁用', 403);
      }

      // 获取远程开关
      const remoteSwitches = await CloudService.getRemoteSwitches(software.id, switchKey);

      // 如果指定了开关键名但未找到
      if (switchKey && !remoteSwitches) {
        return ResponseFormatter.notFound(res, '远程开关不存在');
      }

      logger.info('客户端获取远程开关成功', {
        softwareId: software.id,
        switchKey: switchKey || 'all',
        ip: req.ip
      });

      return ResponseFormatter.success(res, remoteSwitches, '获取远程开关成功');
    } catch (error) {
      logger.error('客户端获取远程开关失败', {
        error: error.message,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取远程开关失败');
    }
  }

  /**
   * 获取公告列表
   * GET /api/client/cloud/announcements
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getAnnouncements(req, res) {
    try {
      const appKey = req.headers['x-app-key'];

      // 验证 AppKey
      if (!appKey) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 不能为空', 401);
      }

      // 获取软件信息
      const software = await SoftwareService.getSoftwareByAppKey(appKey);

      if (!software) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 无效', 401);
      }

      if (!software.status) {
        return ResponseFormatter.error(res, 'E0105', '软件已禁用', 403);
      }

      // 获取公告列表（包括软件特定公告和全局公告）
      const announcements = await CloudService.getAnnouncements(software.id);

      logger.info('客户端获取公告列表成功', {
        softwareId: software.id,
        count: announcements.length,
        ip: req.ip
      });

      return ResponseFormatter.success(res, announcements, '获取公告列表成功');
    } catch (error) {
      logger.error('客户端获取公告列表失败', {
        error: error.message,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取公告列表失败');
    }
  }

  /**
   * 检查版本更新
   * GET /api/client/cloud/version/check
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async checkUpdate(req, res) {
    try {
      const appKey = req.headers['x-app-key'];
      const { currentVersion } = req.query;

      // 验证 AppKey
      if (!appKey) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 不能为空', 401);
      }

      // 验证当前版本号
      if (!currentVersion || currentVersion.trim() === '') {
        return ResponseFormatter.validationError(res, '当前版本号不能为空');
      }

      // 获取软件信息
      const software = await SoftwareService.getSoftwareByAppKey(appKey);

      if (!software) {
        return ResponseFormatter.error(res, 'E0104', 'AppKey 无效', 401);
      }

      if (!software.status) {
        return ResponseFormatter.error(res, 'E0105', '软件已禁用', 403);
      }

      // 检查更新
      const updateInfo = await CloudService.checkUpdate(software.id, currentVersion.trim());

      logger.info('客户端检查版本更新成功', {
        softwareId: software.id,
        currentVersion,
        hasUpdate: updateInfo?.hasUpdate || false,
        ip: req.ip
      });

      return ResponseFormatter.success(res, updateInfo, '检查更新成功');
    } catch (error) {
      logger.error('客户端检查版本更新失败', {
        error: error.message,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '检查更新失败');
    }
  }
}

module.exports = CloudController;
