const LicenseService = require('../licenseService');
const FingerprintService = require('../../utils/fingerprint');

// Mock dependencies
jest.mock('../../models', () => ({
  AuthCode: {
    findOne: jest.fn()
  },
  Device: {
    findOne: jest.fn()
  }
}));
jest.mock('../../utils/fingerprint');
jest.mock('../deviceService');
jest.mock('../blacklistService');

const { AuthCode, Device } = require('../../models');
const DeviceService = require('../deviceService');
const BlacklistService = require('../blacklistService');

describe('License Activation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('activateLicense', () => {
    const mockDeviceInfo = {
      platform: 'Windows',
      osVersion: '10.0.19041',
      cpuId: 'BFEBFBFF000906E9',
      boardSerial: 'L1HF65E00X9',
      diskSerial: 'S3Z8NX0M123456',
      macAddress: '00:15:5D:01:02:03'
    };

    const mockFingerprint = 'a'.repeat(64);

    test('应该成功激活未使用的时长卡授权码', async () => {
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
        isPointCard: false,
        cardType: 'day',
        duration: 30,
        activateMode: 'first_use',
        maxDevices: 1,
        allowRebind: 0,
        singleOnline: true,
        software: mockSoftware,
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        }),
        reload: jest.fn().mockResolvedValue(true)
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        softwareId: 1,
        platform: 'Windows',
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      DeviceService.getDevicesByAuthCode.mockResolvedValue([]);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });
      DeviceService.bindDevice.mockResolvedValue(mockDevice);

      const result = await LicenseService.activateLicense(
        'TEST-CODE-1234',
        mockFingerprint,
        mockDeviceInfo,
        '192.168.1.1'
      );

      expect(result).toBeDefined();
      expect(result.authCode).toBeDefined();
      expect(result.device).toBeDefined();
      expect(result.isNewActivation).toBe(true);
      expect(mockAuthCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          usedTime: expect.any(Date),
          startTime: expect.any(Date),
          expireTime: expect.any(Date)
        })
      );
    });

    test('应该成功激活未使用的点卡授权码', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-5678',
        softwareId: 1,
        status: 'unused',
        isPointCard: true,
        totalPoints: 100,
        remainingPoints: 0,
        deductType: 'per_use',
        deductAmount: 1,
        maxDevices: 1,
        software: mockSoftware,
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        }),
        reload: jest.fn().mockResolvedValue(true)
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        softwareId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      DeviceService.getDevicesByAuthCode.mockResolvedValue([]);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });
      DeviceService.bindDevice.mockResolvedValue(mockDevice);

      const result = await LicenseService.activateLicense(
        'TEST-CODE-5678',
        mockFingerprint,
        mockDeviceInfo,
        '192.168.1.1'
      );

      expect(result).toBeDefined();
      expect(result.isNewActivation).toBe(true);
      expect(mockAuthCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          remainingPoints: 100
        })
      );
    });

    test('应该在设备已绑定时返回现有激活', async () => {
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
        isPointCard: false,
        maxDevices: 1,
        software: mockSoftware
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

      const result = await LicenseService.activateLicense(
        'TEST-CODE-1234',
        mockFingerprint,
        mockDeviceInfo
      );

      expect(result.isNewActivation).toBe(false);
      expect(result.device).toBe(mockDevice);
    });

    test('应该在授权码不存在时抛出错误', async () => {
      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(null);

      await expect(
        LicenseService.activateLicense('INVALID-CODE', mockFingerprint, mockDeviceInfo)
      ).rejects.toThrow('授权码不存在');
    });

    test('应该在设备指纹无效时抛出错误', async () => {
      FingerprintService.verifyFingerprint.mockReturnValue(false);

      await expect(
        LicenseService.activateLicense('TEST-CODE', 'invalid-fp', mockDeviceInfo)
      ).rejects.toThrow('设备指纹格式无效');
    });

    test('应该在软件被禁用时抛出错误', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: false
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

      await expect(
        LicenseService.activateLicense('TEST-CODE-1234', mockFingerprint, mockDeviceInfo)
      ).rejects.toThrow('软件已禁用');
    });

    test('应该在授权码已过期时抛出错误', async () => {
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

      await expect(
        LicenseService.activateLicense('TEST-CODE-1234', mockFingerprint, mockDeviceInfo)
      ).rejects.toThrow('授权码已过期');
    });

    test('应该在设备在黑名单时抛出错误', async () => {
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
      Device.findOne.mockResolvedValue(null);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({
        isBlacklisted: true,
        reason: '恶意使用'
      });

      await expect(
        LicenseService.activateLicense('TEST-CODE-1234', mockFingerprint, mockDeviceInfo)
      ).rejects.toThrow('恶意使用');
    });

    test('应该在设备数量达到上限时抛出错误', async () => {
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
        maxDevices: 1,
        software: mockSoftware
      };

      const existingDevice = {
        id: 1,
        fingerprint: 'b'.repeat(64),
        authCodeId: 1
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      DeviceService.getDevicesByAuthCode.mockResolvedValue([existingDevice]);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });

      await expect(
        LicenseService.activateLicense('TEST-CODE-1234', mockFingerprint, mockDeviceInfo)
      ).rejects.toThrow('设备数量已达上限');
    });

    test('应该正确处理定时激活模式', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        status: true
      };

      const scheduledStartTime = new Date('2024-01-01T00:00:00Z');
      const scheduledExpireTime = new Date('2024-02-01T00:00:00Z');

      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1234',
        softwareId: 1,
        status: 'unused',
        isPointCard: false,
        cardType: 'month',
        duration: 1,
        activateMode: 'scheduled',
        startTime: scheduledStartTime,
        expireTime: scheduledExpireTime,
        maxDevices: 1,
        software: mockSoftware,
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        }),
        reload: jest.fn().mockResolvedValue(true)
      };

      const mockDevice = {
        id: 1,
        fingerprint: mockFingerprint,
        authCodeId: 1,
        softwareId: 1,
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      DeviceService.getDevicesByAuthCode.mockResolvedValue([]);
      BlacklistService.isDeviceBlacklisted.mockResolvedValue({ isBlacklisted: false });
      BlacklistService.isIpBlacklisted.mockResolvedValue({ isBlacklisted: false });
      DeviceService.bindDevice.mockResolvedValue(mockDevice);

      const result = await LicenseService.activateLicense(
        'TEST-CODE-1234',
        mockFingerprint,
        mockDeviceInfo
      );

      expect(result.isNewActivation).toBe(true);
      expect(mockAuthCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          usedTime: expect.any(Date)
        })
      );
      // 定时激活模式应该保持原有的 startTime 和 expireTime
      const updateCall = mockAuthCode.update.mock.calls[0][0];
      expect(updateCall.startTime).toBeUndefined();
      expect(updateCall.expireTime).toBeUndefined();
    });
  });
});
