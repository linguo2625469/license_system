const express = require('express');
const router = express.Router();
const { authenticateAppKey } = require('../middlewares/auth');
const { checkIpBlacklist, checkDeviceBlacklist } = require('../middlewares/blacklistCheck');
const {
  clientActivateRateLimit,
  clientVerifyRateLimit,
  heartbeatRateLimit,
  generalRateLimit
} = require('../middlewares/rateLimit');
const ClientAuthController = require('../controllers/client/authController');
const CloudController = require('../controllers/client/cloudController');

/**
 * 客户端路由
 * 基础路径: /api/client
 * 
 * 特性:
 * - 所有路由需要 AppKey 验证中间件
 * - IP 黑名单检查应用于所有客户端路由
 * - 不同接口应用不同的速率限制策略
 * - RESTful 风格的 API 设计
 */

// ==================== 应用全局中间件 ====================
// 1. AppKey 验证 - 识别软件
router.use(authenticateAppKey);

// 2. IP 黑名单检查 - 防止恶意访问
router.use(checkIpBlacklist);

// ==================== 授权相关路由 ====================

/**
 * @swagger
 * /client/auth/activate:
 *   post:
 *     tags:
 *       - Client Auth
 *     summary: 激活授权码
 *     description: 使用授权码激活并绑定设备
 *     security:
 *       - appKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - fingerprint
 *             properties:
 *               code:
 *                 type: string
 *                 example: ABC123-DEF456-GHI789
 *               fingerprint:
 *                 type: string
 *                 example: abc123def456...
 *               deviceInfo:
 *                 type: object
 *                 properties:
 *                   platform:
 *                     type: string
 *                     example: Windows
 *                   osVersion:
 *                     type: string
 *                     example: 10.0.19041
 *                   cpuId:
 *                     type: string
 *                   boardSerial:
 *                     type: string
 *                   diskSerial:
 *                     type: string
 *                   macAddress:
 *                     type: string
 *     responses:
 *       200:
 *         description: 激活成功
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
 *                     token:
 *                       type: string
 *                       description: 会话令牌
 *                     authCode:
 *                       type: object
 *       401:
 *         description: 授权码无效
 *       429:
 *         description: 请求过于频繁
 */
router.post('/auth/activate', clientActivateRateLimit, checkDeviceBlacklist, ClientAuthController.activate);

/**
 * @swagger
 * /client/auth/verify:
 *   post:
 *     tags:
 *       - Client Auth
 *     summary: 验证授权状态
 *     description: 验证当前授权是否有效
 *     security:
 *       - appKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - fingerprint
 *             properties:
 *               code:
 *                 type: string
 *                 example: ABC123-DEF456-GHI789
 *               fingerprint:
 *                 type: string
 *                 example: abc123def456...
 *     responses:
 *       200:
 *         description: 验证成功
 */
router.post('/auth/verify', clientVerifyRateLimit, ClientAuthController.verify);

/**
 * @swagger
 * /client/auth/rebind:
 *   post:
 *     tags:
 *       - Client Auth
 *     summary: 设备换绑
 *     description: 将授权码从旧设备换绑到新设备
 *     security:
 *       - appKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - oldFingerprint
 *               - newFingerprint
 *             properties:
 *               code:
 *                 type: string
 *               oldFingerprint:
 *                 type: string
 *               newFingerprint:
 *                 type: string
 *               deviceInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: 换绑成功
 */
router.post('/auth/rebind', clientActivateRateLimit, checkDeviceBlacklist, ClientAuthController.rebind);

// ==================== 心跳路由 ====================

/**
 * @swagger
 * /client/heartbeat:
 *   post:
 *     tags:
 *       - Client Heartbeat
 *     summary: 发送心跳
 *     description: 客户端定期发送心跳保持在线状态（建议每 15-20 秒）
 *     security:
 *       - appKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 心跳成功
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
 *                     online:
 *                       type: boolean
 *                     serverTime:
 *                       type: integer
 */
router.post('/heartbeat', heartbeatRateLimit, ClientAuthController.heartbeat);

// ==================== 点卡扣点路由 ====================

/**
 * @swagger
 * /client/points/deduct:
 *   post:
 *     tags:
 *       - Client Points
 *     summary: 扣除点数
 *     description: 扣除点卡点数
 *     security:
 *       - appKeyAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 example: 1
 *               reason:
 *                 type: string
 *                 example: 使用功能 A
 *     responses:
 *       200:
 *         description: 扣点成功
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
 *                     deductAmount:
 *                       type: integer
 *                     remainingPoints:
 *                       type: integer
 *                     totalPoints:
 *                       type: integer
 */
router.post('/points/deduct', clientVerifyRateLimit, ClientAuthController.deductPoints);

// ==================== 云控路由 ====================
router.use('/cloud', generalRateLimit);

/**
 * @swagger
 * /client/cloud/vars:
 *   get:
 *     tags:
 *       - Client Cloud
 *     summary: 获取远程变量
 *     description: 获取该软件的所有远程变量
 *     security:
 *       - appKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       varName:
 *                         type: string
 *                       varValue:
 *                         type: string
 *                       varType:
 *                         type: string
 */
router.get('/cloud/vars', CloudController.getRemoteVars);

/**
 * @swagger
 * /client/cloud/switches:
 *   get:
 *     tags:
 *       - Client Cloud
 *     summary: 获取远程开关
 *     description: 获取该软件的所有远程开关
 *     security:
 *       - appKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       switchKey:
 *                         type: string
 *                       switchValue:
 *                         type: boolean
 *                       switchName:
 *                         type: string
 */
router.get('/cloud/switches', CloudController.getRemoteSwitches);

/**
 * @swagger
 * /client/cloud/announcements:
 *   get:
 *     tags:
 *       - Client Cloud
 *     summary: 获取公告列表
 *     description: 获取当前有效的公告列表
 *     security:
 *       - appKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       type:
 *                         type: string
 *                       isPopup:
 *                         type: boolean
 *                       showOnce:
 *                         type: boolean
 */
router.get('/cloud/announcements', CloudController.getAnnouncements);

/**
 * @swagger
 * /client/cloud/version/check:
 *   get:
 *     tags:
 *       - Client Cloud
 *     summary: 检查版本更新
 *     description: 检查是否有新版本
 *     security:
 *       - appKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: currentVersion
 *         required: true
 *         schema:
 *           type: string
 *         example: 1.0.0
 *     responses:
 *       200:
 *         description: 成功
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
 *                     hasUpdate:
 *                       type: boolean
 *                     version:
 *                       type: string
 *                     versionCode:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     changelog:
 *                       type: string
 *                     downloadUrl:
 *                       type: string
 *                     forceUpdate:
 *                       type: boolean
 */
router.get('/cloud/version/check', CloudController.checkUpdate);

module.exports = router;
