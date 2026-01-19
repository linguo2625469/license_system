const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IpBlacklist = sequelize.define('IpBlacklist', {
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
  ip: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'IP address'
  },
  reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Blacklist reason'
  }
}, {
  tableName: 'ip_blacklist',
  timestamps: true,
  indexes: [
    {
      fields: ['ip']
    },
    {
      fields: ['softwareId']
    },
    {
      fields: ['softwareId', 'ip']
    }
  ]
});

module.exports = IpBlacklist;
