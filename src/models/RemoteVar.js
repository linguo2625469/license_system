const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RemoteVar = sequelize.define('RemoteVar', {
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
  varName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Variable name'
  },
  varValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Variable value'
  },
  varType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    comment: 'Variable data type'
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Variable description'
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Variable enabled status'
  }
}, {
  tableName: 'remote_vars',
  timestamps: true,
  indexes: [
    {
      fields: ['softwareId']
    },
    {
      fields: ['softwareId', 'varName']
    }
  ]
});

module.exports = RemoteVar;
