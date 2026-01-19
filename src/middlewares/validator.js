const Joi = require('joi');
const ResponseFormatter = require('../utils/response');
const Logger = require('../utils/logger');

/**
 * 创建验证中间件
 * @param {Object} schema - Joi 验证模式对象 { body, query, params }
 * @returns {Function} Express 中间件函数
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // 返回所有错误，而不是第一个
      allowUnknown: true, // 允许未知字段
      stripUnknown: true // 移除未知字段
    };

    const errors = [];

    // 验证请求体
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        req.body = value;
      }
    }

    // 验证查询参数
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        req.query = value;
      }
    }

    // 验证路径参数
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        req.params = value;
      }
    }

    // 如果有验证错误，返回错误响应
    if (errors.length > 0) {
      Logger.warn('请求验证失败', {
        url: req.originalUrl,
        method: req.method,
        errors,
        ip: req.ip
      });
      return ResponseFormatter.validationError(res, errors);
    }

    next();
  };
};

/**
 * 常用的验证规则
 */
const commonSchemas = {
  // ID 验证
  id: Joi.number().integer().positive().required(),
  
  // 分页参数
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // 授权码
  authCode: Joi.string().min(6).max(50).required(),

  // 设备指纹
  fingerprint: Joi.string().length(64).pattern(/^[a-f0-9]{64}$/i).required(),

  // 设备信息
  deviceInfo: Joi.object({
    cpuId: Joi.string().required(),
    boardSerial: Joi.string().required(),
    diskSerial: Joi.string().required(),
    macAddress: Joi.string().required(),
    platform: Joi.string().valid('Windows', 'macOS', 'Linux').required(),
    osVersion: Joi.string().optional(),
    region: Joi.string().optional(),
    userAgent: Joi.string().optional()
  }),

  // 软件 ID
  softwareId: Joi.number().integer().positive().required(),

  // 状态
  status: Joi.boolean(),

  // 日期范围
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  // AppKey
  appKey: Joi.string().length(64).pattern(/^[a-f0-9]{64}$/i),

  // 版本号
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/),

  // IP 地址
  ip: Joi.string().ip(),

  // 邮箱
  email: Joi.string().email(),

  // 密码（至少 6 位）
  password: Joi.string().min(6).max(50),

  // 用户名
  username: Joi.string().alphanum().min(3).max(30)
};

/**
 * 预定义的验证模式
 */
const schemas = {
  // 管理员登录
  adminLogin: {
    body: Joi.object({
      username: commonSchemas.username.required(),
      password: commonSchemas.password.required()
    })
  },

  // 创建软件
  createSoftware: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      notice: Joi.string().max(1000).optional(),
      version: commonSchemas.version.optional()
    })
  },

  // 更新软件
  updateSoftware: {
    params: Joi.object({
      id: commonSchemas.id
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      notice: Joi.string().max(1000).optional(),
      version: commonSchemas.version.optional(),
      status: commonSchemas.status.optional()
    })
  },

  // 生成授权码
  generateLicenses: {
    body: Joi.object({
      softwareId: commonSchemas.softwareId,
      count: Joi.number().integer().min(1).max(1000).required(),
      isPointCard: Joi.boolean().required(),
      
      // 时长卡配置
      cardType: Joi.string().valid('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year', 'permanent')
        .when('isPointCard', { is: false, then: Joi.required() }),
      duration: Joi.number().integer().min(1)
        .when('isPointCard', { is: false, then: Joi.required() }),
      activateMode: Joi.string().valid('first_use', 'scheduled').default('first_use'),
      startTime: Joi.date().iso()
        .when('activateMode', { is: 'scheduled', then: Joi.required() }),
      
      // 点卡配置
      totalPoints: Joi.number().integer().min(1)
        .when('isPointCard', { is: true, then: Joi.required() }),
      deductType: Joi.string().valid('per_use', 'per_hour', 'per_day')
        .when('isPointCard', { is: true, then: Joi.required() }),
      deductAmount: Joi.number().integer().min(1).default(1),
      
      // 设备配置
      maxDevices: Joi.number().integer().min(1).default(1),
      allowRebind: Joi.number().integer().min(0).default(0),
      singleOnline: Joi.boolean().default(true),
      
      remark: Joi.string().max(200).optional()
    })
  },

  // 激活授权码
  activateLicense: {
    body: Joi.object({
      code: commonSchemas.authCode,
      fingerprint: commonSchemas.fingerprint,
      deviceInfo: commonSchemas.deviceInfo
    })
  },

  // 验证授权
  verifyLicense: {
    body: Joi.object({
      code: commonSchemas.authCode.optional(),
      fingerprint: commonSchemas.fingerprint.optional()
    })
  },

  // 换绑设备
  rebindDevice: {
    body: Joi.object({
      code: commonSchemas.authCode,
      oldFingerprint: commonSchemas.fingerprint,
      newFingerprint: commonSchemas.fingerprint,
      deviceInfo: commonSchemas.deviceInfo
    })
  },

  // 扣点
  deductPoints: {
    body: Joi.object({
      amount: Joi.number().integer().min(1).optional(),
      reason: Joi.string().max(200).optional()
    })
  },

  // 添加黑名单
  addBlacklist: {
    body: Joi.object({
      fingerprint: commonSchemas.fingerprint.optional(),
      ip: commonSchemas.ip.optional(),
      reason: Joi.string().max(200).required(),
      softwareId: commonSchemas.softwareId.optional()
    }).or('fingerprint', 'ip') // 至少提供一个
  },

  // 创建远程变量
  createRemoteVar: {
    body: Joi.object({
      softwareId: commonSchemas.softwareId,
      varName: Joi.string().min(1).max(50).required(),
      varValue: Joi.any().required(),
      varType: Joi.string().valid('string', 'number', 'boolean', 'json').required(),
      description: Joi.string().max(200).optional()
    })
  },

  // 创建远程开关
  createRemoteSwitch: {
    body: Joi.object({
      softwareId: commonSchemas.softwareId,
      switchName: Joi.string().min(1).max(50).required(),
      switchKey: Joi.string().min(1).max(50).required(),
      switchValue: Joi.boolean().default(false),
      description: Joi.string().max(200).optional()
    })
  },

  // 创建公告
  createAnnouncement: {
    body: Joi.object({
      softwareId: commonSchemas.softwareId.optional(),
      title: Joi.string().min(1).max(200).required(),
      content: Joi.string().required(),
      type: Joi.string().valid('info', 'warning', 'error', 'success').default('info'),
      isPopup: Joi.boolean().default(false),
      showOnce: Joi.boolean().default(true),
      startTime: Joi.date().iso().optional(),
      endTime: Joi.date().iso().min(Joi.ref('startTime')).optional()
    })
  },

  // 创建版本
  createVersion: {
    body: Joi.object({
      softwareId: commonSchemas.softwareId,
      version: commonSchemas.version.required(),
      versionCode: Joi.number().integer().min(0).required(),
      title: Joi.string().max(200).optional(),
      changelog: Joi.string().optional(),
      downloadUrl: Joi.string().uri().max(500).required(),
      fileSize: Joi.string().max(50).optional(),
      fileMd5: Joi.string().length(32).pattern(/^[a-f0-9]{32}$/i).optional(),
      forceUpdate: Joi.boolean().default(false),
      minVersion: commonSchemas.version.optional()
    })
  },

  // 检查更新
  checkUpdate: {
    query: Joi.object({
      currentVersion: commonSchemas.version.required()
    })
  },

  // 查询列表（通用分页）
  listQuery: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      softwareId: commonSchemas.softwareId.optional(),
      status: Joi.string().optional(),
      keyword: Joi.string().max(100).optional()
    })
  }
};

module.exports = {
  validate,
  schemas,
  commonSchemas
};
