const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuthLog = sequelize.define('AuthLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  softwareId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated software ID'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action type: activate, verify, rebind, etc.'
  },
  authCodeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated authorization code ID'
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated device ID'
  },
  fingerprint: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Device fingerprint'
  },
  ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP address'
  },
  responseCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Response code'
  },
  responseMsg: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Response message'
  }
}, {
  tableName: 'auth_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      fields: ['createdAt']
    },
    {
      fields: ['softwareId']
    }
  ]
});

module.exports = AuthLog;
