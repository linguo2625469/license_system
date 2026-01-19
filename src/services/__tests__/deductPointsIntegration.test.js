const LicenseService = require('../licenseService');

// Mock dependencies
jest.mock('../../models', () => ({
  AuthCode: {
    findByPk: jest.fn()
  },
  PointDeductLog: {
    create: jest.fn()
  }
}));

const { AuthCode, PointDeductLog } = require('../../models');

describe('Point Deduction Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deductPoints', () => {
    test('应该成功扣除点卡点数并记录日志', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
        softwareId: 1,
        isPointCard: true,
        status: 'active',
        remainingPoints: 100,
        totalPoints: 100,
        deductAmount: 5,
        deductType: 'per_use',
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        })
      };

      const mockLog = {
        id: 1,
        authCodeId: 1,
        authCode: 'POINT-CARD-1234',
        deviceId: 1,
        deductType: 'per_use',
        deductAmount: 5,
        remainingPoints: 95,
        reason: '使用功能',
        ip: '192.168.1.1'
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);
      PointDeductLog.create.mockResolvedValue(mockLog);

      const result = await LicenseService.deductPoints(
        1,
        5,
        '使用功能',
        1,
        '192.168.1.1'
      );

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(95);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 95
      });
      expect(PointDeductLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authCodeId: 1,
          authCode: 'POINT-CARD-1234',
          deviceId: 1,
          deductType: 'per_use',
          deductAmount: 5,
          remainingPoints: 95,
          reason: '使用功能',
          ip: '192.168.1.1'
        })
      );
    });

    test('应该在点数用完时标记授权码为已过期', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
        isPointCard: true,
        status: 'active',
        remainingPoints: 10,
        deductAmount: 10,
        deductType: 'per_use',
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        })
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);
      PointDeductLog.create.mockResolvedValue({});

      const result = await LicenseService.deductPoints(1, 10);

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(0);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 0,
        status: 'expired'
      });
    });

    test('应该使用默认扣点数量', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
        isPointCard: true,
        status: 'active',
        remainingPoints: 100,
        deductAmount: 10,
        deductType: 'per_hour',
        update: jest.fn().mockImplementation(function(data) {
          Object.assign(this, data);
          return Promise.resolve();
        })
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);
      PointDeductLog.create.mockResolvedValue({});

      const result = await LicenseService.deductPoints(1, null);

      expect(result.success).toBe(true);
      expect(result.remainingPoints).toBe(90);
      expect(mockAuthCode.update).toHaveBeenCalledWith({
        remainingPoints: 90
      });
    });

    test('应该在点数不足时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
        isPointCard: true,
        status: 'active',
        remainingPoints: 5,
        deductAmount: 10
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 10)
      ).rejects.toThrow('点数不足');
    });

    test('应该在授权码不是点卡时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'TIME-CARD-1234',
        isPointCard: false,
        status: 'active'
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('该授权码不是点卡类型');
    });

    test('应该在授权码已过期时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
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
        code: 'POINT-CARD-1234',
        isPointCard: true,
        status: 'unused',
        remainingPoints: 100
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('授权码未激活');
    });

    test('应该在授权码被禁用时抛出错误', async () => {
      const mockAuthCode = {
        id: 1,
        code: 'POINT-CARD-1234',
        isPointCard: true,
        status: 'disabled',
        remainingPoints: 100
      };

      AuthCode.findByPk.mockResolvedValue(mockAuthCode);

      await expect(
        LicenseService.deductPoints(1, 5)
      ).rejects.toThrow('授权码已被禁用');
    });
  });
});
