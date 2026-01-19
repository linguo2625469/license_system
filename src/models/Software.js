const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Software = sequelize.define('Software', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  appKey: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the software'
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'RSA public key'
  },
  privateKey: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'RSA private key (encrypted)'
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Software enabled status'
  },
  notice: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Software notice/announcement'
  },
  version: {
    type: DataTypes.STRING(20),
    defaultValue: '1.0.0'
  },
  downloadUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'software',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['appKey']
    }
  ]
});

module.exports = Software;
