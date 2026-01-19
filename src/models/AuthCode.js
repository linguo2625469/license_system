const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuthCode = sequelize.define('AuthCode', {
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
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Authorization code'
  },
  
  // Authorization type
  isPointCard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'false=time card, true=point card'
  },
  
  // Time card fields
  cardType: {
    type: DataTypes.ENUM('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year', 'permanent'),
    allowNull: true,
    comment: 'Time card duration type'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration value'
  },
  activateMode: {
    type: DataTypes.ENUM('first_use', 'scheduled'),
    defaultValue: 'first_use',
    comment: 'Activation mode'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Start time for scheduled activation'
  },
  expireTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration time'
  },
  
  // Point card fields
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total points'
  },
  remainingPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Remaining points'
  },
  deductType: {
    type: DataTypes.ENUM('per_use', 'per_hour', 'per_day'),
    allowNull: true,
    comment: 'Point deduction type'
  },
  deductAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Points deducted per operation'
  },
  
  // Device management
  maxDevices: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Maximum number of devices'
  },
  allowRebind: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Allowed rebind count'
  },
  rebindCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current rebind count'
  },
  
  // Online control
  singleOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Single sign-on mode'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('unused', 'active', 'expired', 'disabled'),
    defaultValue: 'unused',
    comment: 'Authorization code status'
  },
  usedTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'First use time'
  },
  remark: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Remark'
  }
}, {
  tableName: 'auth_codes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code']
    },
    {
      fields: ['softwareId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expireTime']
    }
  ]
});

module.exports = AuthCode;
