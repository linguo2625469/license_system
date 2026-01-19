# 工具函数和中间件文档

本目录包含授权码管理系统的核心工具函数和中间件。

## 工具函数 (Utils)

### 1. crypto.js - 加密工具
提供 RSA 加密解密、密码哈希等安全功能。

**主要方法**:
- `generateRSAKeyPair(bits)` - 生成 RSA 密钥对
- `encryptWithPublicKey(data, publicKey)` - 使用公钥加密数据
- `decryptWithPrivateKey(encryptedData, privateKey)` - 使用私钥解密数据
- `hashPassword(password, saltRounds)` - 密码哈希（bcrypt）
- `verifyPassword(password, hash)` - 验证密码
- `encryptPrivateKey(privateKey, password)` - AES-256 加密私钥
- `decryptPrivateKey(encryptedPrivateKey, password)` - AES-256 解密私钥
- `sha256(data)` - 生成 SHA-256 哈希
- `generateRandomString(length, charset)` - 生成随机字符串
- `generateUUID()` - 生成 UUID v4

**使用示例**:
```javascript
const CryptoService = require('./utils/crypto');

// 生成 RSA 密钥对
const { publicKey, privateKey } = CryptoService.generateRSAKeyPair();

// 加密数据
const encrypted = CryptoService.encryptWithPublicKey('Hello', publicKey);
const decrypted = CryptoService.decryptWithPrivateKey(encrypted, privateKey);

// 密码哈希
const hash = await CryptoService.hashPassword('myPassword');
const isValid = await CryptoService.verifyPassword('myPassword', hash);
```

### 2. fingerprint.js - 设备指纹工具
提供设备指纹生成和验证功能。

**主要方法**:
- `generateFingerprint(components)` - 生成设备指纹
- `verifyFingerprint(fingerprint)` - 验证指纹格式
- `validateDeviceInfo(deviceInfo)` - 验证设备信息完整性
- `compareFingerprints(fp1, fp2)` - 比较两个指纹
- `generateAndValidate(deviceInfo)` - 生成并验证指纹
- `normalizeDeviceInfo(deviceInfo)` - 标准化设备信息

**使用示例**:
```javascript
const FingerprintService = require('./utils/fingerprint');

const deviceInfo = {
  cpuId: 'CPU-12345',
  boardSerial: 'BOARD-67890',
  diskSerial: 'DISK-ABCDE',
  macAddress: '00:11:22:33:44:55',
  platform: 'Windows'
};

const fingerprint = FingerprintService.generateFingerprint(deviceInfo);
const isValid = FingerprintService.verifyFingerprint(fingerprint);
```

### 3. logger.js - 日志工具
基于 Winston 的日志记录工具。

**主要方法**:
- `info(message, meta)` - 记录信息日志
- `warn(message, meta)` - 记录警告日志
- `error(message, error)` - 记录错误日志
- `debug(message, meta)` - 记录调试日志
- `logAuth(action, data)` - 记录授权操作
- `logAdmin(action, data)` - 记录管理操作
- `logSecurity(event, data)` - 记录安全事件
- `logRequest(req, statusCode, responseTime)` - 记录 API 请求
- `logDatabase(operation, data)` - 记录数据库操作
- `logHeartbeat(data)` - 记录心跳
- `logPointDeduct(data)` - 记录点卡扣点

**使用示例**:
```javascript
const Logger = require('./utils/logger');

Logger.info('用户登录成功', { userId: 123 });
Logger.error('数据库连接失败', new Error('Connection timeout'));
Logger.logAuth('activate', { authCodeId: 456, deviceId: 789 });
```

### 4. response.js - 响应格式化工具
统一的 API 响应格式化工具。

**主要方法**:
- `success(res, data, message, statusCode)` - 成功响应
- `error(res, code, message, statusCode, data)` - 错误响应
- `validationError(res, errors)` - 参数验证失败响应
- `unauthorized(res, message)` - 未授权响应
- `forbidden(res, message)` - 禁止访问响应
- `notFound(res, message)` - 资源不存在响应
- `serverError(res, error, message)` - 服务器错误响应
- `rateLimitError(res, message)` - 速率限制响应
- `paginated(res, items, total, page, limit, message)` - 分页响应
- `created(res, data, message)` - 创建资源成功响应
- `noContent(res)` - 无内容响应

**错误码**:
- E01XX: 认证错误
- E02XX: 授权码错误
- E03XX: 设备错误
- E04XX: 心跳错误
- E05XX: 云控错误
- E99XX: 系统错误

**使用示例**:
```javascript
const ResponseFormatter = require('./utils/response');

// 成功响应
ResponseFormatter.success(res, { userId: 123 }, '登录成功');

// 错误响应
ResponseFormatter.error(res, 'E0201', '授权码不存在', 404);

// 分页响应
ResponseFormatter.paginated(res, items, 100, 1, 10, '查询成功');
```

## 中间件 (Middlewares)

### 1. auth.js - 认证中间件
提供 JWT 和 AppKey 认证功能。

**中间件**:
- `authenticateJWT` - JWT 认证（管理端）
- `authenticateAppKey` - AppKey 认证（客户端）
- `optionalJWT` - 可选的 JWT 认证

**使用示例**:
```javascript
const { authenticateJWT, authenticateAppKey } = require('./middlewares/auth');

// 管理端路由
router.get('/admin/users', authenticateJWT, userController.list);

// 客户端路由
router.post('/client/auth/activate', authenticateAppKey, authController.activate);
```

### 2. validator.js - 验证中间件
基于 Joi 的请求参数验证中间件。

**主要功能**:
- `validate(schema)` - 创建验证中间件
- `schemas` - 预定义的验证模式
- `commonSchemas` - 常用的验证规则

**使用示例**:
```javascript
const { validate, schemas } = require('./middlewares/validator');

// 使用预定义的验证模式
router.post('/admin/login', validate(schemas.adminLogin), authController.login);

// 自定义验证模式
router.post('/custom', validate({
  body: Joi.object({
    name: Joi.string().required(),
    age: Joi.number().min(0)
  })
}), controller.create);
```

### 3. rateLimit.js - 速率限制中间件
基于 express-rate-limit 的速率限制功能。

**中间件**:
- `adminRateLimit` - 管理端速率限制（100 请求/15分钟）
- `clientActivateRateLimit` - 客户端激活限制（10 请求/小时）
- `clientVerifyRateLimit` - 客户端验证限制（60 请求/分钟）
- `heartbeatRateLimit` - 心跳限制（120 请求/分钟）
- `generalRateLimit` - 通用限制（60 请求/分钟）
- `strictRateLimit` - 严格限制（5 请求/分钟）
- `createRateLimit(options)` - 创建自定义速率限制

**使用示例**:
```javascript
const { adminRateLimit, clientActivateRateLimit } = require('./middlewares/rateLimit');

// 应用到路由
router.use('/admin', adminRateLimit);
router.post('/client/auth/activate', clientActivateRateLimit, controller.activate);
```

### 4. errorHandler.js - 错误处理中间件
全局错误处理和请求日志记录。

**中间件**:
- `notFoundHandler` - 404 处理
- `errorHandler` - 全局错误处理
- `asyncHandler(fn)` - 异步路由包装器
- `requestLogger` - 请求日志记录

**错误类**:
- `AppError` - 应用错误基类
- `AuthError` - 认证错误
- `ValidationError` - 验证错误
- `NotFoundError` - 资源不存在错误
- `ForbiddenError` - 禁止访问错误
- `DatabaseError` - 数据库错误

**使用示例**:
```javascript
const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  requestLogger,
  NotFoundError 
} = require('./middlewares/errorHandler');

// 应用中间件
app.use(requestLogger);

// 异步路由包装
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    throw new NotFoundError('用户不存在');
  }
  res.json(user);
}));

// 错误处理（放在最后）
app.use(notFoundHandler);
app.use(errorHandler);
```

## 测试

所有工具函数都包含单元测试，位于 `__tests__` 目录。

运行测试:
```bash
npm test
```

运行特定测试:
```bash
npm test -- utils/__tests__/crypto.test.js
```

## 配置

相关配置位于 `src/config/` 目录:
- `app.js` - 应用配置（心跳超时、日志级别、速率限制等）
- `jwt.js` - JWT 配置
- `database.js` - 数据库配置

## 注意事项

1. **RSA 加密**: 使用 PKCS1_OAEP 加密方案，密钥长度 2048 位
2. **密码哈希**: 使用 bcrypt，salt rounds 为 10
3. **设备指纹**: 基于 SHA-256 算法，输出 64 位十六进制字符串
4. **日志**: 自动按大小轮转，错误日志单独存储
5. **速率限制**: 基于 IP 地址，可结合 AppKey 进行更精细的控制
6. **错误处理**: 统一的错误码和响应格式，开发环境返回详细错误信息
