const HeartbeatService = require('../heartbeatService');
const { OnlineSession, Device, AuthCode, Software } = require('../../models');
const CryptoService = require('../../utils/crypto');

// Mock the models
jest.mock('../../models', () => ({
  OnlineSession: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  Device: {},
  AuthCode: {},
  Software: {}
}));

// Mock the config
jest.mock('../../config/app', () => ({
  heartbeatTimeout: 30
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('HeartbeatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('应该成功创建新会话', async () => {
      const mockSession = {
        id: 1,
        deviceId: 1,
        authCodeId: 1,
        softwareId: 1,
        tokenHash: 'hash123',
        isValid: true,
        loginTime: new Date(),
        lastHeartbeat: new Date()
      };

      OnlineSession.findOne.mockResolvedValue(null);
      OnlineSession.create.mockResolvedValue(mockSession);

      const token = 'test-token';
      const result = await HeartbeatService.createSession(1, 1, 1, token, '127.0.0.1', 'test-agent', 24);

      expect(result).toEqual(mockSession);
      expect(OnlineSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 1,
          authCodeId: 1,
          softwareId: 1,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          isValid: true
        })
      );
    });

    it('应该更新现有会话', async () => {
      const mockSession = {
        id: 1,
        deviceId: 1,
        authCodeId: 1,
        tokenHash: 'old-hash',
        save: jest.fn().mockResolvedValue(true)
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const token = 'new-token';
      const result = await HeartbeatService.createSession(1, 1, 1, token, '127.0.0.1', 'test-agent', 24);

      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('updateHeartbeat', () => {
    it('应该成功更新心跳时间', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const mockSession = {
        id: 1,
        deviceId: 1,
        tokenHash: CryptoService.sha256('test-token'),
        isValid: true,
        forceOffline: false,
        tokenExpireTime: futureDate,
        lastHeartbeat: now,
        save: jest.fn().mockResolvedValue(true),
        device: { id: 1 },
        authCode: { id: 1 }
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const result = await HeartbeatService.updateHeartbeat('test-token');

      expect(result.success).toBe(true);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('应该在会话不存在时返回失败', async () => {
      OnlineSession.findOne.mockResolvedValue(null);

      const result = await HeartbeatService.updateHeartbeat('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('会话不存在');
    });

    it('应该在设备被强制下线时返回失败', async () => {
      const mockSession = {
        id: 1,
        forceOffline: true,
        isValid: true
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const result = await HeartbeatService.updateHeartbeat('test-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('强制下线');
    });

    it('应该在令牌过期时标记会话为无效', async () => {
      const pastDate = new Date(Date.now() - 1000);
      
      const mockSession = {
        id: 1,
        isValid: true,
        forceOffline: false,
        tokenExpireTime: pastDate,
        save: jest.fn().mockResolvedValue(true)
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const result = await HeartbeatService.updateHeartbeat('test-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('过期');
      expect(mockSession.isValid).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
    });
  });

  describe('checkTimeout', () => {
    it('应该标记超时的会话为离线', async () => {
      const mockSessions = [
        { id: 1, lastHeartbeat: new Date(Date.now() - 60000) },
        { id: 2, lastHeartbeat: new Date(Date.now() - 120000) }
      ];

      OnlineSession.findAll.mockResolvedValue(mockSessions);
      OnlineSession.update.mockResolvedValue([2]);

      const count = await HeartbeatService.checkTimeout();

      expect(count).toBe(2);
      expect(OnlineSession.update).toHaveBeenCalledWith(
        { isValid: false },
        expect.objectContaining({
          where: expect.any(Object)
        })
      );
    });

    it('应该在没有超时会话时返回0', async () => {
      OnlineSession.findAll.mockResolvedValue([]);

      const count = await HeartbeatService.checkTimeout();

      expect(count).toBe(0);
      expect(OnlineSession.update).not.toHaveBeenCalled();
    });
  });

  describe('getOnlineDevices', () => {
    it('应该返回在线设备列表', async () => {
      const mockSessions = [
        {
          id: 1,
          deviceId: 1,
          authCodeId: 1,
          loginTime: new Date(),
          lastHeartbeat: new Date(),
          device: { id: 1, fingerprint: 'fp1' },
          authCode: { id: 1, code: 'CODE1' }
        }
      ];

      OnlineSession.findAll.mockResolvedValue(mockSessions);

      const result = await HeartbeatService.getOnlineDevices();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('sessionId', 1);
      expect(result[0]).toHaveProperty('deviceId', 1);
      expect(result[0]).toHaveProperty('onlineDuration');
    });

    it('应该支持按软件ID筛选', async () => {
      OnlineSession.findAll.mockResolvedValue([]);

      await HeartbeatService.getOnlineDevices(1);

      expect(OnlineSession.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            softwareId: 1
          })
        })
      );
    });
  });

  describe('forceOffline', () => {
    it('应该成功强制设备下线', async () => {
      const mockSession = {
        id: 1,
        deviceId: 1,
        forceOffline: false,
        isValid: true,
        save: jest.fn().mockResolvedValue(true)
      };

      OnlineSession.findByPk.mockResolvedValue(mockSession);

      const result = await HeartbeatService.forceOffline(1);

      expect(result.success).toBe(true);
      expect(mockSession.forceOffline).toBe(true);
      expect(mockSession.isValid).toBe(false);
      expect(mockSession.save).toHaveBeenCalled();
    });

    it('应该在会话不存在时返回失败', async () => {
      OnlineSession.findByPk.mockResolvedValue(null);

      const result = await HeartbeatService.forceOffline(999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('不存在');
    });
  });

  describe('enforceSingleLogin', () => {
    it('应该强制其他会话下线', async () => {
      const mockSessions = [
        { id: 2, authCodeId: 1 },
        { id: 3, authCodeId: 1 }
      ];

      OnlineSession.findAll.mockResolvedValue(mockSessions);
      OnlineSession.update.mockResolvedValue([2]);

      const count = await HeartbeatService.enforceSingleLogin(1, 1);

      expect(count).toBe(2);
      expect(OnlineSession.update).toHaveBeenCalledWith(
        {
          forceOffline: true,
          isValid: false
        },
        expect.objectContaining({
          where: expect.any(Object)
        })
      );
    });

    it('应该在没有其他会话时返回0', async () => {
      OnlineSession.findAll.mockResolvedValue([]);

      const count = await HeartbeatService.enforceSingleLogin(1, 1);

      expect(count).toBe(0);
      expect(OnlineSession.update).not.toHaveBeenCalled();
    });
  });

  describe('verifySession', () => {
    it('应该验证有效的会话', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSession = {
        id: 1,
        isValid: true,
        forceOffline: false,
        tokenExpireTime: futureDate,
        device: { id: 1 },
        authCode: { id: 1 }
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const result = await HeartbeatService.verifySession('test-token');

      expect(result.valid).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('应该在会话不存在时返回无效', async () => {
      OnlineSession.findOne.mockResolvedValue(null);

      const result = await HeartbeatService.verifySession('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不存在');
    });

    it('应该在设备被强制下线时返回无效', async () => {
      const mockSession = {
        id: 1,
        isValid: true,
        forceOffline: true
      };

      OnlineSession.findOne.mockResolvedValue(mockSession);

      const result = await HeartbeatService.verifySession('test-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('强制下线');
    });
  });
});
