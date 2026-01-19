const configService = require('../../services/configService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 获取所有系统配置
 * GET /api/admin/config
 */
async function getAllConfig(req, res) {
  try {
    const { category } = req.query;
    
    const configs = await configService.getAllConfig(category);
    
    return ResponseFormatter.success(res, configs, '获取配置成功');
  } catch (error) {
    logger.error('获取配置失败', { error: error.message });
    return ResponseFormatter.error(res, 'E9901', '获取配置失败', 500);
  }
}

/**
 * 获取单个配置
 * GET /api/admin/config/:key
 */
async function getConfig(req, res) {
  try {
    const { key } = req.params;
    
    const value = await configService.getConfig(key);
    
    if (value === null) {
      return ResponseFormatter.error(res, 'E9902', '配置不存在', 404);
    }
    
    return ResponseFormatter.success(res, { key, value }, '获取配置成功');
  } catch (error) {
    logger.error('获取配置失败', { key: req.params.key, error: error.message });
    return ResponseFormatter.error(res, 'E9901', '获取配置失败', 500);
  }
}

/**
 * 更新单个配置
 * PUT /api/admin/config/:key
 */
async function updateConfig(req, res) {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return ResponseFormatter.error(res, 'E9902', '配置值不能为空', 400);
    }
    
    const updatedConfig = await configService.updateConfig(key, value);
    
    logger.info('配置更新成功', {
      key,
      value,
      adminId: req.admin?.id
    });
    
    return ResponseFormatter.success(res, updatedConfig, '配置更新成功');
  } catch (error) {
    logger.error('更新配置失败', {
      key: req.params.key,
      error: error.message
    });
    
    if (error.message.includes('不存在')) {
      return ResponseFormatter.error(res, 'E9902', error.message, 404);
    }
    
    if (error.message.includes('类型') || error.message.includes('格式')) {
      return ResponseFormatter.error(res, 'E9902', error.message, 400);
    }
    
    return ResponseFormatter.error(res, 'E9901', '更新配置失败', 500);
  }
}

/**
 * 批量更新配置
 * PUT /api/admin/config
 */
async function updateMultipleConfigs(req, res) {
  try {
    const { configs } = req.body;
    
    if (!configs || typeof configs !== 'object') {
      return ResponseFormatter.error(res, 'E9902', '配置格式错误', 400);
    }
    
    const results = await configService.updateMultipleConfigs(configs);
    
    logger.info('批量更新配置', {
      success: results.success.length,
      failed: results.failed.length,
      adminId: req.admin?.id
    });
    
    return ResponseFormatter.success(res, results, '批量更新配置完成');
  } catch (error) {
    logger.error('批量更新配置失败', { error: error.message });
    return ResponseFormatter.error(res, 'E9901', '批量更新配置失败', 500);
  }
}

/**
 * 重置配置为默认值
 * DELETE /api/admin/config/:key
 */
async function resetConfig(req, res) {
  try {
    const { key } = req.params;
    
    const success = await configService.resetConfig(key);
    
    if (!success) {
      return ResponseFormatter.error(res, 'E9902', '配置不存在或已是默认值', 404);
    }
    
    logger.info('配置已重置', {
      key,
      adminId: req.admin?.id
    });
    
    return ResponseFormatter.success(res, null, '配置已重置为默认值');
  } catch (error) {
    logger.error('重置配置失败', {
      key: req.params.key,
      error: error.message
    });
    return ResponseFormatter.error(res, 'E9901', '重置配置失败', 500);
  }
}

/**
 * 初始化默认配置
 * POST /api/admin/config/initialize
 */
async function initializeConfigs(req, res) {
  try {
    await configService.initializeDefaultConfigs();
    
    logger.info('默认配置初始化完成', {
      adminId: req.admin?.id
    });
    
    return ResponseFormatter.success(res, null, '默认配置初始化完成');
  } catch (error) {
    logger.error('初始化配置失败', { error: error.message });
    return ResponseFormatter.error(res, 'E9901', '初始化配置失败', 500);
  }
}

/**
 * 获取配置分类列表
 * GET /api/admin/config/categories
 */
async function getCategories(req, res) {
  try {
    const categories = {};
    
    for (const [key, config] of Object.entries(configService.DEFAULT_CONFIG)) {
      const category = config.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        key,
        description: config.description,
        type: config.type,
        defaultValue: config.value
      });
    }
    
    return ResponseFormatter.success(res, categories, '获取配置分类成功');
  } catch (error) {
    logger.error('获取配置分类失败', { error: error.message });
    return ResponseFormatter.error(res, 'E9901', '获取配置分类失败', 500);
  }
}

module.exports = {
  getAllConfig,
  getConfig,
  updateConfig,
  updateMultipleConfigs,
  resetConfig,
  initializeConfigs,
  getCategories
};
