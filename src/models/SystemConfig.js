const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 系统配置模型
 * 存储系统运行时配置参数
 */
const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  configKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '配置键名'
  },
  configValue: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '配置值（JSON 格式）'
  },
  valueType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    comment: '值类型'
  },
  description: {
    type: DataTypes.STRING(200),
    comment: '配置描述'
  },
  category: {
    type: DataTypes.STRING(50),
    comment: '配置分类'
  }
}, {
  tableName: 'system_configs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['configKey']
    }
  ]
});

module.exports = SystemConfig;
