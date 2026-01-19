const CryptoService = require('../crypto');

describe('CryptoService', () => {
  describe('RSA 加密解密', () => {
    test('应该生成有效的 RSA 密钥对', () => {
      const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
      
      expect(publicKey).toBeDefined();
      expect(privateKey).toBeDefined();
      expect(publicKey).toContain('BEGIN PUBLIC KEY');
      expect(privateKey).toContain('BEGIN RSA PRIVATE KEY');
    });

    test('应该能够加密和解密数据', () => {
      const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
      const originalData = 'Hello, World!';
      
      const encrypted = CryptoService.encryptWithPublicKey(originalData, publicKey);
      const decrypted = CryptoService.decryptWithPrivateKey(encrypted, privateKey);
      
      expect(decrypted).toBe(originalData);
    });

    test('应该能够加密和解密对象', () => {
      const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
      const originalData = { username: 'test', password: '123456' };
      
      const encrypted = CryptoService.encryptWithPublicKey(originalData, publicKey);
      const decrypted = CryptoService.decryptWithPrivateKey(encrypted, privateKey);
      
      expect(JSON.parse(decrypted)).toEqual(originalData);
    });
  });

  describe('密码哈希', () => {
    test('应该能够哈希密码', async () => {
      const password = 'myPassword123';
      const hash = await CryptoService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('应该能够验证正确的密码', async () => {
      const password = 'myPassword123';
      const hash = await CryptoService.hashPassword(password);
      
      const isValid = await CryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    test('应该拒绝错误的密码', async () => {
      const password = 'myPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await CryptoService.hashPassword(password);
      
      const isValid = await CryptoService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('私钥加密解密', () => {
    test('应该能够加密和解密私钥', () => {
      const { privateKey } = CryptoService.generateRSAKeyPair();
      const password = 'encryption-password';
      
      const encrypted = CryptoService.encryptPrivateKey(privateKey, password);
      const decrypted = CryptoService.decryptPrivateKey(encrypted, password);
      
      expect(decrypted).toBe(privateKey);
    });
  });

  describe('工具方法', () => {
    test('应该生成 SHA-256 哈希', () => {
      const data = 'test data';
      const hash = CryptoService.sha256(data);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    test('应该生成随机字符串', () => {
      const str1 = CryptoService.generateRandomString(16);
      const str2 = CryptoService.generateRandomString(16);
      
      expect(str1.length).toBe(16);
      expect(str2.length).toBe(16);
      expect(str1).not.toBe(str2);
      expect(/^[A-Z0-9]+$/.test(str1)).toBe(true);
    });

    test('应该生成 UUID', () => {
      const uuid = CryptoService.generateUUID();
      
      expect(uuid).toBeDefined();
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)).toBe(true);
    });
  });
});
