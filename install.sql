-- =====================================================
-- 授权码管理系统 - 数据库初始化脚本
-- License Management System - Database Initialization
-- 版本: 2.0
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 管理员表 (Admins)
-- =====================================================
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL COMMENT '管理员用户名',
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希密码',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
  `lastLogin` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `lastIp` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- =====================================================
-- 2. 软件表 (Software)
-- =====================================================
CREATE TABLE IF NOT EXISTS `software` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '软件名称',
  `appKey` VARCHAR(64) NOT NULL COMMENT '软件唯一标识符',
  `publicKey` TEXT NOT NULL COMMENT 'RSA 公钥',
  `privateKey` TEXT NOT NULL COMMENT 'RSA 私钥（加密存储）',
  `status` TINYINT(1) DEFAULT 1 COMMENT '启用状态：1=启用，0=禁用',
  `notice` TEXT DEFAULT NULL COMMENT '软件公告',
  `version` VARCHAR(20) DEFAULT '1.0.0' COMMENT '当前版本',
  `downloadUrl` VARCHAR(500) DEFAULT NULL COMMENT '下载链接',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `appKey` (`appKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='软件表';

-- =====================================================
-- 3. 授权码表 (Auth Codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS `auth_codes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `code` VARCHAR(50) NOT NULL COMMENT '授权码',
  
  -- 授权类型
  `isPointCard` TINYINT(1) DEFAULT 0 COMMENT '授权类型：0=时长卡，1=点卡',
  
  -- 时长卡字段
  `cardType` ENUM('minute','hour','day','week','month','quarter','year','permanent') DEFAULT NULL COMMENT '时长卡类型',
  `duration` INT(11) DEFAULT NULL COMMENT '时长数值',
  `activateMode` ENUM('first_use','scheduled') DEFAULT 'first_use' COMMENT '激活模式：首次使用/定时激活',
  `startTime` DATETIME DEFAULT NULL COMMENT '定时激活开始时间',
  `expireTime` DATETIME DEFAULT NULL COMMENT '到期时间',
  
  -- 点卡字段
  `totalPoints` INT(11) DEFAULT 0 COMMENT '总点数',
  `remainingPoints` INT(11) DEFAULT 0 COMMENT '剩余点数',
  `deductType` ENUM('per_use','per_hour','per_day') DEFAULT NULL COMMENT '扣点类型：按次/按小时/按天',
  `deductAmount` INT(11) DEFAULT 1 COMMENT '每次扣除点数',
  
  -- 设备管理
  `maxDevices` INT(11) DEFAULT 1 COMMENT '最大设备数',
  `allowRebind` INT(11) DEFAULT 0 COMMENT '允许换绑次数',
  `rebindCount` INT(11) DEFAULT 0 COMMENT '已换绑次数',
  
  -- 在线控制
  `singleOnline` TINYINT(1) DEFAULT 1 COMMENT '单点登录：1=启用，0=禁用',
  
  -- 状态
  `status` ENUM('unused','active','expired','disabled') DEFAULT 'unused' COMMENT '状态：未使用/激活/过期/禁用',
  `usedTime` DATETIME DEFAULT NULL COMMENT '首次使用时间',
  `remark` VARCHAR(200) DEFAULT NULL COMMENT '备注',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_status` (`status`),
  KEY `idx_expire_time` (`expireTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='授权码表';

-- =====================================================
-- 4. 设备表 (Devices)
-- =====================================================
CREATE TABLE IF NOT EXISTS `devices` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `authCodeId` INT(11) DEFAULT NULL COMMENT '关联授权码ID',
  `fingerprint` VARCHAR(64) NOT NULL COMMENT '设备指纹',
  `machineCode` VARCHAR(128) DEFAULT NULL COMMENT '机器码（兼容）',
  
  -- 设备信息
  `platform` VARCHAR(50) DEFAULT NULL COMMENT '平台：Windows/macOS/Linux',
  `osVersion` VARCHAR(50) DEFAULT NULL COMMENT '操作系统版本',
  `cpuId` VARCHAR(100) DEFAULT NULL COMMENT 'CPU ID',
  `boardSerial` VARCHAR(100) DEFAULT NULL COMMENT '主板序列号',
  `diskSerial` VARCHAR(100) DEFAULT NULL COMMENT '硬盘序列号',
  `macAddress` VARCHAR(100) DEFAULT NULL COMMENT 'MAC 地址',
  
  -- 状态
  `status` ENUM('active','inactive','blacklisted') DEFAULT 'active' COMMENT '状态：激活/未激活/黑名单',
  `lastHeartbeat` DATETIME DEFAULT NULL COMMENT '最后心跳时间',
  `lastIp` VARCHAR(50) DEFAULT NULL COMMENT '最后IP地址',
  `region` VARCHAR(100) DEFAULT NULL COMMENT '地理位置',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `fingerprint` (`fingerprint`),
  KEY `idx_software_fingerprint` (`softwareId`, `fingerprint`),
  KEY `idx_auth_code_id` (`authCodeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- =====================================================
-- 5. 在线会话表 (Online Sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS `online_sessions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `deviceId` INT(11) NOT NULL COMMENT '关联设备ID',
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `authCodeId` INT(11) NOT NULL COMMENT '关联授权码ID',
  `tokenHash` VARCHAR(64) NOT NULL COMMENT '会话令牌哈希',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `userAgent` VARCHAR(255) DEFAULT NULL COMMENT '用户代理',
  `isValid` TINYINT(1) DEFAULT 1 COMMENT '会话有效性：1=有效，0=无效',
  `loginTime` DATETIME DEFAULT NULL COMMENT '登录时间',
  `lastHeartbeat` DATETIME DEFAULT NULL COMMENT '最后心跳时间',
  `tokenExpireTime` DATETIME DEFAULT NULL COMMENT '令牌过期时间',
  `forceOffline` TINYINT(1) DEFAULT 0 COMMENT '强制下线：1=是，0=否',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_device_id` (`deviceId`),
  KEY `idx_token_hash` (`tokenHash`),
  KEY `idx_last_heartbeat` (`lastHeartbeat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='在线会话表';

-- =====================================================
-- 6. 远程变量表 (Remote Variables)
-- =====================================================
CREATE TABLE IF NOT EXISTS `remote_vars` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `varName` VARCHAR(50) NOT NULL COMMENT '变量名',
  `varValue` TEXT DEFAULT NULL COMMENT '变量值',
  `varType` ENUM('string','number','boolean','json') DEFAULT 'string' COMMENT '数据类型',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
  `status` TINYINT(1) DEFAULT 1 COMMENT '启用状态：1=启用，0=禁用',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_software_var` (`softwareId`, `varName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='远程变量表';

-- =====================================================
-- 7. 远程开关表 (Remote Switches)
-- =====================================================
CREATE TABLE IF NOT EXISTS `remote_switches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `switchName` VARCHAR(50) NOT NULL COMMENT '开关名称',
  `switchKey` VARCHAR(50) NOT NULL COMMENT '开关键名',
  `switchValue` TINYINT(1) DEFAULT 0 COMMENT '开关值：1=开，0=关',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_software_key` (`softwareId`, `switchKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='远程开关表';

-- =====================================================
-- 8. 公告表 (Announcements)
-- =====================================================
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) DEFAULT NULL COMMENT '关联软件ID（NULL表示全局公告）',
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT DEFAULT NULL COMMENT '公告内容',
  `type` ENUM('info','warning','error','success') DEFAULT 'info' COMMENT '公告类型',
  `isPopup` TINYINT(1) DEFAULT 0 COMMENT '是否弹窗：1=是，0=否',
  `showOnce` TINYINT(1) DEFAULT 1 COMMENT '显示策略：1=只显示一次，0=每次启动',
  `status` TINYINT(1) DEFAULT 1 COMMENT '启用状态：1=启用，0=禁用',
  `startTime` DATETIME DEFAULT NULL COMMENT '开始时间',
  `endTime` DATETIME DEFAULT NULL COMMENT '结束时间',
  `sortOrder` INT(11) DEFAULT 0 COMMENT '排序顺序',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_status` (`status`),
  KEY `idx_time_range` (`startTime`, `endTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';

-- =====================================================
-- 9. 版本管理表 (Versions)
-- =====================================================
CREATE TABLE IF NOT EXISTS `versions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) NOT NULL COMMENT '关联软件ID',
  `version` VARCHAR(20) NOT NULL COMMENT '版本号（如：1.0.0）',
  `versionCode` INT(11) DEFAULT 0 COMMENT '版本代码（用于比较）',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '版本标题',
  `changelog` TEXT DEFAULT NULL COMMENT '更新日志',
  `downloadUrl` VARCHAR(500) DEFAULT NULL COMMENT '下载链接',
  `fileSize` VARCHAR(50) DEFAULT NULL COMMENT '文件大小',
  `fileMd5` VARCHAR(32) DEFAULT NULL COMMENT '文件MD5',
  `forceUpdate` TINYINT(1) DEFAULT 0 COMMENT '强制更新：1=是，0=否',
  `minVersion` VARCHAR(20) DEFAULT NULL COMMENT '最低兼容版本',
  `status` TINYINT(1) DEFAULT 1 COMMENT '启用状态：1=启用，0=禁用',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_software_version` (`softwareId`, `version`),
  KEY `idx_version_code` (`versionCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='版本管理表';

-- =====================================================
-- 10. 设备黑名单表 (Device Blacklist)
-- =====================================================
CREATE TABLE IF NOT EXISTS `device_blacklist` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) DEFAULT NULL COMMENT '关联软件ID（NULL表示全局黑名单）',
  `fingerprint` VARCHAR(64) NOT NULL COMMENT '设备指纹',
  `reason` VARCHAR(200) DEFAULT NULL COMMENT '封禁原因',
  `adminId` INT(11) DEFAULT NULL COMMENT '操作管理员ID',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_fingerprint` (`fingerprint`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_software_fingerprint` (`softwareId`, `fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备黑名单表';

-- =====================================================
-- 11. IP黑名单表 (IP Blacklist)
-- =====================================================
CREATE TABLE IF NOT EXISTS `ip_blacklist` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) DEFAULT NULL COMMENT '关联软件ID（NULL表示全局黑名单）',
  `ip` VARCHAR(50) NOT NULL COMMENT 'IP地址',
  `reason` VARCHAR(200) DEFAULT NULL COMMENT '封禁原因',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_ip` (`ip`),
  KEY `idx_software_id` (`softwareId`),
  KEY `idx_software_ip` (`softwareId`, `ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IP黑名单表';

-- =====================================================
-- 12. 授权日志表 (Auth Logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS `auth_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `softwareId` INT(11) DEFAULT NULL COMMENT '关联软件ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型：activate/verify/rebind等',
  `authCodeId` INT(11) DEFAULT NULL COMMENT '关联授权码ID',
  `deviceId` INT(11) DEFAULT NULL COMMENT '关联设备ID',
  `fingerprint` VARCHAR(64) DEFAULT NULL COMMENT '设备指纹',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `responseCode` INT(11) DEFAULT NULL COMMENT '响应代码',
  `responseMsg` VARCHAR(255) DEFAULT NULL COMMENT '响应消息',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`createdAt`),
  KEY `idx_software_id` (`softwareId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='授权日志表';

-- =====================================================
-- 13. 点卡扣点日志表 (Point Deduct Logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS `point_deduct_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `authCodeId` INT(11) NOT NULL COMMENT '关联授权码ID',
  `authCode` VARCHAR(50) DEFAULT NULL COMMENT '授权码',
  `deviceId` INT(11) DEFAULT NULL COMMENT '关联设备ID',
  `deductType` VARCHAR(20) DEFAULT NULL COMMENT '扣点类型',
  `deductAmount` INT(11) NOT NULL COMMENT '扣除点数',
  `remainingPoints` INT(11) NOT NULL COMMENT '剩余点数',
  `reason` VARCHAR(200) DEFAULT NULL COMMENT '扣点原因',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_auth_code_id` (`authCodeId`),
  KEY `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点卡扣点日志表';

-- =====================================================
-- 14. 系统配置表 (System Configs)
-- =====================================================
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `configKey` VARCHAR(50) NOT NULL COMMENT '配置键名',
  `configValue` TEXT NOT NULL COMMENT '配置值（JSON格式）',
  `valueType` ENUM('string','number','boolean','json') DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '配置描述',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '配置分类',
  
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- =====================================================
-- 插入默认数据
-- =====================================================

-- 插入默认管理员账号
-- 用户名: admin
-- 密码: admin123 (bcrypt hash)
INSERT INTO `admins` (`username`, `password`, `email`) VALUES
('admin', '$2b$10$Si9ix.uzZJPGVgv.LQRNsu5Ymc9Ju.i1M3m4BmMSCpHkAtRqW59N.', 'admin@example.com')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 插入默认系统配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `description`, `category`) VALUES
('heartbeat_timeout', '30', 'number', '心跳超时时长（秒）', 'heartbeat'),
('jwt_expires_in', '7200', 'number', 'JWT令牌过期时间（秒）', 'auth'),
('rate_limit_admin', '100', 'number', '管理端API速率限制（请求/15分钟）', 'security'),
('rate_limit_client_activate', '10', 'number', '客户端激活API速率限制（请求/小时）', 'security'),
('rate_limit_client_verify', '60', 'number', '客户端验证API速率限制（请求/分钟）', 'security'),
('rate_limit_heartbeat', '120', 'number', '心跳API速率限制（请求/分钟）', 'security'),
('system_name', '授权码管理系统', 'string', '系统名称', 'general'),
('system_version', '2.0.0', 'string', '系统版本', 'general')
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 安装完成
-- 数据库初始化脚本执行完毕
-- =====================================================
