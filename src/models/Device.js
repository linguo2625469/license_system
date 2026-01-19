const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  softwareId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associated software ID'
  },
  authCodeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated authorization code ID'
  },
  fingerprint: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Device fingerprint'
  },
  machineCode: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: 'Machine code (compatibility)'
  },
  
  // Device information
  platform: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Windows/macOS/Linux'
  },
  osVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Operating system version'
  },
  cpuId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'CPU ID'
  },
  boardSerial: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Motherboard serial number'
  },
  diskSerial: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Disk serial number'
  },
  macAddress: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MAC address'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blacklisted'),
    defaultValue: 'active',
    comment: 'Device status'
  },
  lastHeartbeat: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last heartbeat time'
  },
  lastIp: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Last IP address'
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Geographic region'
  }
}, {
  tableName: 'devices',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['fingerprint']
    },
    {
      fields: ['softwareId', 'fingerprint']
    },
    {
      fields: ['authCodeId']
    }
  ]
});

module.exports = Device;
