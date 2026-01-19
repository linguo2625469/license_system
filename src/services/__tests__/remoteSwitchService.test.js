const CloudService = require('../cloudService');
const { Software, RemoteSwitch } = require('../../models');

// Mock the models
jest.mock('../../models', () => ({
  Software: {
    findByPk: jest.fn()
  },
  RemoteSwitch: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('CloudService - Remote Switches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemoteSwitch', () => {
    it('应该成功创建远程开关', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const mockSwitch = {
        id: 1,
        softwareId: 1,
        switchName: 'Feature Toggle',
        switchKey: 'feature_toggle',
        switchValue: false,
        description: 'Test switch'
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteSwitch.findOne.mockResolvedValue(null);
      RemoteSwitch.create.mockResolvedValue(mockSwitch);

      const result = await CloudService.createRemoteSwitch({
        softwareId: 1,
        switchName: 'Feature Toggle',
        switchKey: 'feature_toggle',
        switchValue: false,
        description: 'Test switch'
      });

      expect(result).toEqual(mockSwitch);
      expect(Software.findByPk).toHaveBeenCalledWith(1);
      expect(RemoteSwitch.findOne).toHaveBeenCalledWith({
        where: { softwareId: 1, switchKey: 'feature_toggle' }
      });
      expect(RemoteSwitch.create).toHaveBeenCalledWith({
        softwareId: 1,
        switchName: 'Feature Toggle',
        switchKey: 'feature_toggle',
        switchValue: false,
        description: 'Test switch'
      });
    });

    it('应该在软件不存在时抛出错误', async () => {
      Software.findByPk.mockResolvedValue(null);

      await expect(
        CloudService.createRemoteSwitch({
          softwareId: 999,
          switchName: 'Test',
          switchKey: 'test'
        })
      ).rejects.toThrow('软件不存在');
    });

    it('应该在开关键名已存在时抛出错误', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const existingSwitch = { id: 1, switchKey: 'feature_toggle' };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteSwitch.findOne.mockResolvedValue(existingSwitch);

      await expect(
        CloudService.createRemoteSwitch({
          softwareId: 1,
          switchName: 'Feature Toggle',
          switchKey: 'feature_toggle'
        })
      ).rejects.toThrow('开关键名已存在');
    });
  });

  describe('toggleSwitch', () => {
    it('应该成功切换开关状态', async () => {
      const mockSwitch = {
        id: 1,
        switchValue: false,
        update: jest.fn().mockResolvedValue(true)
      };

      RemoteSwitch.findByPk.mockResolvedValue(mockSwitch);

      const result = await CloudService.toggleSwitch(1, true);

      expect(result).toEqual(mockSwitch);
      expect(mockSwitch.update).toHaveBeenCalledWith({ switchValue: true });
    });

    it('应该在开关不存在时返回 null', async () => {
      RemoteSwitch.findByPk.mockResolvedValue(null);

      const result = await CloudService.toggleSwitch(999, true);

      expect(result).toBeNull();
    });
  });

  describe('updateRemoteSwitch', () => {
    it('应该成功更新远程开关', async () => {
      const mockSwitch = {
        id: 1,
        switchName: 'Old Name',
        switchValue: false,
        update: jest.fn().mockResolvedValue(true)
      };

      RemoteSwitch.findByPk.mockResolvedValue(mockSwitch);

      const result = await CloudService.updateRemoteSwitch(1, {
        switchName: 'New Name',
        switchValue: true
      });

      expect(result).toEqual(mockSwitch);
      expect(mockSwitch.update).toHaveBeenCalledWith({
        switchName: 'New Name',
        switchValue: true
      });
    });

    it('应该在开关不存在时返回 null', async () => {
      RemoteSwitch.findByPk.mockResolvedValue(null);

      const result = await CloudService.updateRemoteSwitch(999, {
        switchName: 'New Name'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteRemoteSwitch', () => {
    it('应该成功删除远程开关', async () => {
      const mockSwitch = {
        id: 1,
        switchKey: 'feature_toggle',
        destroy: jest.fn().mockResolvedValue(true)
      };

      RemoteSwitch.findByPk.mockResolvedValue(mockSwitch);

      const result = await CloudService.deleteRemoteSwitch(1);

      expect(result).toBe(true);
      expect(mockSwitch.destroy).toHaveBeenCalled();
    });

    it('应该在开关不存在时返回 false', async () => {
      RemoteSwitch.findByPk.mockResolvedValue(null);

      const result = await CloudService.deleteRemoteSwitch(999);

      expect(result).toBe(false);
    });
  });

  describe('getRemoteSwitches', () => {
    it('应该返回所有远程开关', async () => {
      const mockSwitches = [
        {
          id: 1,
          switchName: 'Switch 1',
          switchKey: 'switch_1',
          switchValue: true,
          description: 'Test 1'
        },
        {
          id: 2,
          switchName: 'Switch 2',
          switchKey: 'switch_2',
          switchValue: false,
          description: 'Test 2'
        }
      ];

      RemoteSwitch.findAll.mockResolvedValue(mockSwitches);

      const result = await CloudService.getRemoteSwitches(1);

      expect(result).toEqual(mockSwitches);
      expect(RemoteSwitch.findAll).toHaveBeenCalledWith({
        where: { softwareId: 1 },
        attributes: ['id', 'switchName', 'switchKey', 'switchValue', 'description'],
        order: [['switchKey', 'ASC']]
      });
    });

    it('应该返回指定的远程开关', async () => {
      const mockSwitch = {
        id: 1,
        switchName: 'Switch 1',
        switchKey: 'switch_1',
        switchValue: true,
        description: 'Test 1'
      };

      RemoteSwitch.findAll.mockResolvedValue([mockSwitch]);

      const result = await CloudService.getRemoteSwitches(1, 'switch_1');

      expect(result).toEqual(mockSwitch);
      expect(RemoteSwitch.findAll).toHaveBeenCalledWith({
        where: { softwareId: 1, switchKey: 'switch_1' },
        attributes: ['id', 'switchName', 'switchKey', 'switchValue', 'description'],
        order: [['switchKey', 'ASC']]
      });
    });

    it('应该在指定开关不存在时返回 null', async () => {
      RemoteSwitch.findAll.mockResolvedValue([]);

      const result = await CloudService.getRemoteSwitches(1, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getRemoteSwitchList', () => {
    it('应该返回分页的远程开关列表', async () => {
      const mockSwitches = [
        { id: 1, switchName: 'Switch 1', switchKey: 'switch_1' },
        { id: 2, switchName: 'Switch 2', switchKey: 'switch_2' }
      ];

      RemoteSwitch.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockSwitches
      });

      const result = await CloudService.getRemoteSwitchList(1, {
        page: 1,
        limit: 20
      });

      expect(result).toEqual({
        items: mockSwitches,
        total: 2,
        page: 1,
        limit: 20
      });
    });
  });
});
