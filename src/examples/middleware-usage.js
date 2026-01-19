/**
 * 中间件使用示例
 * 展示如何在 Express 应用中使用工具函数和中间件
 */

const express = require('express');
const { authenticateJWT, authenticateAppKey } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validator');
const { adminRateLimit, clientActivateRateLimit } = require('../middlewares/rateLimit');
const { errorHandler, notFoundHandler, asyncHandler, requestLogger } = require('../middlewares/errorHandler');
const ResponseFormatter = require('../utils/response');
const Logger = require('../utils/logger');
const CryptoService = require('../utils/crypto');
const FingerprintService = require('../utils/fingerprint');

const app = express();

// 基础中间件
app.use(express.json());
app.use(requestLogger); // 记录所有请求

// ============================================
// 管理端路由示例
// ============================================
const adminRouter = express.Router();

// 应用管理端速率限制
adminRouter.use(adminRateLimit);

// 登录接口（不需要认证）
adminRouter.post('/login', 
  validate(schemas.adminLogin),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    // 这里应该查询数据库验证用户
    // const admin = await Admin.findOne({ where: { username } });
    // const isValid = await CryptoService.verifyPassword(password, admin.password);
    
    Logger.logAdmin('login', { username });
    
    return ResponseFormatter.success(res, {
      token: 'jwt-token-here',
      admin: { id: 1, username }
    }, '登录成功');
  })
);

// 需要认证的管理端路由
adminRouter.get('/users',
  authenticateJWT, // JWT 认证
  asyncHandler(async (req, res) => {
    // req.admin 包含解码后的管理员信息
    Logger.info('管理员查询用户列表', { adminId: req.admin.id });
    
    return ResponseFormatter.success(res, {
      users: []
    }, '查询成功');
  })
);

// 创建软件
adminRouter.post('/software',
  authenticateJWT,
  validate(schemas.createSoftware),
  asyncHandler(async (req, res) => {
    const { name, notice, version } = req.body;
    
    // 生成 RSA 密钥对
    const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();
    
    // 生成 AppKey
    const appKey = CryptoService.sha256(`${name}-${Date.now()}`);
    
    Logger.logAdmin('create_software', {
      adminId: req.admin.id,
      softwareName: name
    });
    
    return ResponseFormatter.created(res, {
      id: 1,
      name,
      appKey,
      publicKey
      // privateKey 不应该返回给客户端
    }, '软件创建成功');
  })
);

app.use('/api/admin', adminRouter);

// ============================================
// 客户端路由示例
// ============================================
const clientRouter = express.Router();

// 所有客户端路由都需要 AppKey 认证
clientRouter.use(authenticateAppKey);

// 激活授权码
clientRouter.post('/auth/activate',
  clientActivateRateLimit, // 激活接口的速率限制
  validate(schemas.activateLicense),
  asyncHandler(async (req, res) => {
    const { code, fingerprint, deviceInfo } = req.body;
    
    // req.software 包含软件信息（由 authenticateAppKey 中间件设置）
    Logger.info('客户端激活授权码', {
      softwareId: req.software.id,
      code,
      fingerprint
    });
    
    // 验证设备指纹
    const fpValidation = FingerprintService.validateDeviceInfo(deviceInfo);
    if (!fpValidation.valid) {
      return ResponseFormatter.error(
        res,
        'E0305',
        `设备信息不完整: ${fpValidation.missing.join(', ')}`,
        400
      );
    }
    
    // 生成设备指纹
    const generatedFp = FingerprintService.generateFingerprint(deviceInfo);
    
    // 验证提交的指纹是否匹配
    if (!FingerprintService.compareFingerprints(fingerprint, generatedFp)) {
      Logger.logSecurity('fingerprint_mismatch', {
        softwareId: req.software.id,
        submitted: fingerprint,
        generated: generatedFp
      });
      return ResponseFormatter.error(res, 'E0301', '设备指纹不匹配', 400);
    }
    
    // 这里应该执行实际的激活逻辑
    // - 查询授权码
    // - 检查设备数量限制
    // - 绑定设备
    // - 创建会话
    
    Logger.logAuth('activate', {
      softwareId: req.software.id,
      code,
      deviceId: 1,
      fingerprint,
      ip: req.ip
    });
    
    return ResponseFormatter.success(res, {
      token: CryptoService.generateUUID(),
      authCode: {
        code,
        expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 天后
      }
    }, '激活成功');
  })
);

// 验证授权
clientRouter.post('/auth/verify',
  validate(schemas.verifyLicense),
  asyncHandler(async (req, res) => {
    // 这里应该验证授权状态
    
    return ResponseFormatter.success(res, {
      valid: true,
      expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }, '授权有效');
  })
);

// 心跳接口
clientRouter.post('/heartbeat',
  asyncHandler(async (req, res) => {
    // 更新心跳时间
    Logger.logHeartbeat({
      softwareId: req.software.id,
      ip: req.ip
    });
    
    return ResponseFormatter.success(res, {
      online: true,
      serverTime: Date.now()
    });
  })
);

app.use('/api/client', clientRouter);

// ============================================
// 错误处理（必须放在最后）
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    Logger.info(`服务器启动成功`, { port: PORT });
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
