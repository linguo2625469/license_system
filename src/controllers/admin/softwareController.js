const SoftwareService = require('../../services/softwareService');
const ResponseFormatter = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 软件管理控制器
 * 处理软件的创建、查询、更新和删除操作
 */
class SoftwareController {
  /**
   * 创建新软件
   * POST /api/admin/software
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async createSoftware(req, res) {
    try {
      const { name, notice, version, downloadUrl } = req.body;

      // 参数验证
      if (!name || name.trim() === '') {
        return ResponseFormatter.validationError(res, '软件名称不能为空');
      }

      // 创建软件
      const software = await SoftwareService.createSoftware({
        name: name.trim(),
        notice,
        version,
        downloadUrl
      });

      logger.info('软件创建成功', {
        softwareId: software.id,
        name: software.name,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.created(res, software, '软件创建成功');
    } catch (error) {
      logger.error('创建软件失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      // 处理唯一性约束错误
      if (error.name === 'SequelizeUniqueConstraintError') {
        return ResponseFormatter.error(res, 'E9907', '软件名称或 AppKey 已存在', 400);
      }

      return ResponseFormatter.serverError(res, error, '创建软件失败');
    }
  }

  /**
   * 获取软件列表
   * GET /api/admin/software
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getSoftwareList(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search
      } = req.query;

      // 参数验证
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return ResponseFormatter.validationError(res, '页码必须是大于 0 的整数');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return ResponseFormatter.validationError(res, '每页数量必须在 1-100 之间');
      }

      // 构建查询选项
      const options = {
        page: pageNum,
        limit: limitNum
      };

      if (status !== undefined) {
        options.status = status === 'true' || status === '1';
      }

      if (search) {
        options.search = search.trim();
      }

      // 获取软件列表
      const result = await SoftwareService.getSoftwareList(options);

      return ResponseFormatter.paginated(
        res,
        result.items,
        result.total,
        result.page,
        result.limit,
        '获取软件列表成功'
      );
    } catch (error) {
      logger.error('获取软件列表失败', {
        error: error.message,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取软件列表失败');
    }
  }

  /**
   * 获取软件详情
   * GET /api/admin/software/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getSoftwareById(req, res) {
    try {
      const { id } = req.params;
      const { includePrivateKey } = req.query;

      // 参数验证
      const softwareId = parseInt(id);
      if (isNaN(softwareId)) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
      }

      // 获取软件详情
      const software = await SoftwareService.getSoftwareById(
        softwareId,
        includePrivateKey === 'true'
      );

      if (!software) {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      return ResponseFormatter.success(res, software, '获取软件详情成功');
    } catch (error) {
      logger.error('获取软件详情失败', {
        error: error.message,
        softwareId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取软件详情失败');
    }
  }

  /**
   * 更新软件信息
   * PUT /api/admin/software/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async updateSoftware(req, res) {
    try {
      const { id } = req.params;
      const { name, notice, version, downloadUrl, status } = req.body;

      // 参数验证
      const softwareId = parseInt(id);
      if (isNaN(softwareId)) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
      }

      // 构建更新数据
      const updateData = {};

      if (name !== undefined) {
        if (name.trim() === '') {
          return ResponseFormatter.validationError(res, '软件名称不能为空');
        }
        updateData.name = name.trim();
      }

      if (notice !== undefined) {
        updateData.notice = notice;
      }

      if (version !== undefined) {
        updateData.version = version;
      }

      if (downloadUrl !== undefined) {
        updateData.downloadUrl = downloadUrl;
      }

      if (status !== undefined) {
        updateData.status = Boolean(status);
      }

      // 更新软件
      const software = await SoftwareService.updateSoftware(softwareId, updateData);

      if (!software) {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      logger.info('软件更新成功', {
        softwareId,
        updateData,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, software, '软件更新成功');
    } catch (error) {
      logger.error('更新软件失败', {
        error: error.message,
        softwareId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '更新软件失败');
    }
  }

  /**
   * 删除软件
   * DELETE /api/admin/software/:id
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async deleteSoftware(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const softwareId = parseInt(id);
      if (isNaN(softwareId)) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
      }

      // 删除软件
      const deleted = await SoftwareService.deleteSoftware(softwareId);

      if (!deleted) {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      logger.info('软件删除成功', {
        softwareId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, null, '软件删除成功');
    } catch (error) {
      logger.error('删除软件失败', {
        error: error.message,
        softwareId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '删除软件失败');
    }
  }

  /**
   * 重新生成软件密钥对
   * POST /api/admin/software/:id/regenerate-keys
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async regenerateKeys(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const softwareId = parseInt(id);
      if (isNaN(softwareId)) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
      }

      // 重新生成密钥
      const keys = await SoftwareService.regenerateKeys(softwareId);

      if (!keys) {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      logger.warn('软件密钥对已重新生成', {
        softwareId,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.success(res, keys, '密钥对重新生成成功');
    } catch (error) {
      logger.error('重新生成密钥失败', {
        error: error.message,
        softwareId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '重新生成密钥失败');
    }
  }

  /**
   * 获取软件统计信息
   * GET /api/admin/software/:id/stats
   * @param {Object} req - Express request 对象
   * @param {Object} res - Express response 对象
   */
  static async getSoftwareStats(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      const softwareId = parseInt(id);
      if (isNaN(softwareId)) {
        return ResponseFormatter.validationError(res, '软件 ID 必须是整数');
      }

      // 获取统计信息
      const stats = await SoftwareService.getSoftwareStats(softwareId);

      if (!stats) {
        return ResponseFormatter.notFound(res, '软件不存在');
      }

      return ResponseFormatter.success(res, stats, '获取统计信息成功');
    } catch (error) {
      logger.error('获取软件统计信息失败', {
        error: error.message,
        softwareId: req.params.id,
        adminId: req.admin?.id,
        ip: req.ip
      });

      return ResponseFormatter.serverError(res, error, '获取统计信息失败');
    }
  }
}

module.exports = SoftwareController;
