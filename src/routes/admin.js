const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/auth');
const { adminRateLimit, strictRateLimit } = require('../middlewares/rateLimit');
const AdminAuthController = require('../controllers/admin/authController');
const SoftwareController = require('../controllers/admin/softwareController');
const LicenseController = require('../controllers/admin/licenseController');
const OnlineController = require('../controllers/admin/onlineController');
const CloudController = require('../controllers/admin/cloudController');
const BlacklistController = require('../controllers/admin/blacklistController');
const LogController = require('../controllers/admin/logController');
const ConfigController = require('../controllers/admin/configController');

/**
 * 管理端路由
 * 基础路径: /api/admin
 * 
 * 特性:
 * - 所有路由（除登录外）需要 JWT 认证
 * - 应用速率限制防止滥用
 * - RESTful 风格的 API 设计
 */

// ==================== 认证相关路由（不需要 JWT） ====================

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: 管理员登录
 *     description: 使用用户名和密码登录，获取 JWT 令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT 令牌
 *                     admin:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *       401:
 *         description: 认证失败
 *       429:
 *         description: 请求过于频繁
 */
router.post('/auth/login', strictRateLimit, AdminAuthController.login);

// ==================== 以下路由需要 JWT 认证和速率限制 ====================
router.use(authenticateJWT);
router.use(adminRateLimit);

// ==================== 认证管理路由 ====================

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: 管理员登出
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/auth/logout', AdminAuthController.logout);

/**
 * @swagger
 * /admin/auth/refresh-token:
 *   post:
 *     tags:
 *       - Admin Auth
 *     summary: 刷新 JWT 令牌
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刷新成功
 */
router.post('/auth/refresh-token', AdminAuthController.refreshToken);

/**
 * @swagger
 * /admin/auth/me:
 *   get:
 *     tags:
 *       - Admin Auth
 *     summary: 获取当前管理员信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/auth/me', AdminAuthController.getCurrentAdmin);

/**
 * @swagger
 * /admin/auth/verify-token:
 *   get:
 *     tags:
 *       - Admin Auth
 *     summary: 验证 JWT 令牌
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 */
router.get('/auth/verify-token', AdminAuthController.verifyToken);

// ==================== 软件管理路由 ====================

/**
 * @swagger
 * /admin/software:
 *   post:
 *     tags:
 *       - Admin Software
 *     summary: 创建软件
 *     description: 创建新软件并生成 AppKey 和 RSA 密钥对
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: 我的软件
 *               notice:
 *                 type: string
 *                 example: 欢迎使用
 *               version:
 *                 type: string
 *                 example: 1.0.0
 *     responses:
 *       200:
 *         description: 创建成功
 *   get:
 *     tags:
 *       - Admin Software
 *     summary: 获取软件列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/software', SoftwareController.createSoftware);
router.get('/software', SoftwareController.getSoftwareList);

/**
 * @swagger
 * /admin/software/{id}:
 *   get:
 *     tags:
 *       - Admin Software
 *     summary: 获取软件详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags:
 *       - Admin Software
 *     summary: 更新软件
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               notice:
 *                 type: string
 *               status:
 *                 type: boolean
 *               version:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Software
 *     summary: 删除软件
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.get('/software/:id', SoftwareController.getSoftwareById);
router.put('/software/:id', SoftwareController.updateSoftware);
router.delete('/software/:id', SoftwareController.deleteSoftware);

// ==================== 授权码管理路由 ====================

/**
 * @swagger
 * /admin/licenses/generate:
 *   post:
 *     tags:
 *       - Admin License
 *     summary: 批量生成授权码
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - softwareId
 *               - count
 *               - isPointCard
 *             properties:
 *               softwareId:
 *                 type: integer
 *                 example: 1
 *               count:
 *                 type: integer
 *                 example: 10
 *               isPointCard:
 *                 type: boolean
 *                 example: false
 *               cardType:
 *                 type: string
 *                 enum: [minute, hour, day, week, month, quarter, year, permanent]
 *                 example: month
 *               duration:
 *                 type: integer
 *                 example: 1
 *               totalPoints:
 *                 type: integer
 *                 example: 100
 *               maxDevices:
 *                 type: integer
 *                 example: 1
 *               allowRebind:
 *                 type: integer
 *                 example: 3
 *               singleOnline:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: 生成成功
 */
router.post('/licenses/generate', LicenseController.generateLicenses);

/**
 * @swagger
 * /admin/licenses:
 *   get:
 *     tags:
 *       - Admin License
 *     summary: 获取授权码列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unused, active, expired, disabled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/licenses', LicenseController.getLicenseList);

/**
 * @swagger
 * /admin/licenses/{id}:
 *   get:
 *     tags:
 *       - Admin License
 *     summary: 获取授权码详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags:
 *       - Admin License
 *     summary: 更新授权码
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [unused, active, expired, disabled]
 *               maxDevices:
 *                 type: integer
 *               allowRebind:
 *                 type: integer
 *               startTime:
 *                 type: Date
 *               expireTime:
 *                 type: Date
 *               remainingPoints:
 *                 type: integer
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin License
 *     summary: 删除授权码
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.get('/licenses/:id', LicenseController.getLicenseDetail);
router.put('/licenses/:id', LicenseController.updateLicense);
router.delete('/licenses/:id', LicenseController.deleteLicense);

/**
 * @swagger
 * /admin/licenses/{id}/adjust-time:
 *   post:
 *     tags:
 *       - Admin License
 *     summary: 调整授权码时间
 *     description: 增加或减少授权码的有效期（仅支持时长卡）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - value
 *               - unit
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [add, subtract]
 *                 description: 调整类型（add=增加, subtract=减少）
 *                 example: add
 *               value:
 *                 type: integer
 *                 description: 调整数值
 *                 example: 7
 *               unit:
 *                 type: string
 *                 enum: [minute, hour, day, week, month, year]
 *                 description: 时间单位
 *                 example: day
 *               reason:
 *                 type: string
 *                 description: 调整原因
 *                 example: 用户续费
 *     responses:
 *       200:
 *         description: 调整成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     oldExpireTime:
 *                       type: string
 *                       format: date-time
 *                     newExpireTime:
 *                       type: string
 *                       format: date-time
 *                     adjustment:
 *                       type: string
 *                       example: "+7 day"
 *       400:
 *         description: 参数错误或不支持的操作
 */
router.post('/licenses/:id/adjust-time', LicenseController.adjustLicenseTime);

/**
 * @swagger
 * /admin/licenses/{id}/unbind:
 *   post:
 *     tags:
 *       - Admin License
 *     summary: 强制解绑设备
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 解绑成功
 */
router.post('/licenses/:id/unbind', LicenseController.unbindDevice);

// ==================== 在线管理路由 ====================

/**
 * @swagger
 * /admin/online:
 *   get:
 *     tags:
 *       - Admin Online
 *     summary: 获取在线设备列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/online', OnlineController.getOnlineDevices);

/**
 * @swagger
 * /admin/online/{sessionId}/offline:
 *   post:
 *     tags:
 *       - Admin Online
 *     summary: 强制设备下线
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 强制下线成功
 */
router.post('/online/:sessionId/offline', OnlineController.forceOffline);

// ==================== 云控 - 远程变量路由 ====================

/**
 * @swagger
 * /admin/cloud/vars:
 *   post:
 *     tags:
 *       - Admin Cloud
 *     summary: 创建远程变量
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - softwareId
 *               - varName
 *               - varValue
 *             properties:
 *               softwareId:
 *                 type: integer
 *               varName:
 *                 type: string
 *               varValue:
 *                 type: string
 *               varType:
 *                 type: string
 *                 enum: [string, number, boolean, json]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 创建成功
 *   get:
 *     tags:
 *       - Admin Cloud
 *     summary: 获取远程变量列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/cloud/vars', CloudController.createRemoteVar);
router.get('/cloud/vars', CloudController.getRemoteVarList);

/**
 * @swagger
 * /admin/cloud/vars/{id}:
 *   put:
 *     tags:
 *       - Admin Cloud
 *     summary: 更新远程变量
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               varValue:
 *                 type: string
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Cloud
 *     summary: 删除远程变量
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.put('/cloud/vars/:id', CloudController.updateRemoteVar);
router.delete('/cloud/vars/:id', CloudController.deleteRemoteVar);

// ==================== 云控 - 远程开关路由 ====================

/**
 * @swagger
 * /admin/cloud/switches:
 *   post:
 *     tags:
 *       - Admin Cloud
 *     summary: 创建远程开关
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - softwareId
 *               - switchName
 *               - switchKey
 *             properties:
 *               softwareId:
 *                 type: integer
 *               switchName:
 *                 type: string
 *               switchKey:
 *                 type: string
 *               switchValue:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 创建成功
 *   get:
 *     tags:
 *       - Admin Cloud
 *     summary: 获取远程开关列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/cloud/switches', CloudController.createRemoteSwitch);
router.get('/cloud/switches', CloudController.getRemoteSwitchList);

/**
 * @swagger
 * /admin/cloud/switches/{id}:
 *   put:
 *     tags:
 *       - Admin Cloud
 *     summary: 更新远程开关
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               switchValue:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Cloud
 *     summary: 删除远程开关
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.put('/cloud/switches/:id', CloudController.updateRemoteSwitch);

/**
 * @swagger
 * /admin/cloud/switches/{id}/toggle:
 *   patch:
 *     tags:
 *       - Admin Cloud
 *     summary: 切换远程开关状态
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 切换成功
 */
router.patch('/cloud/switches/:id/toggle', CloudController.toggleRemoteSwitch);
router.delete('/cloud/switches/:id', CloudController.deleteRemoteSwitch);

// ==================== 云控 - 公告路由 ====================

/**
 * @swagger
 * /admin/cloud/announcements:
 *   post:
 *     tags:
 *       - Admin Cloud
 *     summary: 创建公告
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               softwareId:
 *                 type: integer
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, warning, error, success]
 *               isPopup:
 *                 type: boolean
 *               showOnce:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 创建成功
 *   get:
 *     tags:
 *       - Admin Cloud
 *     summary: 获取公告列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/cloud/announcements', CloudController.createAnnouncement);
router.get('/cloud/announcements', CloudController.getAnnouncementList);

/**
 * @swagger
 * /admin/cloud/announcements/{id}:
 *   put:
 *     tags:
 *       - Admin Cloud
 *     summary: 更新公告
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Cloud
 *     summary: 删除公告
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.put('/cloud/announcements/:id', CloudController.updateAnnouncement);
router.delete('/cloud/announcements/:id', CloudController.deleteAnnouncement);

// ==================== 云控 - 版本管理路由 ====================

/**
 * @swagger
 * /admin/cloud/versions:
 *   post:
 *     tags:
 *       - Admin Cloud
 *     summary: 创建版本
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - softwareId
 *               - version
 *             properties:
 *               softwareId:
 *                 type: integer
 *               version:
 *                 type: string
 *               versionCode:
 *                 type: integer
 *               title:
 *                 type: string
 *               changelog:
 *                 type: string
 *               downloadUrl:
 *                 type: string
 *               forceUpdate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 创建成功
 *   get:
 *     tags:
 *       - Admin Cloud
 *     summary: 获取版本列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/cloud/versions', CloudController.createVersion);
router.get('/cloud/versions', CloudController.getVersionList);

/**
 * @swagger
 * /admin/cloud/versions/{id}:
 *   put:
 *     tags:
 *       - Admin Cloud
 *     summary: 更新版本
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Cloud
 *     summary: 删除版本
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.put('/cloud/versions/:id', CloudController.updateVersion);
router.delete('/cloud/versions/:id', CloudController.deleteVersion);

// ==================== 黑名单管理路由 ====================

/**
 * @swagger
 * /admin/blacklist/devices:
 *   post:
 *     tags:
 *       - Admin Blacklist
 *     summary: 添加设备到黑名单
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fingerprint
 *             properties:
 *               fingerprint:
 *                 type: string
 *               reason:
 *                 type: string
 *               softwareId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 添加成功
 *   get:
 *     tags:
 *       - Admin Blacklist
 *     summary: 获取设备黑名单列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/blacklist/devices', BlacklistController.addDeviceToBlacklist);
router.get('/blacklist/devices', BlacklistController.getDeviceBlacklist);

/**
 * @swagger
 * /admin/blacklist/devices/{id}:
 *   delete:
 *     tags:
 *       - Admin Blacklist
 *     summary: 移除设备黑名单
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/blacklist/devices/:id', BlacklistController.removeDeviceFromBlacklist);

/**
 * @swagger
 * /admin/blacklist/ips:
 *   post:
 *     tags:
 *       - Admin Blacklist
 *     summary: 添加 IP 到黑名单
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ip
 *             properties:
 *               ip:
 *                 type: string
 *               reason:
 *                 type: string
 *               softwareId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 添加成功
 *   get:
 *     tags:
 *       - Admin Blacklist
 *     summary: 获取 IP 黑名单列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/blacklist/ips', BlacklistController.addIpToBlacklist);
router.get('/blacklist/ips', BlacklistController.getIpBlacklist);

/**
 * @swagger
 * /admin/blacklist/ips/{id}:
 *   delete:
 *     tags:
 *       - Admin Blacklist
 *     summary: 移除 IP 黑名单
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 移除成功
 */
router.delete('/blacklist/ips/:id', BlacklistController.removeIpFromBlacklist);

// ==================== 日志查询路由 ====================

/**
 * @swagger
 * /admin/logs/auth:
 *   get:
 *     tags:
 *       - Admin Logs
 *     summary: 获取授权日志
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/logs/auth', LogController.getAuthLogs);

/**
 * @swagger
 * /admin/logs/auth/stats:
 *   get:
 *     tags:
 *       - Admin Logs
 *     summary: 获取授权日志统计
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: softwareId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/logs/auth/stats', LogController.getAuthLogStats);

/**
 * @swagger
 * /admin/logs/points:
 *   get:
 *     tags:
 *       - Admin Logs
 *     summary: 获取扣点日志
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: authCodeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/logs/points', LogController.getPointDeductLogs);

/**
 * @swagger
 * /admin/logs/points/stats:
 *   get:
 *     tags:
 *       - Admin Logs
 *     summary: 获取扣点日志统计
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: authCodeId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/logs/points/stats', LogController.getPointDeductLogStats);

// ==================== 系统配置路由 ====================

/**
 * @swagger
 * /admin/config/categories:
 *   get:
 *     tags:
 *       - Admin Config
 *     summary: 获取配置分类
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/config/categories', ConfigController.getCategories);

/**
 * @swagger
 * /admin/config/initialize:
 *   post:
 *     tags:
 *       - Admin Config
 *     summary: 初始化系统配置
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 初始化成功
 */
router.post('/config/initialize', ConfigController.initializeConfigs);

/**
 * @swagger
 * /admin/config/{key}:
 *   get:
 *     tags:
 *       - Admin Config
 *     summary: 获取指定配置
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags:
 *       - Admin Config
 *     summary: 更新指定配置
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configValue
 *             properties:
 *               configValue:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags:
 *       - Admin Config
 *     summary: 重置配置
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 重置成功
 */
router.get('/config/:key', ConfigController.getConfig);
router.put('/config/:key', ConfigController.updateConfig);
router.delete('/config/:key', ConfigController.resetConfig);

/**
 * @swagger
 * /admin/config:
 *   get:
 *     tags:
 *       - Admin Config
 *     summary: 获取所有配置
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *   put:
 *     tags:
 *       - Admin Config
 *     summary: 批量更新配置
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.get('/config', ConfigController.getAllConfig);
router.put('/config', ConfigController.updateMultipleConfigs);
router.get('/config', ConfigController.getAllConfig);
router.put('/config/:key', ConfigController.updateConfig);
router.put('/config', ConfigController.updateMultipleConfigs);
router.delete('/config/:key', ConfigController.resetConfig);

module.exports = router;
