const AuthService = require('../../services/authService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 管理员认证控制器
 * 处理管理员登录、登出、令牌刷新等操作
 */
class AuthController {
  /**
   * 管理员登录
   * POST /api/admin/login
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // 参数验证
      if (!username || !password) {
        return ResponseFormatter.validationError(res, '用户名和密码不能为空');
      }

      // 获取客户端 IP
      const ip = req.ip || req.connection.remoteAddress;

      // 执行登录
      const result = await AuthService.adminLogin(username, password, ip);

      // 记录登录日志
      logger.info('管理员登录成功', {
        adminId: result.admin.id,
        username: result.admin.username,
        ip
      });

      return ResponseFormatter.success(res, result, '登录成功');
    } catch (error) {
      logger.error('管理员登录失败', {
        error: error.message,
        username: req.body.username,
        ip: req.ip
      });

      // 根据错误类型返回不同的错误码
      if (error.message === '用户名或密码错误') {
        return ResponseFormatter.error(res, 'E0101', error.message, 400);
      }

      return ResponseFormatter.serverError(res, error, '登录失败');
    }
  }

  /**
   * 管理员登出
   * POST /api/admin/logout
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async logout(req, res) {
    try {
      // 从请求中获取管理员信息（由认证中间件注入）
      const adminId = req.admin?.id;
      const username = req.admin?.username;

      // 记录登出日志
      logger.info('管理员登出', {
        adminId,
        username,
        ip: req.ip
      });

      // JWT 是无状态的，客户端删除令牌即可
      // 如果需要实现令牌黑名单，可以在这里添加逻辑
      return ResponseFormatter.success(res, null, '登出成功');
    } catch (error) {
      logger.error('管理员登出失败', {
        error: error.message,
        adminId: req.admin?.id
      });

      return ResponseFormatter.serverError(res, error, '登出失败');
    }
  }

  /**
   * 刷新 JWT 令牌
   * POST /api/admin/refresh-token
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async refreshToken(req, res) {
    try {
      // 从请求头获取旧令牌
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return ResponseFormatter.error(res, 'E0106', '未提供认证令牌', 401);
      }

      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return ResponseFormatter.error(res, 'E0107', '认证令牌格式错误', 401);
      }

      // 刷新令牌
      const newToken = await AuthService.refreshToken(token);

      logger.info('令牌刷新成功', {
        ip: req.ip
      });

      return ResponseFormatter.success(res, { token: newToken }, '令牌刷新成功');
    } catch (error) {
      logger.error('令牌刷新失败', {
        error: error.message,
        ip: req.ip
      });

      // 根据错误类型返回不同的错误码
      if (error.message.includes('令牌无效')) {
        return ResponseFormatter.error(res, 'E0102', error.message, 401);
      }
      if (error.message.includes('管理员不存在')) {
        return ResponseFormatter.error(res, 'E0102', '令牌无效', 401);
      }

      return ResponseFormatter.serverError(res, error, '令牌刷新失败');
    }
  }

  /**
   * 获取当前管理员信息
   * GET /api/admin/me
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getCurrentAdmin(req, res) {
    try {
      // 管理员信息由认证中间件注入
      const admin = req.admin;

      if (!admin) {
        return ResponseFormatter.unauthorized(res, '未授权访问');
      }

      return ResponseFormatter.success(res, { admin }, '获取成功');
    } catch (error) {
      logger.error('获取管理员信息失败', {
        error: error.message,
        adminId: req.admin?.id
      });

      return ResponseFormatter.serverError(res, error, '获取管理员信息失败');
    }
  }

  /**
   * 验证令牌（用于测试）
   * GET /api/admin/verify-token
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async verifyToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return ResponseFormatter.error(res, 'E0106', '未提供认证令牌', 401);
      }

      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return ResponseFormatter.error(res, 'E0107', '认证令牌格式错误', 401);
      }

      // 验证令牌
      const decoded = await AuthService.verifyAdminToken(token);

      return ResponseFormatter.success(res, decoded, '令牌有效');
    } catch (error) {
      logger.error('令牌验证失败', {
        error: error.message,
        ip: req.ip
      });

      // 根据错误类型返回不同的错误码
      if (error.message === 'JWT 令牌已过期') {
        return ResponseFormatter.error(res, 'E0103', error.message, 401);
      }
      if (error.message === 'JWT 令牌无效' || error.message === '管理员不存在') {
        return ResponseFormatter.error(res, 'E0102', 'JWT 令牌无效', 401);
      }

      return ResponseFormatter.serverError(res, error, '令牌验证失败');
    }
  }
}

module.exports = AuthController;
