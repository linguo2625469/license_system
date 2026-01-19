const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'bcrypt hashed password'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastIp: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'admins',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['username']
    }
  ]
});

module.exports = Admin;
