const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OnlineSession = sequelize.define('OnlineSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associated device ID'
  },
  softwareId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associated software ID'
  },
  authCodeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associated authorization code ID'
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Session token hash'
  },
  ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP address'
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'User agent string'
  },
  isValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Session validity'
  },
  loginTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Login time'
  },
  lastHeartbeat: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last heartbeat time'
  },
  tokenExpireTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Token expiration time'
  },
  forceOffline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Force offline flag'
  }
}, {
  tableName: 'online_sessions',
  timestamps: true,
  indexes: [
    {
      fields: ['deviceId']
    },
    {
      fields: ['tokenHash']
    },
    {
      fields: ['lastHeartbeat']
    }
  ]
});

module.exports = OnlineSession;
