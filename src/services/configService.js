const { SystemConfig } = require('../models');
const logger = require('../utils/logger');

/**
 * 系统配置服务
 * 实现配置的获取和更新，支持三级配置优先级：数据库 > 环境变量 > 默认值
 */

// 默认配置值
const DEFAULT_CONFIG = {
  // 心跳配置
  heartbeatTimeout: {
    value: 30,
    type: 'number',
    description: '心跳超时时长（秒）',
    category: 'heartbeat'
  },
  
  // JWT 配置
  jwtExpiresIn: {
    value: 7200,
    type: 'number',
    description: 'JWT 令牌过期时间（秒）',
    category: 'auth'
  },
  jwtSecret: {
    value: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    type: 'string',
    description: 'JWT 密钥',
    category: 'auth'
  },
  
  // 速率限制配置
  rateLimitAdmin: {
    value: 100,
    type: 'number',
    description: '管理端 API 速率限制（请求数/15分钟）',
    category: 'rateLimit'
  },
  rateLimitClientActivate: {
    value: 10,
    type: 'number',
    description: '客户端激活 API 速率限制（请求数/小时）',
    category: 'rateLimit'
  },
  rateLimitClientVerify: {
    value: 60,
    type: 'number',
    description: '客户端验证 API 速率限制（请求数/分钟）',
    category: 'rateLimit'
  },
  rateLimitHeartbeat: {
    value: 120,
    type: 'number',
    description: '心跳 API 速率限制（请求数/分钟）',
    category: 'rateLimit'
  },
  
  // 安全配置
  rsaKeyLength: {
    value: 2048,
    type: 'number',
    description: 'RSA 密钥长度（位）',
    category: 'security'
  },
  bcryptSaltRounds: {
    value: 10,
    type: 'number',
    description: 'bcrypt 加密轮数',
    category: 'security'
  },
  nonceExpireTime: {
    value: 600,
    type: 'number',
    description: 'Nonce 过期时间（秒）',
    category: 'security'
  },
  
  // 系统配置
  logLevel: {
    value: process.env.LOG_LEVEL || 'info',
    type: 'string',
    description: '日志级别',
    category: 'system'
  },
  enableHttps: {
    value: false,
    type: 'boolean',
    description: '是否启用 HTTPS',
    category: 'system'
  }
};

/**
 * 获取配置值
 * 优先级：数据库 > 环境变量 > 默认值
 * @param {string} key - 配置键名
 * @returns {Promise<any>} 配置值
 */
async function getConfig(key) {
  try {
    // 1. 尝试从数据库获取
    const dbConfig = await SystemConfig.findOne({
      where: { configKey: key }
    });
    
    if (dbConfig) {
      return parseConfigValue(dbConfig.configValue, dbConfig.valueType);
    }
    
    // 2. 尝试从环境变量获取
    const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    if (process.env[envKey]) {
      const defaultConfig = DEFAULT_CONFIG[key];
      if (defaultConfig) {
        return parseConfigValue(process.env[envKey], defaultConfig.type);
      }
      return process.env[envKey];
    }
    
    // 3. 返回默认值
    if (DEFAULT_CONFIG[key]) {
      return DEFAULT_CONFIG[key].value;
    }
    
    logger.warn(`配置键 ${key} 不存在`);
    return null;
  } catch (error) {
    logger.error('获取配置失败', { key, error: error.message });
    // 降级到默认值
    return DEFAULT_CONFIG[key] ? DEFAULT_CONFIG[key].value : null;
  }
}

/**
 * 获取所有配置
 * @param {string} category - 可选，按分类筛选
 * @returns {Promise<Object>} 配置对象
 */
async function getAllConfig(category = null) {
  try {
    const configs = {};
    
    // 获取数据库中的所有配置
    const whereClause = {};
    if (category) {
      whereClause.category = category;
    }
    
    const dbConfigs = await SystemConfig.findAll({ where: whereClause });
    const dbConfigMap = {};
    dbConfigs.forEach(config => {
      dbConfigMap[config.configKey] = {
        value: parseConfigValue(config.configValue, config.valueType),
        type: config.valueType,
        description: config.description,
        category: config.category,
        source: 'database'
      };
    });
    
    // 合并默认配置
    for (const [key, defaultValue] of Object.entries(DEFAULT_CONFIG)) {
      if (category && defaultValue.category !== category) {
        continue;
      }
      
      if (dbConfigMap[key]) {
        configs[key] = dbConfigMap[key];
      } else {
        // 检查环境变量
        const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        if (process.env[envKey]) {
          configs[key] = {
            value: parseConfigValue(process.env[envKey], defaultValue.type),
            type: defaultValue.type,
            description: defaultValue.description,
            category: defaultValue.category,
            source: 'environment'
          };
        } else {
          configs[key] = {
            value: defaultValue.value,
            type: defaultValue.type,
            description: defaultValue.description,
            category: defaultValue.category,
            source: 'default'
          };
        }
      }
    }
    
    return configs;
  } catch (error) {
    logger.error('获取所有配置失败', { error: error.message });
    throw error;
  }
}

/**
 * 更新配置
 * @param {string} key - 配置键名
 * @param {any} value - 配置值
 * @returns {Promise<Object>} 更新后的配置
 */
async function updateConfig(key, value) {
  try {
    // 验证配置键是否存在于默认配置中
    if (!DEFAULT_CONFIG[key]) {
      throw new Error(`配置键 ${key} 不存在`);
    }
    
    const defaultConfig = DEFAULT_CONFIG[key];
    const valueType = defaultConfig.type;
    
    // 验证值类型
    validateConfigValue(value, valueType);
    
    // 序列化值
    const serializedValue = serializeConfigValue(value, valueType);
    
    // 更新或创建配置
    const [config, created] = await SystemConfig.findOrCreate({
      where: { configKey: key },
      defaults: {
        configKey: key,
        configValue: serializedValue,
        valueType: valueType,
        description: defaultConfig.description,
        category: defaultConfig.category
      }
    });
    
    if (!created) {
      config.configValue = serializedValue;
      config.valueType = valueType;
      await config.save();
    }
    
    logger.info('配置更新成功', { key, value });
    
    return {
      key,
      value: parseConfigValue(config.configValue, config.valueType),
      type: config.valueType,
      description: config.description,
      category: config.category
    };
  } catch (error) {
    logger.error('更新配置失败', { key, value, error: error.message });
    throw error;
  }
}

/**
 * 批量更新配置
 * @param {Object} configs - 配置对象 { key: value }
 * @returns {Promise<Object>} 更新结果
 */
async function updateMultipleConfigs(configs) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const [key, value] of Object.entries(configs)) {
    try {
      await updateConfig(key, value);
      results.success.push(key);
    } catch (error) {
      results.failed.push({ key, error: error.message });
    }
  }
  
  return results;
}

/**
 * 重置配置为默认值
 * @param {string} key - 配置键名
 * @returns {Promise<boolean>} 是否成功
 */
async function resetConfig(key) {
  try {
    const deleted = await SystemConfig.destroy({
      where: { configKey: key }
    });
    
    if (deleted > 0) {
      logger.info('配置已重置为默认值', { key });
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('重置配置失败', { key, error: error.message });
    throw error;
  }
}

/**
 * 初始化默认配置到数据库
 * @returns {Promise<void>}
 */
async function initializeDefaultConfigs() {
  try {
    for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
      const exists = await SystemConfig.findOne({
        where: { configKey: key }
      });
      
      if (!exists) {
        await SystemConfig.create({
          configKey: key,
          configValue: serializeConfigValue(config.value, config.type),
          valueType: config.type,
          description: config.description,
          category: config.category
        });
      }
    }
    
    logger.info('默认配置初始化完成');
  } catch (error) {
    logger.error('初始化默认配置失败', { error: error.message });
    throw error;
  }
}

// 辅助函数

/**
 * 解析配置值
 * @param {string} value - 序列化的值
 * @param {string} type - 值类型
 * @returns {any} 解析后的值
 */
function parseConfigValue(value, type) {
  try {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === true;
      case 'json':
        return JSON.parse(value);
      case 'string':
      default:
        return String(value);
    }
  } catch (error) {
    logger.error('解析配置值失败', { value, type, error: error.message });
    return value;
  }
}

/**
 * 序列化配置值
 * @param {any} value - 原始值
 * @param {string} type - 值类型
 * @returns {string} 序列化后的值
 */
function serializeConfigValue(value, type) {
  switch (type) {
    case 'json':
      return JSON.stringify(value);
    case 'boolean':
      return String(Boolean(value));
    case 'number':
      return String(Number(value));
    case 'string':
    default:
      return String(value);
  }
}

/**
 * 验证配置值类型
 * @param {any} value - 值
 * @param {string} type - 期望的类型
 * @throws {Error} 类型不匹配时抛出错误
 */
function validateConfigValue(value, type) {
  switch (type) {
    case 'number':
      if (isNaN(Number(value))) {
        throw new Error(`配置值必须是数字类型`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        throw new Error(`配置值必须是布尔类型`);
      }
      break;
    case 'json':
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error(`配置值必须是有效的 JSON 格式`);
        }
      }
      break;
    case 'string':
      // 字符串类型总是有效的
      break;
    default:
      throw new Error(`不支持的配置类型: ${type}`);
  }
}

module.exports = {
  getConfig,
  getAllConfig,
  updateConfig,
  updateMultipleConfigs,
  resetConfig,
  initializeDefaultConfigs,
  DEFAULT_CONFIG
};
