const NodeRSA = require('node-rsa');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const appConfig = require('../config/app');

/**
 * 加密工具类
 * 提供 RSA 加密解密、密码哈希等功能
 */
class CryptoService {
  /**
   * 生成 RSA 密钥对（异步，使用 Node.js 原生 crypto，性能更好）
   * @param {number} bits - 密钥长度，默认 2048
   * @returns {Promise<Object>} { publicKey, privateKey }
   */
  static async generateRSAKeyPair(bits = 2048) {
    return new Promise((resolve, reject) => {
      // 使用 Node.js 原生 crypto.generateKeyPair，异步不阻塞
      crypto.generateKeyPair('rsa', {
        modulusLength: bits,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }, (err, publicKey, privateKey) => {
        if (err) {
          reject(new Error(`RSA 密钥生成失败: ${err.message}`));
        } else {
          resolve({ publicKey, privateKey });
        }
      });
    });
  }

  /**
   * 生成 RSA 密钥对（同步版本，仅用于兼容旧代码）
   * 注意：会阻塞事件循环，不推荐使用
   * @deprecated 请使用异步版本 generateRSAKeyPair
   * @param {number} bits - 密钥长度，默认 2048
   * @returns {Object} { publicKey, privateKey }
   */
  static generateRSAKeyPairSync(bits = 2048) {
    const key = new NodeRSA({ b: bits });
    key.setOptions({ encryptionScheme: 'pkcs1_oaep' });
    
    return {
      publicKey: key.exportKey('public'),
      privateKey: key.exportKey('private')
    };
  }

  /**
   * 使用公钥加密数据
   * @param {string|Object} data - 要加密的数据
   * @param {string} publicKey - RSA 公钥（PEM 格式）
   * @returns {string} 加密后的 Base64 字符串
   */
  static encryptWithPublicKey(data, publicKey) {
    try {
      // 如果是对象，先转换为 JSON 字符串
      const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      
      // 使用 Node.js 原生 crypto 加密（支持更好的性能）
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(dataStr, 'utf8')
      );
      
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`RSA 加密失败: ${error.message}`);
    }
  }

  /**
   * 使用私钥解密数据
   * @param {string} encryptedData - 加密的 Base64 字符串
   * @param {string} privateKey - RSA 私钥（PEM 格式）
   * @returns {string} 解密后的数据
   */
  static decryptWithPrivateKey(encryptedData, privateKey) {
    try {
      // 使用 Node.js 原生 crypto 解密
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(encryptedData, 'base64')
      );
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`RSA 解密失败: ${error.message}`);
    }
  }

  /**
   * 对密码进行哈希
   * @param {string} password - 明文密码
   * @param {number} saltRounds - bcrypt salt rounds，默认 10
   * @returns {Promise<string>} 哈希后的密码
   */
  static async hashPassword(password, saltRounds = 10) {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error(`密码哈希失败: ${error.message}`);
    }
  }

  /**
   * 验证密码
   * @param {string} password - 明文密码
   * @param {string} hash - 哈希后的密码
   * @returns {Promise<boolean>} 是否匹配
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`密码验证失败: ${error.message}`);
    }
  }

  /**
   * 使用 AES-256 加密 RSA 私钥
   * @param {string} privateKey - RSA 私钥
   * @param {string} password - 加密密码
   * @returns {string} 加密后的私钥（格式：iv:encryptedData）
   */
  static encryptPrivateKey(privateKey, password = appConfig.rsaEncryptionKey) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`私钥加密失败: ${error.message}`);
    }
  }

  /**
   * 使用 AES-256 解密 RSA 私钥
   * @param {string} encryptedPrivateKey - 加密的私钥（格式：iv:encryptedData）
   * @param {string} password - 解密密码
   * @returns {string} 解密后的私钥
   */
  static decryptPrivateKey(encryptedPrivateKey, password = appConfig.rsaEncryptionKey) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(password, 'salt', 32);
      
      const [ivHex, encryptedData] = encryptedPrivateKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`私钥解密失败: ${error.message}`);
    }
  }

  /**
   * 生成 SHA-256 哈希
   * @param {string} data - 要哈希的数据
   * @returns {string} 哈希值（hex 格式）
   */
  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 生成随机字符串（用于生成授权码等）
   * @param {number} length - 字符串长度
   * @param {string} charset - 字符集，默认大写字母和数字
   * @returns {string} 随机字符串
   */
  static generateRandomString(length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let result = '';
    const bytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    
    return result;
  }

  /**
   * 生成 UUID v4
   * @returns {string} UUID
   */
  static generateUUID() {
    return crypto.randomUUID();
  }
}

module.exports = CryptoService;
