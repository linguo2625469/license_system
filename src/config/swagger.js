const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '授权码管理系统 API',
      version: '2.0.0',
      description: `
完整的软件授权、设备管理、云控功能 API

## 认证方式
- **管理端**: JWT Bearer Token
- **客户端**: X-App-Key Header

      `,
      contact: {
        name: 'API Support',
        email: 'admin@example.com'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发环境'
      },
      {
        url: 'https://api.example.com/api',
        description: '生产环境'
      }
    ],
    tags: [
      { name: 'Admin Auth', description: '管理端认证接口' },
      { name: 'Admin Software', description: '软件管理接口' },
      { name: 'Admin License', description: '授权码管理接口' },
      { name: 'Admin Online', description: '在线状态管理接口' },
      { name: 'Admin Cloud', description: '云控管理接口' },
      { name: 'Admin Blacklist', description: '黑名单管理接口' },
      { name: 'Admin Logs', description: '日志查询接口' },
      { name: 'Admin Config', description: '系统配置接口' },
      { name: 'Client Auth', description: '客户端授权接口' },
      { name: 'Client Heartbeat', description: '客户端心跳接口' },
      { name: 'Client Points', description: '点卡扣点接口' },
      { name: 'Client Cloud', description: '客户端云控接口' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '管理端 JWT 认证'
        },
        appKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-App-Key',
          description: '客户端 AppKey 认证'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            code: { type: 'string', example: 'SUCCESS' },
            message: { type: 'string', example: '操作成功' },
            data: { type: 'object' },
            timestamp: { type: 'integer', example: 1705564800000 }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'E0201' },
            message: { type: 'string', example: '授权码不存在' },
            data: { type: 'object', nullable: true },
            timestamp: { type: 'integer', example: 1705564800000 }
          }
        }
      }
    }
  },
  // 扫描路由文件中的注释（使用绝对路径）
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/**/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
