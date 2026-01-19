const AuthService = require('../authService');
const Admin = require('../../models/Admin');
const CryptoService = require('../../utils/crypto');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');

// Mock dependencies
jest.mock('../../models/Admin');
jest.mock('../../utils/crypto');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adminLogin', () => {
    test('应该在凭证有效时成功登录', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword',
        email: 'admin@example.com',
        lastLogin: null,
        lastIp: null,
        save: jest.fn()
      };

      Admin.findOne.mockResolvedValue(mockAdmin);
      CryptoService.verifyPassword.mockResolvedValue(true);

      const result = await AuthService.adminLogin('admin', 'password123', '127.0.0.1');

      expect(Admin.findOne).toHaveBeenCalledWith({
        where: { username: 'admin' }
      });
      expect(CryptoService.verifyPassword).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockAdmin.save).toHaveBeenCalled();
      expect(result).toHaveProperty('admin');
      expect(result).toHaveProperty('token');
      expect(result.admin.username).toBe('admin');
      expect(result.admin).not.toHaveProperty('password');
    });

    test('应该在用户名不存在时抛出错误', async () => {
      Admin.findOne.mockResolvedValue(null);

      await expect(
        AuthService.adminLogin('nonexistent', 'password123')
      ).rejects.toThrow('用户名或密码错误');
    });

    test('应该在密码错误时抛出错误', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password: 'hashedPassword'
      };

      Admin.findOne.mockResolvedValue(mockAdmin);
      CryptoService.verifyPassword.mockResolvedValue(false);

      await expect(
        AuthService.adminLogin('admin', 'wrongpassword')
      ).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('generateJWT', () => {
    test('应该生成有效的 JWT 令牌', () => {
      const payload = { id: 1, username: 'admin' };
      const token = AuthService.generateJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // 验证令牌可以被解码
      const decoded = jwt.verify(token, jwtConfig.secret);
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('admin');
    });
  });

  describe('verifyAdminToken', () => {
    test('应该验证有效的令牌', async () => {
      const payload = { id: 1, username: 'admin' };
      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: parseInt(jwtConfig.expiresIn)
      });

      const mockAdmin = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com'
      };

      Admin.findByPk.mockResolvedValue(mockAdmin);

      const result = await AuthService.verifyAdminToken(token);

      expect(result.id).toBe(1);
      expect(result.username).toBe('admin');
      expect(result.admin).toBeDefined();
    });

    test('应该在令牌过期时抛出错误', async () => {
      const payload = { id: 1, username: 'admin' };
      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: -1 // 已过期
      });

      await expect(
        AuthService.verifyAdminToken(token)
      ).rejects.toThrow('JWT 令牌已过期');
    });

    test('应该在令牌无效时抛出错误', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(
        AuthService.verifyAdminToken(invalidToken)
      ).rejects.toThrow('JWT 令牌无效');
    });

    test('应该在管理员不存在时抛出错误', async () => {
      const payload = { id: 999, username: 'nonexistent' };
      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: parseInt(jwtConfig.expiresIn)
      });

      Admin.findByPk.mockResolvedValue(null);

      await expect(
        AuthService.verifyAdminToken(token)
      ).rejects.toThrow('管理员不存在');
    });
  });

  describe('refreshToken', () => {
    test('应该刷新有效的令牌', async () => {
      const payload = { id: 1, username: 'admin' };
      const oldToken = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: parseInt(jwtConfig.expiresIn)
      });

      const mockAdmin = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com'
      };

      Admin.findByPk.mockResolvedValue(mockAdmin);

      const newToken = await AuthService.refreshToken(oldToken);

      expect(newToken).toBeDefined();
      expect(typeof newToken).toBe('string');
      
      // 验证新令牌可以被解码
      const decoded = jwt.verify(newToken, jwtConfig.secret);
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('admin');
    });

    test('应该在管理员不存在时抛出错误', async () => {
      const payload = { id: 999, username: 'nonexistent' };
      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: parseInt(jwtConfig.expiresIn)
      });

      Admin.findByPk.mockResolvedValue(null);

      await expect(
        AuthService.refreshToken(token)
      ).rejects.toThrow('令牌刷新失败');
    });
  });
});
