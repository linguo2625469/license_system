const LicenseService = require('../licenseService');
const { AuthCode, Software, Device } = require('../../models');
const CryptoService = require('../../utils/crypto');

// Mock dependencies
jest.mock('../../models');
jest.mock('../../utils/crypto');

describe('LicenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateLicenses', () => {
    test('应该成功生成指定数量的唯一授权码', async () => {
      const mockSoftware = {
        id: 1,
        name: 'Test Software',
        appKey: 'test-app-key'
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      AuthCode.findAll.mockResolvedValue([]);
      
      // Mock generateRandomString to return predictable values
      let callCount = 0;
      CryptoService.generateRandomString.mockImplementation(() => {
        callCount++;
        return `TEST${callCount}`;
      });

      const mockCreatedCodes = [
        { id: 1, code: 'TEST1-TEST2-TEST3-TEST4', softwareId: 1 },
        { id: 2, code: 'TEST5-TEST6-TEST7-TEST8', softwareId: 1 },
        { id: 3, code: 'TEST9-TEST10-TEST11-TEST12', softwareId: 1 }
      ];

      AuthCode.bulkCreate.mockResolvedValue(mockCreatedCodes);

      const config = {
        isPointCard: false,
        cardType: 'day',
        duration: 30,
        activateMode: 'first_use',
        maxDevices: 1,
        allowRebind: 0,
        singleOnline: true
      };

      const result = await LicenseService.generateLicenses(1, config, 3);

      expect(Software.findByPk).toHaveBeenCalledWith(1);
      expect(AuthCode.bulkCreate).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('TEST1-TEST2-TEST3-TEST4');
    });

    test('应该在软件不存在时抛出错误', async () => {
      Software.findByPk.mockResolvedValue(null);

      const config = {
        isPointCard: false,
        cardType: 'day',
        duration: 30
      };

      await expect(
        LicenseService.generateLicenses(999, config, 1)
      ).rejects.toThrow('软件不存在');
    });

    test('应该正确配置时长卡授权码', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      Software.findByPk.mockResolvedValue(mockSoftware);
      AuthCode.findAll.mockResolvedValue([]);
      
      CryptoService.generateRandomString.mockReturnValue('TEST');
      
      let capturedData = null;
      AuthCode.bulkCreate.mockImplementation((data) => {
        capturedData = data;
        return Promise.resolve(data.map((item, idx) => ({ id: idx + 1, ...item })));
      });

      const config = {
        isPointCard: false,
        cardType: 'month',
        duration: 3,
        activateMode: 'first_use',
        maxDevices: 2,
        allowRebind: 1,
        singleOnline: false
      };

      await LicenseService.generateLicenses(1, config, 1);

      expect(capturedData).toHaveLength(1);
      expect(capturedData[0].isPointCard).toBe(false);
      expect(capturedData[0].cardType).toBe('month');
      expect(capturedData[0].duration).toBe(3);
      expect(capturedData[0].maxDevices).toBe(2);
      expect(capturedData[0].allowRebind).toBe(1);
      expect(capturedData[0].singleOnline).toBe(false);
    });

    test('应该正确配置点卡授权码', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      Software.findByPk.mockResolvedValue(mockSoftware);
      AuthCode.findAll.mockResolvedValue([]);
      
      CryptoService.generateRandomString.mockReturnValue('TEST');
      
      let capturedData = null;
      AuthCode.bulkCreate.mockImplementation((data) => {
        capturedData = data;
        return Promise.resolve(data.map((item, idx) => ({ id: idx + 1, ...item })));
      });

      const config = {
        isPointCard: true,
        totalPoints: 100,
        deductType: 'per_use',
        deductAmount: 5,
        maxDevices: 1
      };

      await LicenseService.generateLicenses(1, config, 1);

      expect(capturedData).toHaveLength(1);
      expect(capturedData[0].isPointCard).toBe(true);
      expect(capturedData[0].totalPoints).toBe(100);
      expect(capturedData[0].remainingPoints).toBe(100);
      expect(capturedData[0].deductType).toBe('per_use');
      expect(capturedData[0].deductAmount).toBe(5);
    });
  });

  describe('getLicenseList', () => {
    test('应该返回分页的授权码列表', async () => {
      const mockLicenses = [
        { id: 1, code: 'TEST-CODE-1', status: 'unused' },
        { id: 2, code: 'TEST-CODE-2', status: 'active' }
      ];

      AuthCode.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockLicenses
      });

      const result = await LicenseService.getLicenseList({
        page: 1,
        limit: 10
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    test('应该支持按软件 ID 筛选', async () => {
      AuthCode.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: []
      });

      await LicenseService.getLicenseList({
        softwareId: 1,
        page: 1,
        limit: 10
      });

      expect(AuthCode.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ softwareId: 1 })
        })
      );
    });
  });

  describe('getLicenseDetail', () => {
    test('应该返回授权码详情', async () => {
      const mockLicense = {
        id: 1,
        code: 'TEST-CODE-1',
        status: 'active',
        software: { id: 1, name: 'Test Software' },
        devices: []
      };

      AuthCode.findByPk.mockResolvedValue(mockLicense);

      const result = await LicenseService.getLicenseDetail(1);

      expect(result).toBeDefined();
      expect(result.code).toBe('TEST-CODE-1');
      expect(AuthCode.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('应该在授权码不存在时返回 null', async () => {
      AuthCode.findByPk.mockResolvedValue(null);

      const result = await LicenseService.getLicenseDetail(999);

      expect(result).toBeNull();
    });
  });

  describe('updateLicense', () => {
    test('应该成功更新授权码', async () => {
      const mockLicense = {
        id: 1,
        code: 'TEST-CODE-1',
        status: 'unused',
        maxDevices: 1,
        update: jest.fn().mockResolvedValue(true)
      };

      AuthCode.findByPk.mockResolvedValue(mockLicense);

      const updateData = {
        status: 'active',
        maxDevices: 2
      };

      const result = await LicenseService.updateLicense(1, updateData);

      expect(mockLicense.update).toHaveBeenCalledWith(updateData);
      expect(result).toBeDefined();
    });

    test('应该在授权码不存在时返回 null', async () => {
      AuthCode.findByPk.mockResolvedValue(null);

      const result = await LicenseService.updateLicense(999, { status: 'active' });

      expect(result).toBeNull();
    });
  });

  describe('deleteLicense', () => {
    test('应该成功删除授权码并解绑设备', async () => {
      const mockLicense = {
        id: 1,
        code: 'TEST-CODE-1',
        destroy: jest.fn().mockResolvedValue(true)
      };

      AuthCode.findByPk.mockResolvedValue(mockLicense);
      Device.update.mockResolvedValue([1]);

      const result = await LicenseService.deleteLicense(1);

      expect(Device.update).toHaveBeenCalledWith(
        { authCodeId: null, status: 'inactive' },
        { where: { authCodeId: 1 } }
      );
      expect(mockLicense.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('应该在授权码不存在时返回 false', async () => {
      AuthCode.findByPk.mockResolvedValue(null);

      const result = await LicenseService.deleteLicense(999);

      expect(result).toBe(false);
    });
  });

  describe('_calculateExpireTime', () => {
    test('应该正确计算不同类型的到期时间', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');

      // 测试分钟
      const minuteExpire = LicenseService._calculateExpireTime(startTime, 'minute', 30);
      expect(minuteExpire.getTime() - startTime.getTime()).toBe(30 * 60 * 1000);

      // 测试小时
      const hourExpire = LicenseService._calculateExpireTime(startTime, 'hour', 24);
      expect(hourExpire.getTime() - startTime.getTime()).toBe(24 * 60 * 60 * 1000);

      // 测试天
      const dayExpire = LicenseService._calculateExpireTime(startTime, 'day', 7);
      expect(dayExpire.getTime() - startTime.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

      // 测试月
      const monthExpire = LicenseService._calculateExpireTime(startTime, 'month', 3);
      expect(monthExpire.getMonth()).toBe(3); // April (0-indexed)
      expect(monthExpire.getFullYear()).toBe(2024);

      // 测试年
      const yearExpire = LicenseService._calculateExpireTime(startTime, 'year', 1);
      expect(yearExpire.getFullYear()).toBe(2025);
    });

    test('应该为永久授权设置 100 年后的到期时间', () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const permanentExpire = LicenseService._calculateExpireTime(startTime, 'permanent', 0);
      
      expect(permanentExpire.getFullYear()).toBe(2124);
    });
  });

  describe('deductPoints', () => {
    test('应该成功扣除点卡点数', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1',
        isPointCard: true,
        status: 'active',
        remainingPoints: 100,
        deductAmount: 5,
        deductType: 'per_use',
        update: jest.fn().mockResolvedValue(true)
      };

      const { PointDeductLog } = require('../../models');
      PointDeductLog.create = jest.fn().mockResolvedValue({
        id: 1,
        authCodeId: 1,
        deductAmount: 5,
        remainingPoints: 95
      });

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.deductPoints(1, 5, '测试扣点', 1, '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(95);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 95
      });
      expect(PointDeductLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authCodeId: 1,
          authCode: 'TEST-CODE-1',
          deviceId: 1,
          deductType: 'per_use',
          deductAmount: 5,
          remainingPoints: 95,
          reason: '测试扣点',
          ip: '127.0.0.1'
        })
      );
    });

    test('应该使用默认扣点数量', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1',
        isPointCard: true,
        status: 'active',
        remainingPoints: 100,
        deductAmount: 10,
        deductType: 'per_use',
        update: jest.fn().mockResolvedValue(true)
      };

      const { PointDeductLog } = require('../../models');
      PointDeductLog.create = jest.fn().mockResolvedValue({});

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.deductPoints(1, null, '测试扣点');

      expect(result.remainingPoints).toBe(90);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 90
      });
    });

    test('应该在点数用完时标记为已过期', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1',
        isPointCard: true,
        status: 'active',
        remainingPoints: 5,
        deductAmount: 5,
        deductType: 'per_use',
        update: jest.fn().mockResolvedValue(true)
      };

      const { PointDeductLog } = require('../../models');
      PointDeductLog.create = jest.fn().mockResolvedValue({});

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      const result = await LicenseService.deductPoints(1, 5);

      expect(result.remainingPoints).toBe(0);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 0,
        status: 'expired'
      });
    });

    test('应该在授权码不存在时抛出错误', async () => {
      AuthCode.findByPk.mockResolvedValue(null);

      await expect(
        LicenseService.deductPoints(999, 5)
      ).rejects.toThrow('授权码不存在');
    });

    test('应该在授权码不是点卡时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        isPointCard: false,
        status: 'active'
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('该授权码不是点卡类型');
    });

    test('应该在点数不足时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'TEST-CODE-1',
        isPointCard: true,
        status: 'active',
        remainingPoints: 3,
        deductAmount: 5
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('点数不足');
    });

    test('应该在授权码已过期时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        isPointCard: true,
        status: 'expired',
        remainingPoints: 100
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('授权码已过期');
    });

    test('应该在授权码未激活时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        isPointCard: true,
        status: 'unused',
        remainingPoints: 100
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('授权码未激活');
    });
  });
});
