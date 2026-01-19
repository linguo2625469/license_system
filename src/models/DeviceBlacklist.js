const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceBlacklist = sequelize.define('DeviceBlacklist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  softwareId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated software ID (null for global blacklist)'
  },
  fingerprint: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Device fingerprint'
  },
  reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Blacklist reason'
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin who added to blacklist'
  }
}, {
  tableName: 'device_blacklist',
  timestamps: true,
  indexes: [
    {
      fields: ['fingerprint']
    },
    {
      fields: ['softwareId']
    },
    {
      fields: ['softwareId', 'fingerprint']
    }
  ]
});

module.exports = DeviceBlacklist;
