const FingerprintService = require('../fingerprint');

describe('FingerprintService', () => {
  const mockDeviceInfo = {
    cpuId: 'CPU-12345',
    boardSerial: 'BOARD-67890',
    diskSerial: 'DISK-ABCDE',
    macAddress: '00:11:22:33:44:55',
    platform: 'Windows',
    osVersion: '10.0.19041'
  };

  describe('生成设备指纹', () => {
    test('应该生成有效的设备指纹', () => {
      const fingerprint = FingerprintService.generateFingerprint(mockDeviceInfo);
      
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(64);
      expect(/^[a-f0-9]{64}$/i.test(fingerprint)).toBe(true);
    });

    test('相同的设备信息应该生成相同的指纹', () => {
      const fp1 = FingerprintService.generateFingerprint(mockDeviceInfo);
      const fp2 = FingerprintService.generateFingerprint(mockDeviceInfo);
      
      expect(fp1).toBe(fp2);
    });

    test('不同的设备信息应该生成不同的指纹', () => {
      const deviceInfo2 = { ...mockDeviceInfo, cpuId: 'CPU-99999' };
      
      const fp1 = FingerprintService.generateFingerprint(mockDeviceInfo);
      const fp2 = FingerprintService.generateFingerprint(deviceInfo2);
      
      expect(fp1).not.toBe(fp2);
    });

    test('应该处理空字段', () => {
      const incompleteInfo = {
        cpuId: '',
        boardSerial: '',
        diskSerial: '',
        macAddress: '',
        platform: ''
      };
      
      const fingerprint = FingerprintService.generateFingerprint(incompleteInfo);
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(64);
    });
  });

  describe('验证设备指纹', () => {
    test('应该验证有效的指纹', () => {
      const validFingerprint = 'a'.repeat(64);
      expect(FingerprintService.verifyFingerprint(validFingerprint)).toBe(true);
    });

    test('应该拒绝无效长度的指纹', () => {
      expect(FingerprintService.verifyFingerprint('abc123')).toBe(false);
      expect(FingerprintService.verifyFingerprint('a'.repeat(63))).toBe(false);
      expect(FingerprintService.verifyFingerprint('a'.repeat(65))).toBe(false);
    });

    test('应该拒绝非十六进制字符', () => {
      const invalidFingerprint = 'g'.repeat(64);
      expect(FingerprintService.verifyFingerprint(invalidFingerprint)).toBe(false);
    });

    test('应该拒绝空值', () => {
      expect(FingerprintService.verifyFingerprint(null)).toBe(false);
      expect(FingerprintService.verifyFingerprint(undefined)).toBe(false);
      expect(FingerprintService.verifyFingerprint('')).toBe(false);
    });
  });

  describe('验证设备信息', () => {
    test('应该验证完整的设备信息', () => {
      const result = FingerprintService.validateDeviceInfo(mockDeviceInfo);
      
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('应该检测缺失的字段', () => {
      const incompleteInfo = {
        cpuId: 'CPU-12345',
        boardSerial: '',
        diskSerial: 'DISK-ABCDE'
      };
      
      const result = FingerprintService.validateDeviceInfo(incompleteInfo);
      
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('boardSerial');
      expect(result.missing).toContain('macAddress');
      expect(result.missing).toContain('platform');
    });
  });

  describe('比较设备指纹', () => {
    test('应该识别相同的指纹', () => {
      const fp1 = 'a'.repeat(64);
      const fp2 = 'a'.repeat(64);
      
      expect(FingerprintService.compareFingerprints(fp1, fp2)).toBe(true);
    });

    test('应该识别不同的指纹', () => {
      const fp1 = 'a'.repeat(64);
      const fp2 = 'b'.repeat(64);
      
      expect(FingerprintService.compareFingerprints(fp1, fp2)).toBe(false);
    });

    test('应该不区分大小写', () => {
      const fp1 = 'A'.repeat(64);
      const fp2 = 'a'.repeat(64);
      
      expect(FingerprintService.compareFingerprints(fp1, fp2)).toBe(true);
    });

    test('应该处理空值', () => {
      expect(FingerprintService.compareFingerprints(null, 'abc')).toBe(false);
      expect(FingerprintService.compareFingerprints('abc', null)).toBe(false);
    });
  });

  describe('生成并验证', () => {
    test('应该成功生成并验证完整的设备信息', () => {
      const result = FingerprintService.generateAndValidate(mockDeviceInfo);
      
      expect(result.valid).toBe(true);
      expect(result.fingerprint).toBeDefined();
      expect(result.fingerprint.length).toBe(64);
      expect(result.error).toBeNull();
    });

    test('应该拒绝不完整的设备信息', () => {
      const incompleteInfo = { cpuId: 'CPU-12345' };
      const result = FingerprintService.generateAndValidate(incompleteInfo);
      
      expect(result.valid).toBe(false);
      expect(result.fingerprint).toBeNull();
      expect(result.error).toContain('缺少必要的设备信息');
    });
  });

  describe('标准化设备信息', () => {
    test('应该清理和格式化设备信息', () => {
      const rawInfo = {
        cpuId: '  CPU-12345  ',
        boardSerial: 'BOARD-67890',
        diskSerial: null,
        macAddress: '00:11:22:33:44:55',
        platform: 'Windows',
        osVersion: '  10.0  '
      };
      
      const normalized = FingerprintService.normalizeDeviceInfo(rawInfo);
      
      expect(normalized.cpuId).toBe('CPU-12345');
      expect(normalized.diskSerial).toBe('');
      expect(normalized.osVersion).toBe('10.0');
    });
  });
});
