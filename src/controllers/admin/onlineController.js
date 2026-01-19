const HeartbeatService = require('../../services/heartbeatService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 在线管理控制器
 * 处理在线设备查询和管理操作
 */
class OnlineController {
  /**
   * 获取在线设备列表
   * GET /api/admin/online
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.query - 查询参数
   * @param {number} [req.query.softwareId] - 软件 ID（可选）
   * @param {number} [req.query.authCodeId] - 授权码 ID（可选）
   * @param {Object} res - 响应对象
   */
  static async getOnlineDevices(req, res) {
    try {
      const { softwareId, authCodeId } = req.query;
      
      // 转换为数字类型
      const softwareIdNum = softwareId ? parseInt(softwareId, 10) : null;
      const authCodeIdNum = authCodeId ? parseInt(authCodeId, 10) : null;
      
      // 获取在线设备列表
      const onlineDevices = await HeartbeatService.getOnlineDevices(
        softwareIdNum,
        authCodeIdNum
      );
      
      // 构建响应数据
      const responseData = {
        total: onlineDevices.length,
        devices: onlineDevices
      };
      
      logger.info('获取在线设备列表', {
        softwareId: softwareIdNum,
        authCodeId: authCodeIdNum,
        count: onlineDevices.length
      });
      
      return ResponseFormatter.success(res, responseData, '获取成功');
    } catch (error) {
      logger.error('获取在线设备列表失败', {
        error: error.message,
        softwareId: req.query.softwareId,
        authCodeId: req.query.authCodeId
      });
      
      return ResponseFormatter.error(res, 'E9904', '服务器内部错误', 500);
    }
  }

  /**
   * 强制设备下线
   * POST /api/admin/online/:sessionId/offline
   * 
   * @param {Object} req - 请求对象
   * @param {Object} req.params - 路径参数
   * @param {number} req.params.sessionId - 会话 ID
   * @param {Object} res - 响应对象
   */
  static async forceOffline(req, res) {
    try {
      const { sessionId } = req.params;
      
      // 转换为数字类型
      const sessionIdNum = parseInt(sessionId, 10);
      
      if (isNaN(sessionIdNum)) {
        return ResponseFormatter.error(res, 'E9902', '会话 ID 格式无效', 400);
      }
      
      // 强制设备下线
      const result = await HeartbeatService.forceOffline(sessionIdNum);
      
      if (!result.success) {
        return ResponseFormatter.error(res, 'E0401', result.message, 404);
      }
      
      logger.info('强制设备下线', {
        sessionId: sessionIdNum,
        adminId: req.admin?.id
      });
      
      return ResponseFormatter.success(res, null, result.message);
    } catch (error) {
      logger.error('强制设备下线失败', {
        error: error.message,
        sessionId: req.params.sessionId
      });
      
      return ResponseFormatter.error(res, 'E9904', '服务器内部错误', 500);
    }
  }
}

module.exports = OnlineController;
