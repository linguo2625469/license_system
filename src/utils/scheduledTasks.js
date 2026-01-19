const cron = require('node-cron');
const HeartbeatService = require('../services/heartbeatService');
const logger = require('./logger');

/**
 * 定时任务管理
 * 使用 node-cron 执行定时任务
 */

// 存储所有定时任务实例
const tasks = {};

/**
 * 启动心跳超时检查任务
 * 每分钟执行一次，检查并标记超时的会话为离线
 */
function startHeartbeatTimeoutCheck() {
  // 每分钟执行一次
  tasks.heartbeatTimeout = cron.schedule('* * * * *', async () => {
    try {
      logger.debug('开始执行心跳超时检查任务');
      
      const offlineCount = await HeartbeatService.checkTimeout();
      
      if (offlineCount > 0) {
        logger.info('心跳超时检查完成', {
          offlineCount
        });
      } else {
        logger.debug('心跳超时检查完成，无超时会话');
      }
    } catch (error) {
      logger.error('心跳超时检查任务执行失败', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  logger.info('心跳超时检查任务已启动（每分钟执行）');
}

/**
 * 启动所有定时任务
 */
function startAll() {
  startHeartbeatTimeoutCheck();
  logger.info('所有定时任务已启动');
}

/**
 * 停止所有定时任务
 */
function stopAll() {
  Object.keys(tasks).forEach(taskName => {
    if (tasks[taskName] && tasks[taskName].stop) {
      tasks[taskName].stop();
      logger.debug(`定时任务 ${taskName} 已停止`);
    }
  });
  logger.info('所有定时任务已停止');
}

/**
 * 停止特定定时任务
 * @param {string} taskName - 任务名称
 */
function stop(taskName) {
  if (tasks[taskName] && tasks[taskName].stop) {
    tasks[taskName].stop();
    logger.info(`定时任务 ${taskName} 已停止`);
  }
}

module.exports = {
  startAll,
  stopAll,
  stop,
  startHeartbeatTimeoutCheck
};
