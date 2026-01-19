const CloudService = require('../cloudService');
const { RemoteVar, Software } = require('../../models');

// Mock dependencies
jest.mock('../../models');

describe('CloudService - Remote Variables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRemoteVar', () => {
    test('应该成功创建字符串类型的远程变量', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const mockRemoteVar = {
        id: 1,
        softwareId: 1,
        varName: 'testVar',
        varValue: 'testValue',
        varType: 'string',
        description: 'Test variable',
        status: true
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);
      RemoteVar.create.mockResolvedValue(mockRemoteVar);

      const result = await CloudService.createRemoteVar({
        softwareId: 1,
        varName: 'testVar',
        varValue: 'testValue',
        varType: 'string',
        description: 'Test variable'
      });

      expect(Software.findByPk).toHaveBeenCalledWith(1);
      expect(RemoteVar.findOne).toHaveBeenCalledWith({
        where: { softwareId: 1, varName: 'testVar' }
      });
      expect(RemoteVar.create).toHaveBeenCalled();
      expect(result).toEqual(mockRemoteVar);
    });

    test('应该成功创建数字类型的远程变量', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const mockRemoteVar = {
        id: 2,
        softwareId: 1,
        varName: 'maxUsers',
        varValue: '100',
        varType: 'number',
        description: 'Maximum users',
        status: true
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);
      RemoteVar.create.mockResolvedValue(mockRemoteVar);

      const result = await CloudService.createRemoteVar({
        softwareId: 1,
        varName: 'maxUsers',
        varValue: 100,
        varType: 'number'
      });

      expect(RemoteVar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          varValue: '100',
          varType: 'number'
        })
      );
    });

    test('应该成功创建布尔类型的远程变量', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const mockRemoteVar = {
        id: 3,
        softwareId: 1,
        varName: 'isEnabled',
        varValue: 'true',
        varType: 'boolean',
        status: true
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);
      RemoteVar.create.mockResolvedValue(mockRemoteVar);

      const result = await CloudService.createRemoteVar({
        softwareId: 1,
        varName: 'isEnabled',
        varValue: true,
        varType: 'boolean'
      });

      expect(RemoteVar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          varValue: 'true',
          varType: 'boolean'
        })
      );
    });

    test('应该成功创建 JSON 类型的远程变量', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const mockRemoteVar = {
        id: 4,
        softwareId: 1,
        varName: 'config',
        varValue: '{"key":"value"}',
        varType: 'json',
        status: true
      };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);
      RemoteVar.create.mockResolvedValue(mockRemoteVar);

      const result = await CloudService.createRemoteVar({
        softwareId: 1,
        varName: 'config',
        varValue: { key: 'value' },
        varType: 'json'
      });

      expect(RemoteVar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          varValue: '{"key":"value"}',
          varType: 'json'
        })
      );
    });

    test('应该在软件不存在时抛出错误', async () => {
      Software.findByPk.mockResolvedValue(null);

      await expect(
        CloudService.createRemoteVar({
          softwareId: 999,
          varName: 'testVar',
          varValue: 'testValue',
          varType: 'string'
        })
      ).rejects.toThrow('软件不存在');
    });

    test('应该在变量名已存在时抛出错误', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };
      const existingVar = { id: 1, varName: 'testVar' };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(existingVar);

      await expect(
        CloudService.createRemoteVar({
          softwareId: 1,
          varName: 'testVar',
          varValue: 'testValue',
          varType: 'string'
        })
      ).rejects.toThrow('变量名已存在');
    });

    test('应该在 JSON 格式无效时抛出错误', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);

      await expect(
        CloudService.createRemoteVar({
          softwareId: 1,
          varName: 'config',
          varValue: 'invalid json',
          varType: 'json'
        })
      ).rejects.toThrow('无效的 JSON 格式');
    });

    test('应该在数字格式无效时抛出错误', async () => {
      const mockSoftware = { id: 1, name: 'Test Software' };

      Software.findByPk.mockResolvedValue(mockSoftware);
      RemoteVar.findOne.mockResolvedValue(null);

      await expect(
        CloudService.createRemoteVar({
          softwareId: 1,
          varName: 'count',
          varValue: 'not a number',
          varType: 'number'
        })
      ).rejects.toThrow('无效的数字格式');
    });
  });

  describe('updateRemoteVar', () => {
    test('应该成功更新远程变量', async () => {
      const mockRemoteVar = {
        id: 1,
        softwareId: 1,
        varName: 'testVar',
        varValue: 'oldValue',
        varType: 'string',
        update: jest.fn().mockResolvedValue(true)
      };

      RemoteVar.findByPk.mockResolvedValue(mockRemoteVar);

      await CloudService.updateRemoteVar(1, {
        varValue: 'newValue'
      });

      expect(RemoteVar.findByPk).toHaveBeenCalledWith(1);
      expect(mockRemoteVar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          varValue: 'newValue'
        })
      );
    });

    test('应该在变量不存在时返回 null', async () => {
      RemoteVar.findByPk.mockResolvedValue(null);

      const result = await CloudService.updateRemoteVar(999, {
        varValue: 'newValue'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteRemoteVar', () => {
    test('应该成功删除远程变量', async () => {
      const mockRemoteVar = {
        id: 1,
        varName: 'testVar',
        destroy: jest.fn().mockResolvedValue(true)
      };

      RemoteVar.findByPk.mockResolvedValue(mockRemoteVar);

      const result = await CloudService.deleteRemoteVar(1);

      expect(RemoteVar.findByPk).toHaveBeenCalledWith(1);
      expect(mockRemoteVar.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('应该在变量不存在时返回 false', async () => {
      RemoteVar.findByPk.mockResolvedValue(null);

      const result = await CloudService.deleteRemoteVar(999);

      expect(result).toBe(false);
    });
  });

  describe('getRemoteVars', () => {
    test('应该返回所有启用的远程变量', async () => {
      const mockVars = [
        {
          id: 1,
          varName: 'var1',
          varValue: 'value1',
          varType: 'string',
          description: 'Variable 1'
        },
        {
          id: 2,
          varName: 'var2',
          varValue: '100',
          varType: 'number',
          description: 'Variable 2'
        }
      ];

      RemoteVar.findAll.mockResolvedValue(mockVars);

      const result = await CloudService.getRemoteVars(1);

      expect(RemoteVar.findAll).toHaveBeenCalledWith({
        where: { softwareId: 1, status: true },
        attributes: ['id', 'varName', 'varValue', 'varType', 'description'],
        order: [['varName', 'ASC']]
      });
      expect(result).toHaveLength(2);
      expect(result[0].varValue).toBe('value1');
      expect(result[1].varValue).toBe(100); // 数字类型应该被解析
    });

    test('应该返回指定的远程变量', async () => {
      const mockVar = {
        id: 1,
        varName: 'testVar',
        varValue: 'testValue',
        varType: 'string',
        description: 'Test variable'
      };

      RemoteVar.findAll.mockResolvedValue([mockVar]);

      const result = await CloudService.getRemoteVars(1, 'testVar');

      expect(RemoteVar.findAll).toHaveBeenCalledWith({
        where: { softwareId: 1, status: true, varName: 'testVar' },
        attributes: ['id', 'varName', 'varValue', 'varType', 'description'],
        order: [['varName', 'ASC']]
      });
      expect(result.varName).toBe('testVar');
    });

    test('应该在指定变量不存在时返回 null', async () => {
      RemoteVar.findAll.mockResolvedValue([]);

      const result = await CloudService.getRemoteVars(1, 'nonexistent');

      expect(result).toBeNull();
    });

    test('应该正确解析不同类型的变量值', async () => {
      const mockVars = [
        {
          id: 1,
          varName: 'stringVar',
          varValue: 'test',
          varType: 'string',
          description: null
        },
        {
          id: 2,
          varName: 'numberVar',
          varValue: '42',
          varType: 'number',
          description: null
        },
        {
          id: 3,
          varName: 'boolVar',
          varValue: 'true',
          varType: 'boolean',
          description: null
        },
        {
          id: 4,
          varName: 'jsonVar',
          varValue: '{"key":"value"}',
          varType: 'json',
          description: null
        }
      ];

      RemoteVar.findAll.mockResolvedValue(mockVars);

      const result = await CloudService.getRemoteVars(1);

      expect(result[0].varValue).toBe('test');
      expect(result[1].varValue).toBe(42);
      expect(result[2].varValue).toBe(true);
      expect(result[3].varValue).toEqual({ key: 'value' });
    });
  });

  describe('getRemoteVarList', () => {
    test('应该返回分页的远程变量列表', async () => {
      const mockVars = [
        { id: 1, varName: 'var1', varValue: 'value1', varType: 'string' },
        { id: 2, varName: 'var2', varValue: 'value2', varType: 'string' }
      ];

      RemoteVar.findAndCountAll.mockResolvedValue({
        count: 10,
        rows: mockVars
      });

      const result = await CloudService.getRemoteVarList(1, {
        page: 1,
        limit: 20
      });

      expect(RemoteVar.findAndCountAll).toHaveBeenCalledWith({
        where: { softwareId: 1 },
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0
      });
      expect(result.items).toEqual(mockVars);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    test('应该支持状态筛选', async () => {
      RemoteVar.findAndCountAll.mockResolvedValue({
        count: 5,
        rows: []
      });

      await CloudService.getRemoteVarList(1, {
        page: 1,
        limit: 20,
        status: true
      });

      expect(RemoteVar.findAndCountAll).toHaveBeenCalledWith({
        where: { softwareId: 1, status: true },
        order: [['createdAt', 'DESC']],
        limit: 20,
        offset: 0
      });
    });
  });
});
