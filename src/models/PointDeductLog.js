const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PointDeductLog = sequelize.define('PointDeductLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  authCodeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Associated authorization code ID'
  },
  authCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Authorization code'
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated device ID'
  },
  deductType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Deduction type'
  },
  deductAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Points deducted'
  },
  remainingPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Remaining points after deduction'
  },
  reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Deduction reason'
  },
  ip: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP address'
  }
}, {
  tableName: 'point_deduct_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      fields: ['authCodeId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = PointDeductLog;
