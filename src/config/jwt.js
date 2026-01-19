require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7200', // 2 hours in seconds
  algorithm: 'HS256'
};
