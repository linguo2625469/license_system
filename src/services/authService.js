const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const CryptoService = require('../utils/crypto');
const jwtConfig = require('../config/jwt');

/**
 * 认证服务
 * 处理管理员登录、JWT 令牌生成和验证
 */
class AuthService {
  /**
   * 管理员登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} ip - 登录 IP 地址
   * @returns {Promise<Object>} { admin, token }
   * @throws {Error} 用户名或密码错误
   */
  static async adminLogin(username, password, ip = null) {
    // 查找管理员
    const admin = await Admin.findOne({
      where: { username }
    });

    if (!admin) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await CryptoService.verifyPassword(password, admin.password);
    
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 更新最后登录信息
    admin.lastLogin = new Date();
    if (ip) {
      admin.lastIp = ip;
    }
    await admin.save();

    // 生成 JWT 令牌
    const token = this.generateJWT({
      id: admin.id,
      username: admin.username
    });

    // 返回管理员信息（不包含密码）
    return {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        lastLogin: admin.lastLogin,
        lastIp: admin.lastIp
      },
      token
    };
  }

  /**
   * 生成 JWT 令牌
   * @param {Object} payload - 令牌载荷（包含 id, username）
   * @returns {string} JWT 令牌
   */
  static generateJWT(payload) {
    return jwt.sign(
      payload,
      jwtConfig.secret,
      {
        expiresIn: parseInt(jwtConfig.expiresIn),
        algorithm: jwtConfig.algorithm
      }
    );
  }

  /**
   * 验证管理员 JWT 令牌
   * @param {string} token - JWT 令牌
   * @returns {Promise<Object>} 解码后的令牌载荷
   * @throws {Error} 令牌无效或已过期
   */
  static async verifyAdminToken(token) {
    try {
      // 验证并解码令牌
      const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm]
      });

      // 验证管理员是否仍然存在
      const admin = await Admin.findByPk(decoded.id);
      
      if (!admin) {
        throw new Error('管理员不存在');
      }

      return {
        id: decoded.id,
        username: decoded.username,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email
        }
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('JWT 令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('JWT 令牌无效');
      }
      throw error;
    }
  }

  /**
   * 刷新 JWT 令牌
   * @param {string} token - 旧的 JWT 令牌
   * @returns {Promise<string>} 新的 JWT 令牌
   * @throws {Error} 令牌无效
   */
  static async refreshToken(token) {
    try {
      // 验证旧令牌（即使过期也尝试解码）
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.id) {
        throw new Error('JWT 令牌无效');
      }

      // 验证管理员是否存在
      const admin = await Admin.findByPk(decoded.id);
      
      if (!admin) {
        throw new Error('管理员不存在');
      }

      // 生成新令牌
      return this.generateJWT({
        id: admin.id,
        username: admin.username
      });
    } catch (error) {
      throw new Error('令牌刷新失败');
    }
  }
}

module.exports = AuthService;
