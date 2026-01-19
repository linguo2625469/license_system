const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  softwareId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated software ID (null for global announcements)'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Announcement title'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Announcement content'
  },
  type: {
    type: DataTypes.ENUM('info', 'warning', 'error', 'success'),
    defaultValue: 'info',
    comment: 'Announcement type'
  },
  isPopup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Show as popup'
  },
  showOnce: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Show only once'
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Announcement enabled status'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Start time'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End time'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Sort order'
  }
}, {
  tableName: 'announcements',
  timestamps: true,
  indexes: [
    {
      fields: ['softwareId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['startTime', 'endTime']
    }
  ]
});

module.exports = Announcement;
