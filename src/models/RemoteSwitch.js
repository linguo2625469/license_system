const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RemoteSwitch = sequelize.define('RemoteSwitch', {
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
  switchName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Switch name'
  },
  switchKey: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Switch key'
  },
  switchValue: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Switch value (on/off)'
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Switch description'
  }
}, {
  tableName: 'remote_switches',
  timestamps: true,
  indexes: [
    {
      fields: ['softwareId']
    },
    {
      fields: ['softwareId', 'switchKey']
    }
  ]
});

module.exports = RemoteSwitch;
