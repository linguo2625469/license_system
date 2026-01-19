const sequelize = require('../config/database');

// Import all models
const Admin = require('./Admin');
const Software = require('./Software');
const AuthCode = require('./AuthCode');
const Device = require('./Device');
const OnlineSession = require('./OnlineSession');
const AuthLog = require('./AuthLog');
const PointDeductLog = require('./PointDeductLog');
const RemoteVar = require('./RemoteVar');
const RemoteSwitch = require('./RemoteSwitch');
const Announcement = require('./Announcement');
const Version = require('./Version');
const DeviceBlacklist = require('./DeviceBlacklist');
const IpBlacklist = require('./IpBlacklist');
const SystemConfig = require('./SystemConfig');

// Configure model associations

// Software (1) ──< (N) AuthCode
Software.hasMany(AuthCode, {
  foreignKey: 'softwareId',
  as: 'authCodes',
  onDelete: 'CASCADE'
});
AuthCode.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Software (1) ──< (N) Device
Software.hasMany(Device, {
  foreignKey: 'softwareId',
  as: 'devices',
  onDelete: 'CASCADE'
});
Device.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// AuthCode (1) ──< (N) Device
AuthCode.hasMany(Device, {
  foreignKey: 'authCodeId',
  as: 'devices',
  onDelete: 'SET NULL'
});
Device.belongsTo(AuthCode, {
  foreignKey: 'authCodeId',
  as: 'authCode'
});

// AuthCode (1) ──< (N) OnlineSession
AuthCode.hasMany(OnlineSession, {
  foreignKey: 'authCodeId',
  as: 'sessions',
  onDelete: 'CASCADE'
});
OnlineSession.belongsTo(AuthCode, {
  foreignKey: 'authCodeId',
  as: 'authCode'
});

// Device (1) ──< (N) OnlineSession
Device.hasMany(OnlineSession, {
  foreignKey: 'deviceId',
  as: 'sessions',
  onDelete: 'CASCADE'
});
OnlineSession.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

// Software (1) ──< (N) OnlineSession
Software.hasMany(OnlineSession, {
  foreignKey: 'softwareId',
  as: 'sessions',
  onDelete: 'CASCADE'
});
OnlineSession.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// AuthCode (1) ──< (N) PointDeductLog
AuthCode.hasMany(PointDeductLog, {
  foreignKey: 'authCodeId',
  as: 'deductLogs',
  onDelete: 'CASCADE'
});
PointDeductLog.belongsTo(AuthCode, {
  foreignKey: 'authCodeId',
  as: 'authCodeInfo'
});

// Device (1) ──< (N) PointDeductLog
Device.hasMany(PointDeductLog, {
  foreignKey: 'deviceId',
  as: 'deductLogs',
  onDelete: 'SET NULL'
});
PointDeductLog.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

// Software (1) ──< (N) RemoteVar
Software.hasMany(RemoteVar, {
  foreignKey: 'softwareId',
  as: 'remoteVars',
  onDelete: 'CASCADE'
});
RemoteVar.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Software (1) ──< (N) RemoteSwitch
Software.hasMany(RemoteSwitch, {
  foreignKey: 'softwareId',
  as: 'remoteSwitches',
  onDelete: 'CASCADE'
});
RemoteSwitch.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Software (1) ──< (N) Announcement
Software.hasMany(Announcement, {
  foreignKey: 'softwareId',
  as: 'announcements',
  onDelete: 'CASCADE'
});
Announcement.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Software (1) ──< (N) Version
Software.hasMany(Version, {
  foreignKey: 'softwareId',
  as: 'versions',
  onDelete: 'CASCADE'
});
Version.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Software (1) ──< (N) AuthLog
Software.hasMany(AuthLog, {
  foreignKey: 'softwareId',
  as: 'authLogs',
  onDelete: 'CASCADE'
});
AuthLog.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// AuthCode (1) ──< (N) AuthLog
AuthCode.hasMany(AuthLog, {
  foreignKey: 'authCodeId',
  as: 'authLogs',
  onDelete: 'SET NULL'
});
AuthLog.belongsTo(AuthCode, {
  foreignKey: 'authCodeId',
  as: 'authCode'
});

// Device (1) ──< (N) AuthLog
Device.hasMany(AuthLog, {
  foreignKey: 'deviceId',
  as: 'authLogs',
  onDelete: 'SET NULL'
});
AuthLog.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

// Software (1) ──< (N) DeviceBlacklist
Software.hasMany(DeviceBlacklist, {
  foreignKey: 'softwareId',
  as: 'deviceBlacklist',
  onDelete: 'CASCADE'
});
DeviceBlacklist.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Admin (1) ──< (N) DeviceBlacklist
Admin.hasMany(DeviceBlacklist, {
  foreignKey: 'adminId',
  as: 'deviceBlacklist',
  onDelete: 'SET NULL'
});
DeviceBlacklist.belongsTo(Admin, {
  foreignKey: 'adminId',
  as: 'admin'
});

// Software (1) ──< (N) IpBlacklist
Software.hasMany(IpBlacklist, {
  foreignKey: 'softwareId',
  as: 'ipBlacklist',
  onDelete: 'CASCADE'
});
IpBlacklist.belongsTo(Software, {
  foreignKey: 'softwareId',
  as: 'software'
});

// Export all models and sequelize instance
module.exports = {
  sequelize,
  Admin,
  Software,
  AuthCode,
  Device,
  OnlineSession,
  AuthLog,
  PointDeductLog,
  RemoteVar,
  RemoteSwitch,
  Announcement,
  Version,
  DeviceBlacklist,
  IpBlacklist,
  SystemConfig
};
