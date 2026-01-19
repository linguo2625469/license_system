const LicenseService = require('../licenseService');
const FingerprintService = require('../../utils/fingerprint');

// Mock dependencies
jest.mock('../../models', () => ({
  AuthCode: {
    findOne: jest.fn()
  },
  Device: {
    findOne: jest.fn()
  },
  IpBlacklist: {
    findOne: jest.fn()
  }
}));
jest.mock('../../utils/fingerprint');
jest.mock('../deviceService');
jest.mock('../blacklistService');

const { AuthCode, Device, IpBlacklist } = require('../../models');
const DeviceService = require('../deviceService');
const BlacklistService = require('../blacklistService');

describe('License Verification Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyLicense', () => {
    const mockFingerprint = 'a'.repeat(64);
    const mockIp = '192.168.1.1';

    test('应该成功验证有效的时长卡授权', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        isPointCard: false,
        cardType: 'day',
        duration: 30,
        expireTime: futureDate,
        software: mockSoftware,
        update: jest.fn()
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(true);
      expect(result.authCode).toBeDefined();
      expect(result.device).toBeDefined();
      expect(result.authCode.code).toBe('TEST-CODE-1234');
    });

    test('应该成功验证有效的点卡授权码', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-5678',
        softwareId: 1,
        status: 'active',
        isPointCard: true,
        totalPoints: 100,
        remainingPoints: 50,
        software: mockSoftware,
        update: jest.fn()
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-5678', mockFingerprint, mockIp);

      expect(result.valid).toBe(true);
      expect(result.authCode.remainingPoints).toBe(50);
    });

    test('应该在授权码不存在时返回验证失败', async () => {
      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(null);

      const result = await LicenseService.verifyLicense('INVALID-CODE', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('授权码不存在');
    });

    test('应该在设备指纹无效时返回验证失败', async () => {
      FingerprintService.verifyFingerprint.mockReturnValue(false);

      const result = await LicenseService.verifyLicense('TEST-CODE', 'invalid-fp', mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('设备指纹格式无效');
    });

    test('应该在软件被禁用时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: false
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('软件已禁用');
    });

    test('应该在授权码已过期时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'expired',
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('授权码已过期');
    });

    test('应该在授权码未激活时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'unused',
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('授权码未激活');
    });

    test('应该在设备未绑定时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('设备未绑定到此授权码');
    });

    test('应该在设备在黑名单时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({
        isBlacklisted: true,
        reason: '恶意使用'
      });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('恶意使用');
    });

    test('应该在IP在黑名单时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      const mockIpBlacklist = {
        ip: mockIp,
        reason: 'IP 被封禁'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: true, reason: mockIpBlacklist.reason });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('IP 被封禁');
    });

    test('应该在时长卡过期时更新状态并返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        isPointCard: false,
        expireTime: pastDate,
        software: mockSoftware,
        update: jest.fn().mockResolvedValue(true)
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('授权已过期');
      expect(mockAuthCode.update).toHaveBeenCalledWith({ status: 'expired' });
    });

    test('应该在点卡点数用完时更新状态并返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-5678',
        softwareId: 1,
        status: 'active',
        isPointCard: true,
        totalPoints: 100,
        remainingPoints: 0,
        software: mockSoftware,
        update: jest.fn().mockResolvedValue(true)
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-5678', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('点数已用完');
      expect(mockAuthCode.update).toHaveBeenCalledWith({ status: 'expired' });
    });

    test('应该在设备状态为blacklisted时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'blacklisted'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('设备已被封禁');
    });

    test('应该在设备状态为inactive时返回验证失败', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'active',
        software: mockSoftware
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        status: 'inactive'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(mockDevice);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      const result = await LicenseService.verifyLicense('TEST-CODE-1234', mockFingerprint, mockIp);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('设备已被停用');
    });
  });
});



