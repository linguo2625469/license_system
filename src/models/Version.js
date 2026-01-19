const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Version = sequelize.define('Version', {
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
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Version string (e.g., 1.0.0)'
  },
  versionCode: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Version code for comparison'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Version title'
  },
  changelog: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Changelog/release notes'
  },
  downloadUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Download URL'
  },
  fileSize: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'File size'
  },
  fileMd5: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'File MD5 hash'
  },
  forceUpdate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Force update flag'
  },
  minVersion: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Minimum compatible version'
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Version enabled status'
  }
}, {
  tableName: 'versions',
  timestamps: true,
  indexes: [
    {
      fields: ['softwareId']
    },
    {
      fields: ['softwareId', 'version']
    },
    {
      fields: ['versionCode']
    }
  ]
});

module.exports = Version;
