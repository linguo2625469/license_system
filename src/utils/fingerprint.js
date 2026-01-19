const crypto = require('crypto');

/**
 * 设备指纹工具类
 * 用于生成和验证设备指纹
 */
class FingerprintService {
  /**
   * 生成设备指纹
   * 算法: SHA256(cpuId|boardSerial|diskSerial|macAddress|platform)
   * 
   * @param {Object} components - 设备硬件信息
   * @param {string} components.cpuId - CPU ID
   * @param {string} components.boardSerial - 主板序列号
   * @param {string} components.diskSerial - 硬盘序列号
   * @param {string} components.macAddress - MAC 地址
   * @param {string} components.platform - 平台 (Windows/macOS/Linux)
   * @returns {string} 设备指纹（64 位 hex 字符串）
   */
  static generateFingerprint(components) {
    const {
      cpuId = '',
      boardSerial = '',
      diskSerial = '',
      macAddress = '',
      platform = ''
    } = components;

    // 标准化处理：去除空格、转小写
    const normalize = (str) => String(str).trim().toLowerCase();

    // 按照设计文档的算法拼接
    const fingerprintString = [
      normalize(cpuId),
      normalize(boardSerial),
      normalize(diskSerial),
      normalize(macAddress),
      normalize(platform)
    ].join('|');

    // 生成 SHA-256 哈希
    return crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex');
  }

  /**
   * 验证设备指纹格式
   * 设备指纹应该是 64 位的十六进制字符串（SHA-256 输出）
   * 
   * @param {string} fingerprint - 设备指纹
   * @returns {boolean} 是否有效
   */
  static verifyFingerprint(fingerprint) {
    if (!fingerprint || typeof fingerprint !== 'string') {
      return false;
    }

    // SHA-256 输出为 64 位十六进制字符串
    const fingerprintRegex = /^[a-f0-9]{64}$/i;
    return fingerprintRegex.test(fingerprint);
  }

  /**
   * 验证设备硬件信息的完整性
   * 检查必要的硬件信息是否提供
   * 
   * @param {Object} deviceInfo - 设备信息
   * @returns {Object} { valid: boolean, missing: string[] }
   */
  static validateDeviceInfo(deviceInfo) {
    const requiredFields = ['cpuId', 'boardSerial', 'diskSerial', 'macAddress', 'platform'];
    const missing = [];

    for (const field of requiredFields) {
      if (!deviceInfo[field] || String(deviceInfo[field]).trim() === '') {
        missing.push(field);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * 比较两个设备指纹是否相同
   * 
   * @param {string} fingerprint1 - 设备指纹 1
   * @param {string} fingerprint2 - 设备指纹 2
   * @returns {boolean} 是否相同
   */
  static compareFingerprints(fingerprint1, fingerprint2) {
    if (!fingerprint1 || !fingerprint2) {
      return false;
    }

    // 转换为小写进行比较（不区分大小写）
    return fingerprint1.toLowerCase() === fingerprint2.toLowerCase();
  }

  /**
   * 从设备信息生成并验证指纹
   * 这是一个便捷方法，结合了生成和验证
   * 
   * @param {Object} deviceInfo - 设备信息
   * @returns {Object} { fingerprint: string, valid: boolean, error?: string }
   */
  static generateAndValidate(deviceInfo) {
    // 验证设备信息完整性
    const validation = this.validateDeviceInfo(deviceInfo);
    
    if (!validation.valid) {
      return {
        fingerprint: null,
        valid: false,
        error: `缺少必要的设备信息: ${validation.missing.join(', ')}`
      };
    }

    // 生成指纹
    const fingerprint = this.generateFingerprint(deviceInfo);

    // 验证生成的指纹格式
    const isValid = this.verifyFingerprint(fingerprint);

    return {
      fingerprint,
      valid: isValid,
      error: isValid ? null : '生成的指纹格式无效'
    };
  }

  /**
   * 标准化设备信息
   * 清理和格式化设备信息，用于存储
   * 
   * @param {Object} deviceInfo - 原始设备信息
   * @returns {Object} 标准化后的设备信息
   */
  static normalizeDeviceInfo(deviceInfo) {
    const normalize = (str) => String(str || '').trim();

    return {
      cpuId: normalize(deviceInfo.cpuId),
      boardSerial: normalize(deviceInfo.boardSerial),
      diskSerial: normalize(deviceInfo.diskSerial),
      macAddress: normalize(deviceInfo.macAddress),
      platform: normalize(deviceInfo.platform),
      osVersion: normalize(deviceInfo.osVersion),
      // 可选字段
      region: normalize(deviceInfo.region),
      userAgent: normalize(deviceInfo.userAgent)
    };
  }
}

module.exports = FingerprintService;
