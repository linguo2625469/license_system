const DeviceService = require('../deviceService');
const FingerprintService = require('../../utils/fingerprint');

// Mock dependencies
jest.mock('../../models', () => ({
  AuthCode: {
    findOne: jest.fn()
  },
  Device: {
    findOne: jest.fn(),
    update: jest.fn()
  },
  DeviceBlacklist: {
    findOne: jest.fn()
  }
}));
jest.mock('../../utils/fingerprint');
jest.mock('../blacklistService');

const { AuthCode, Device, DeviceBlacklist } = require('../../models');
const BlacklistService = require('../blacklistService');

describe('Device Rebind Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rebindDevice', () => {
    const mockDeviceInfo = {
      platform: 'Windows',
      osVersion: '10.0.19041',
      cpuId: 'BFEBFBFF000906E9',
      boardSerial: 'L1HF65E00X9',
      diskSerial: 'S3Z8NX0M123456',
      macAddress: '00:15:5D:01:02:03'
    };

    const oldFingerprint = 'a'.repeat(64);
    const newFingerprint = 'b'.repeat(64);

    test('应该成功换绑设备', async () => {
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
        rebindCount: 0,
        allowRebind: 3,
        software: mockSoftware,
        increment: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockImplementation(function() {
          this.rebindCount = 1;
          return Promise.resolve();
        })
      };

      const mockOldDevice = {
        id: 1,
        fingerprint: oldFingerprint,
        authCodeId: 1,
        status: 'active',
        update: jest.fn().mockResolvedValue(true)
      };

      const mockNewDevice = {
        id: 2,
        fingerprint: newFingerprint,
        authCodeId: 1,
        softwareId: 1,
        platform: 'Windows',
        status: 'active'
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      
      // Mock Device.findOne to return different values based on fingerprint
      Device.findOne.mockImplementation(({ where }) => {
        if (where.fingerprint === oldFingerprint && where.authCodeId === 1) {
          return Promise.resolve(mockOldDevice);
        }
        if (where.fingerprint === newFingerprint && where.authCodeId === 1) {
          return Promise.resolve(null);
        }
        if (where.fingerprint === newFingerprint) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      // Mock DeviceBlacklist
      DeviceBlacklist.findOne.mockResolvedValue(null);

      // Mock DeviceService methods
      BlacklistService.isDeviceBlacklisted = jest.fn().mockResolvedValue({ isBlacklisted: false });
      DeviceService.bindDevice = jest.fn().mockResolvedValue(mockNewDevice);

      const result = await DeviceService.rebindDevice(
        'TEST-CODE-1234',
        oldFingerprint,
        newFingerprint,
        mockDeviceInfo,
        '192.168.1.1'
      );

      expect(result).toBeDefined();
      expect(result.authCode).toBeDefined();
      expect(result.oldDevice).toBe(mockOldDevice);
      expect(result.newDevice).toBe(mockNewDevice);
      expect(mockOldDevice.update).toHaveBeenCalledWith({
        authCodeId: null,
        status: 'inactive'
      });
      expect(mockAuthCode.increment).toHaveBeenCalledWith('rebindCount');
    });

    test('应该在换绑次数达到上限时抛出错误', async () => {
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
        rebindCount: 3,
        allowRebind: 3,
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);

      await expect(
        DeviceService.rebindDevice('TEST-CODE-1234', oldFingerprint, newFingerprint, mockDeviceInfo)
      ).rejects.toThrow('换绑次数已达上限');
    });

    test('应该在授权码未激活时抛出错误', async () => {
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

      await expect(
        DeviceService.rebindDevice('TEST-CODE-1234', oldFingerprint, newFingerprint, mockDeviceInfo)
      ).rejects.toThrow('授权码未激活，无法换绑');
    });

    test('应该在旧设备未绑定时抛出错误', async () => {
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
        rebindCount: 0,
        allowRebind: 3,
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      Device.findOne.mockResolvedValue(null);
      DeviceBlacklist.findOne.mockResolvedValue(null);

      await expect(
        DeviceService.rebindDevice('TEST-CODE-1234', oldFingerprint, newFingerprint, mockDeviceInfo)
      ).rejects.toThrow('旧设备未绑定到此授权码');
    });

    test('应该在新设备在黑名单时抛出错误', async () => {
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
        rebindCount: 0,
        allowRebind: 3,
        software: mockSoftware
      };

      FingerprintService.verifyFingerprint.mockReturnValue(true);
      AuthCode.findOne.mockResolvedValue(mockAuthCode);
      
      // Mock old device exists
      Device.findOne.mockImplementation(({ where }) => {
        if (where.fingerprint === oldFingerprint && where.authCodeId === 1) {
          return Promise.resolve({
            id: 1,
            fingerprint: oldFingerprint,
            authCodeId: 1,
            status: 'active',
            update: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });
      
      // Mock DeviceBlacklist to return blacklisted
      DeviceBlacklist.findOne.mockResolvedValue({
        fingerprint: newFingerprint,
        reason: '新设备已被封禁'
      });

      await expect(
        DeviceService.rebindDevice('TEST-CODE-1234', oldFingerprint, newFingerprint, mockDeviceInfo)
      ).rejects.toThrow('新设备已被封禁');
    });
  });

  describe('unbindDevice', () => {
    test('应该成功解绑设备', async () => {
      const mockDevice = {
        id: 1,
        fingerprint: 'a'.repeat(64),
        authCodeId: 1,
        status: 'active',
        update: jest.fn().mockResolvedValue(true)
      };

      Device.findOne.mockResolvedValue(mockDevice);

      const result = await DeviceService.unbindDevice(1, 1);

      expect(result).toBe(true);
      expect(mockDevice.update).toHaveBeenCalledWith({
        authCodeId: null,
        status: 'inactive'
      });
    });

    test('应该在设备不存在时抛出错误', async () => {
      Device.findOne.mockResolvedValue(null);

      await expect(
        DeviceService.unbindDevice(1, 999)
      ).rejects.toThrow('设备不存在或未绑定到此授权码');
    });
  });
});

