/**
 * 错误码定义
 * 格式: EXXYY
 * - E: 错误标识
 * - XX: 模块代码
 * - YY: 具体错误
 */
const ErrorCodes = {
  // 认证错误 (E01XX)
  E0101: '用户名或密码错误',
  E0102: 'JWT 令牌无效',
  E0103: 'JWT 令牌已过期',
  E0104: 'AppKey 无效',
  E0105: '软件已禁用',
  E0106: '未提供认证令牌',
  E0107: '认证令牌格式错误',

  // 授权码错误 (E02XX)
  E0201: '授权码不存在',
  E0202: '授权码已过期',
  E0203: '授权码已被禁用',
  E0204: '设备数量已达上限',
  E0205: '换绑次数已达上限',
  E0206: '点数不足',
  E0207: '授权码未激活',
  E0208: '授权码已被使用',
  E0209: '授权码类型不匹配',

  // 设备错误 (E03XX)
  E0301: '设备指纹格式无效',
  E0302: '设备未绑定',
  E0303: '设备已在黑名单',
  E0304: 'IP 已在黑名单',
  E0305: '设备信息不完整',
  E0306: '设备已绑定到其他授权码',

  // 心跳错误 (E04XX)
  E0401: '会话不存在',
  E0402: '会话已过期',
  E0403: '设备已被强制下线',
  E0404: '心跳超时',

  // 云控错误 (E05XX)
  E0501: '远程变量不存在',
  E0502: '远程开关不存在',
  E0503: '公告不存在',
  E0504: '版本不存在',
  E0505: '配置项不存在',

  // 系统错误 (E99XX)
  E9901: '数据库错误',
  E9902: '参数验证失败',
  E9903: '请求频率过高',
  E9904: '服务器内部错误',
  E9905: '资源不存在',
  E9906: '操作被拒绝',
  E9907: '数据格式错误',
  E9999: '未知错误'
};

/**
 * 响应格式化工具类
 */
class ResponseFormatter {
  /**
   * 成功响应
   * @param {Object} res - Express response 对象
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {number} statusCode - HTTP 状态码，默认 200
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      code: 'SUCCESS',
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 错误响应
   * @param {Object} res - Express response 对象
   * @param {string} code - 错误码
   * @param {string} message - 错误消息（可选，默认使用错误码对应的消息）
   * @param {number} statusCode - HTTP 状态码，默认 400
   * @param {*} data - 额外的错误数据
   */
  static error(res, code, message = null, statusCode = 400, data = null) {
    // 如果没有提供消息，使用错误码对应的默认消息
    const errorMessage = message || ErrorCodes[code] || '未知错误';

    return res.status(statusCode).json({
      success: false,
      code,
      message: errorMessage,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 参数验证失败响应
   * @param {Object} res - Express response 对象
   * @param {Array|string} errors - 验证错误信息
   */
  static validationError(res, errors) {
    const errorMessage = Array.isArray(errors) 
      ? errors.join('; ') 
      : errors;

    return this.error(res, 'E9902', errorMessage, 400, { errors });
  }

  /**
   * 未授权响应
   * @param {Object} res - Express response 对象
   * @param {string} message - 错误消息
   */
  static unauthorized(res, message = '未授权访问') {
    return this.error(res, 'E0102', message, 401);
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express response 对象
   * @param {string} message - 错误消息
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, 'E9906', message, 403);
  }

  /**
   * 资源不存在响应
   * @param {Object} res - Express response 对象
   * @param {string} message - 错误消息
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, 'E9905', message, 404);
  }

  /**
   * 服务器错误响应
   * @param {Object} res - Express response 对象
   * @param {Error} error - 错误对象
   * @param {string} message - 错误消息
   */
  static serverError(res, error = null, message = '服务器内部错误') {
    // 在开发环境返回详细错误信息
    const isDev = process.env.NODE_ENV === 'development';
    const errorData = isDev && error ? {
      error: error.message,
      stack: error.stack
    } : null;

    return this.error(res, 'E9904', message, 500, errorData);
  }

  /**
   * 速率限制响应
   * @param {Object} res - Express response 对象
   * @param {string} message - 错误消息
   */
  static rateLimitError(res, message = '请求过于频繁，请稍后再试') {
    return this.error(res, 'E9903', message, 429);
  }

  /**
   * 分页响应
   * @param {Object} res - Express response 对象
   * @param {Array} items - 数据列表
   * @param {number} total - 总数
   * @param {number} page - 当前页码
   * @param {number} limit - 每页数量
   * @param {string} message - 响应消息
   */
  static paginated(res, items, total, page, limit, message = '查询成功') {
    const totalPages = Math.ceil(total / limit);

    return this.success(res, {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, message);
  }

  /**
   * 创建资源成功响应
   * @param {Object} res - Express response 对象
   * @param {*} data - 创建的资源数据
   * @param {string} message - 响应消息
   */
  static created(res, data, message = '创建成功') {
    return this.success(res, data, message, 201);
  }

  /**
   * 无内容响应（用于删除等操作）
   * @param {Object} res - Express response 对象
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * 获取错误码对应的消息
   * @param {string} code - 错误码
   * @returns {string} 错误消息
   */
  static getErrorMessage(code) {
    return ErrorCodes[code] || '未知错误';
  }

  /**
   * 检查错误码是否存在
   * @param {string} code - 错误码
   * @returns {boolean}
   */
  static hasErrorCode(code) {
    return code in ErrorCodes;
  }
}

// 导出错误码常量
ResponseFormatter.ErrorCodes = ErrorCodes;

module.exports = ResponseFormatter;
