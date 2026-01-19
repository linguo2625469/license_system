# 授权码管理系统 API 文档

## 概述

本文档描述授权码管理系统的 RESTful API 接口。系统分为管理端 API 和客户端 API 两部分。

### 基础信息

- **基础 URL**: `http://your-domain.com/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

### 统一响应格式

#### 成功响应

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1705564800000
}
```

#### 错误响应

```json
{
  "success": false,
  "code": "E0201",
  "message": "授权码不存在",
  "data": null,
  "timestamp": 1705564800000
}
```

### 错误码说明

#### 认证错误 (E01XX)

- `E0101`: 用户名或密码错误
- `E0102`: JWT 令牌无效
- `E0103`: JWT 令牌已过期
- `E0104`: AppKey 无效
- `E0105`: 软件已禁用

#### 授权码错误 (E02XX)

- `E0201`: 授权码不存在
- `E0202`: 授权码已过期
- `E0203`: 授权码已被禁用
- `E0204`: 设备数量已达上限
- `E0205`: 换绑次数已达上限
- `E0206`: 点数不足
- `E0207`: 授权码未激活

#### 设备错误 (E03XX)

- `E0301`: 设备指纹格式无效
- `E0302`: 设备未绑定
- `E0303`: 设备已在黑名单
- `E0304`: IP 已在黑名单

#### 心跳错误 (E04XX)

- `E0401`: 会话不存在
- `E0402`: 会话已过期
- `E0403`: 设备已被强制下线

#### 系统错误 (E99XX)

- `E9901`: 数据库错误
- `E9902`: 参数验证失败
- `E9903`: 请求频率过高
- `E9999`: 未知错误

---

## 管理端 API

管理端 API 需要 JWT 认证。在请求头中包含：
```
Authorization: Bearer {jwt_token}
```

### 1. 认证接口

#### 1.1 管理员登录

**POST** `/admin/auth/login`

登录并获取 JWT 令牌。

**请求体**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com"
    }
  }
}
```

#### 1.2 管理员登出

**POST** `/admin/auth/logout`

登出当前会话。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 2. 软件管理接口

#### 2.1 创建软件

**POST** `/admin/software`

创建新软件并生成 AppKey 和 RSA 密钥对。

**认证**: 需要 JWT

**请求体**:
```json
{
  "name": "我的软件",
  "notice": "欢迎使用",
  "version": "1.0.0"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "我的软件",
    "appKey": "a1b2c3d4e5f6...",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
    "status": true,
    "version": "1.0.0"
  }
}
```

#### 2.2 获取软件列表

**GET** `/admin/software`

获取所有软件列表。

**认证**: 需要 JWT

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "我的软件",
        "appKey": "a1b2c3d4e5f6...",
        "status": true,
        "version": "1.0.0",
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 2.3 获取软件详情

**GET** `/admin/software/:id`

获取指定软件的详细信息。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "我的软件",
    "appKey": "a1b2c3d4e5f6...",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
    "status": true,
    "notice": "欢迎使用",
    "version": "1.0.0"
  }
}
```

#### 2.4 更新软件

**PUT** `/admin/software/:id`

更新软件信息。

**认证**: 需要 JWT

**请求体**:
```json
{
  "name": "我的软件 v2",
  "notice": "更新公告",
  "status": true,
  "version": "2.0.0"
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

#### 2.5 删除软件

**DELETE** `/admin/software/:id`

删除软件及其所有关联数据。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 3. 授权码管理接口

#### 3.1 批量生成授权码

**POST** `/admin/licenses/generate`

批量生成授权码。

**认证**: 需要 JWT

**请求体（时长卡）**:
```json
{
  "softwareId": 1,
  "count": 10,
  "isPointCard": false,
  "cardType": "month",
  "duration": 1,
  "activateMode": "first_use",
  "maxDevices": 1,
  "allowRebind": 3,
  "singleOnline": true,
  "remark": "测试授权码"
}
```

**请求体（点卡）**:
```json
{
  "softwareId": 1,
  "count": 10,
  "isPointCard": true,
  "totalPoints": 100,
  "deductType": "per_use",
  "deductAmount": 1,
  "maxDevices": 1,
  "allowRebind": 3,
  "singleOnline": true,
  "remark": "测试点卡"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "codes": [
      "ABC123-DEF456-GHI789",
      "JKL012-MNO345-PQR678"
    ],
    "count": 10
  }
}
```

#### 3.2 获取授权码列表

**GET** `/admin/licenses`

获取授权码列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId` (可选): 软件 ID
- `status` (可选): 状态 (unused/active/expired/disabled)
- `isPointCard` (可选): 是否点卡 (true/false)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "code": "ABC123-DEF456-GHI789",
        "softwareId": 1,
        "isPointCard": false,
        "cardType": "month",
        "duration": 1,
        "status": "active",
        "maxDevices": 1,
        "usedTime": "2024-01-18T10:00:00.000Z",
        "expireTime": "2024-02-18T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 3.3 获取授权码详情

**GET** `/admin/licenses/:id`

获取授权码详细信息，包括绑定的设备列表。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "ABC123-DEF456-GHI789",
    "softwareId": 1,
    "isPointCard": false,
    "cardType": "month",
    "duration": 1,
    "status": "active",
    "maxDevices": 1,
    "allowRebind": 3,
    "rebindCount": 0,
    "singleOnline": true,
    "usedTime": "2024-01-18T10:00:00.000Z",
    "expireTime": "2024-02-18T10:00:00.000Z",
    "devices": [
      {
        "id": 1,
        "fingerprint": "abc123...",
        "platform": "Windows",
        "osVersion": "10.0.19041",
        "lastHeartbeat": "2024-01-18T12:00:00.000Z",
        "status": "active"
      }
    ]
  }
}
```

#### 3.4 更新授权码

**PUT** `/admin/licenses/:id`

更新授权码配置。

**认证**: 需要 JWT

**请求体**:
```json
{
  "status": "disabled",
  "maxDevices": 2,
  "allowRebind": 5,
  "remark": "更新备注"
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

#### 3.5 删除授权码

**DELETE** `/admin/licenses/:id`

删除授权码并解绑所有设备。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 3.6 强制解绑设备

**POST** `/admin/licenses/:id/unbind`

管理员强制解绑设备（不计入换绑次数）。

**认证**: 需要 JWT

**请求体**:
```json
{
  "deviceId": 1
}
```

**响应**:
```json
{
  "success": true,
  "message": "解绑成功"
}
```

---

### 4. 设备管理接口

#### 4.1 获取设备列表

**GET** `/admin/devices`

获取设备列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId` (可选): 软件 ID
- `authCodeId` (可选): 授权码 ID
- `status` (可选): 状态 (active/inactive/blacklisted)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "fingerprint": "abc123...",
        "platform": "Windows",
        "osVersion": "10.0.19041",
        "authCode": "ABC123-DEF456-GHI789",
        "lastHeartbeat": "2024-01-18T12:00:00.000Z",
        "lastIp": "192.168.1.100",
        "status": "active"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### 5. 黑名单管理接口

#### 5.1 添加设备到黑名单

**POST** `/admin/blacklist/device`

将设备指纹添加到黑名单。

**认证**: 需要 JWT

**请求体**:
```json
{
  "fingerprint": "abc123...",
  "reason": "违规使用",
  "softwareId": 1
}
```

**响应**:
```json
{
  "success": true,
  "message": "添加成功"
}
```

#### 5.2 移除设备黑名单

**DELETE** `/admin/blacklist/device/:id`

从黑名单移除设备。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "移除成功"
}
```

#### 5.3 添加 IP 到黑名单

**POST** `/admin/blacklist/ip`

将 IP 地址添加到黑名单。

**认证**: 需要 JWT

**请求体**:
```json
{
  "ip": "192.168.1.100",
  "reason": "恶意访问",
  "softwareId": 1
}
```

**响应**:
```json
{
  "success": true,
  "message": "添加成功"
}
```

#### 5.4 移除 IP 黑名单

**DELETE** `/admin/blacklist/ip/:id`

从黑名单移除 IP。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "移除成功"
}
```

#### 5.5 获取黑名单列表

**GET** `/admin/blacklist`

获取设备和 IP 黑名单列表。

**认证**: 需要 JWT

**查询参数**:
- `type` (可选): 类型 (device/ip)
- `softwareId` (可选): 软件 ID
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": 1,
        "fingerprint": "abc123...",
        "reason": "违规使用",
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "ips": [
      {
        "id": 1,
        "ip": "192.168.1.100",
        "reason": "恶意访问",
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 6. 在线状态管理接口

#### 6.1 获取在线设备列表

**GET** `/admin/online`

获取当前在线的设备列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId` (可选): 软件 ID
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "deviceId": 1,
        "fingerprint": "abc123...",
        "authCode": "ABC123-DEF456-GHI789",
        "ip": "192.168.1.100",
        "loginTime": "2024-01-18T10:00:00.000Z",
        "lastHeartbeat": "2024-01-18T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 6.2 强制设备下线

**POST** `/admin/online/:sessionId/offline`

强制指定设备下线。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "强制下线成功"
}
```

---

### 7. 云控管理接口

#### 7.1 远程变量管理

##### 7.1.1 创建远程变量

**POST** `/admin/cloud/vars`

创建远程变量。

**认证**: 需要 JWT

**请求体**:
```json
{
  "softwareId": 1,
  "varName": "api_url",
  "varValue": "https://api.example.com",
  "varType": "string",
  "description": "API 地址"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "varName": "api_url",
    "varValue": "https://api.example.com",
    "varType": "string"
  }
}
```

##### 7.1.2 获取远程变量列表

**GET** `/admin/cloud/vars`

获取远程变量列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId`: 软件 ID（必需）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "varName": "api_url",
      "varValue": "https://api.example.com",
      "varType": "string",
      "status": true
    }
  ]
}
```

##### 7.1.3 更新远程变量

**PUT** `/admin/cloud/vars/:id`

更新远程变量。

**认证**: 需要 JWT

**请求体**:
```json
{
  "varValue": "https://api2.example.com",
  "status": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

##### 7.1.4 删除远程变量

**DELETE** `/admin/cloud/vars/:id`

删除远程变量。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 7.2 远程开关管理

##### 7.2.1 创建远程开关

**POST** `/admin/cloud/switches`

创建远程开关。

**认证**: 需要 JWT

**请求体**:
```json
{
  "softwareId": 1,
  "switchName": "功能开关",
  "switchKey": "feature_enabled",
  "switchValue": true,
  "description": "控制某功能开关"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "switchName": "功能开关",
    "switchKey": "feature_enabled",
    "switchValue": true
  }
}
```

##### 7.2.2 获取远程开关列表

**GET** `/admin/cloud/switches`

获取远程开关列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId`: 软件 ID（必需）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "switchName": "功能开关",
      "switchKey": "feature_enabled",
      "switchValue": true
    }
  ]
}
```

##### 7.2.3 更新远程开关

**PUT** `/admin/cloud/switches/:id`

更新远程开关状态。

**认证**: 需要 JWT

**请求体**:
```json
{
  "switchValue": false
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

##### 7.2.4 删除远程开关

**DELETE** `/admin/cloud/switches/:id`

删除远程开关。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 7.3 公告管理

##### 7.3.1 创建公告

**POST** `/admin/cloud/announcements`

创建公告。

**认证**: 需要 JWT

**请求体**:
```json
{
  "softwareId": 1,
  "title": "系统维护通知",
  "content": "系统将于今晚 22:00 进行维护",
  "type": "warning",
  "isPopup": true,
  "showOnce": true,
  "startTime": "2024-01-18T00:00:00.000Z",
  "endTime": "2024-01-19T00:00:00.000Z"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "系统维护通知",
    "type": "warning"
  }
}
```

##### 7.3.2 获取公告列表

**GET** `/admin/cloud/announcements`

获取公告列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId`: 软件 ID（必需）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "系统维护通知",
      "content": "系统将于今晚 22:00 进行维护",
      "type": "warning",
      "isPopup": true,
      "status": true,
      "startTime": "2024-01-18T00:00:00.000Z",
      "endTime": "2024-01-19T00:00:00.000Z"
    }
  ]
}
```

##### 7.3.3 更新公告

**PUT** `/admin/cloud/announcements/:id`

更新公告。

**认证**: 需要 JWT

**请求体**:
```json
{
  "title": "系统维护通知（更新）",
  "status": false
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

##### 7.3.4 删除公告

**DELETE** `/admin/cloud/announcements/:id`

删除公告。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

#### 7.4 版本管理

##### 7.4.1 创建版本

**POST** `/admin/cloud/versions`

创建新版本。

**认证**: 需要 JWT

**请求体**:
```json
{
  "softwareId": 1,
  "version": "2.0.0",
  "versionCode": 200,
  "title": "重大更新",
  "changelog": "1. 新增功能 A\n2. 修复 Bug B",
  "downloadUrl": "https://example.com/download/v2.0.0.exe",
  "fileSize": "50MB",
  "fileMd5": "abc123...",
  "forceUpdate": false,
  "minVersion": "1.5.0"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "version": "2.0.0",
    "versionCode": 200
  }
}
```

##### 7.4.2 获取版本列表

**GET** `/admin/cloud/versions`

获取版本列表。

**认证**: 需要 JWT

**查询参数**:
- `softwareId`: 软件 ID（必需）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "version": "2.0.0",
      "versionCode": 200,
      "title": "重大更新",
      "forceUpdate": false,
      "status": true,
      "createdAt": "2024-01-18T10:00:00.000Z"
    }
  ]
}
```

##### 7.4.3 更新版本

**PUT** `/admin/cloud/versions/:id`

更新版本信息。

**认证**: 需要 JWT

**请求体**:
```json
{
  "forceUpdate": true,
  "status": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

##### 7.4.4 删除版本

**DELETE** `/admin/cloud/versions/:id`

删除版本。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 8. 日志查询接口

#### 8.1 获取授权日志

**GET** `/admin/logs/auth`

获取授权操作日志。

**认证**: 需要 JWT

**查询参数**:
- `softwareId` (可选): 软件 ID
- `action` (可选): 操作类型 (activate/verify/rebind)
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "action": "activate",
        "authCode": "ABC123-DEF456-GHI789",
        "fingerprint": "abc123...",
        "ip": "192.168.1.100",
        "responseCode": 200,
        "responseMsg": "激活成功",
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 8.2 获取扣点日志

**GET** `/admin/logs/points`

获取点卡扣点日志。

**认证**: 需要 JWT

**查询参数**:
- `authCodeId` (可选): 授权码 ID
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": 1,
        "authCode": "ABC123-DEF456-GHI789",
        "deductType": "per_use",
        "deductAmount": 1,
        "remainingPoints": 99,
        "reason": "使用功能",
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### 9. 系统配置接口

#### 9.1 获取系统配置

**GET** `/admin/config`

获取系统配置。

**认证**: 需要 JWT

**响应**:
```json
{
  "success": true,
  "data": {
    "heartbeatTimeout": 30,
    "jwtExpiresIn": 7200,
    "rateLimitWindow": 900,
    "rateLimitMax": 100
  }
}
```

#### 9.2 更新系统配置

**PUT** `/admin/config`

更新系统配置。

**认证**: 需要 JWT

**请求体**:
```json
{
  "heartbeatTimeout": 60,
  "jwtExpiresIn": 3600
}
```

**响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

## 客户端 API

客户端 API 需要在请求头中包含 AppKey：
```
X-App-Key: {your_app_key}
```

部分接口还需要会话令牌：
```
Authorization: Bearer {session_token}
```

### 1. 授权接口

#### 1.1 激活授权码

**POST** `/client/auth/activate`

使用授权码激活并绑定设备。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**请求体**:
```json
{
  "code": "ABC123-DEF456-GHI789",
  "fingerprint": "abc123...",
  "deviceInfo": {
    "platform": "Windows",
    "osVersion": "10.0.19041",
    "cpuId": "BFEBFBFF000906E9",
    "boardSerial": "L1HF65E00X9",
    "diskSerial": "S3Z9NX0M123456",
    "macAddress": "00:11:22:33:44:55"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "session-token-uuid",
    "authCode": {
      "code": "ABC123-DEF456-GHI789",
      "isPointCard": false,
      "expireTime": "2024-02-18T10:00:00.000Z",
      "maxDevices": 1,
      "singleOnline": true
    }
  }
}
```

#### 1.2 验证授权状态

**POST** `/client/auth/verify`

验证当前授权是否有效。

**请求头**:
- `X-App-Key`: 软件的 AppKey
- `Authorization`: Bearer {session_token}

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "expireTime": "2024-02-18T10:00:00.000Z",
    "remainingPoints": null
  }
}
```

#### 1.3 设备换绑

**POST** `/client/auth/rebind`

将授权码从旧设备换绑到新设备。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**请求体**:
```json
{
  "code": "ABC123-DEF456-GHI789",
  "oldFingerprint": "old-fingerprint",
  "newFingerprint": "new-fingerprint",
  "deviceInfo": {
    "platform": "Windows",
    "osVersion": "10.0.19041",
    "cpuId": "BFEBFBFF000906E9",
    "boardSerial": "L1HF65E00X9",
    "diskSerial": "S3Z9NX0M123456",
    "macAddress": "00:11:22:33:44:55"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "new-session-token-uuid",
    "rebindCount": 1,
    "allowRebind": 3
  }
}
```

---

### 2. 心跳接口

#### 2.1 发送心跳

**POST** `/client/heartbeat`

客户端定期发送心跳保持在线状态。

**请求头**:
- `X-App-Key`: 软件的 AppKey
- `Authorization`: Bearer {session_token}

**响应**:
```json
{
  "success": true,
  "data": {
    "online": true,
    "serverTime": 1705564800000
  }
}
```

**建议**: 客户端应每 15-20 秒发送一次心跳。

---

### 3. 点卡扣点接口

#### 3.1 扣除点数

**POST** `/client/points/deduct`

扣除点卡点数。

**请求头**:
- `X-App-Key`: 软件的 AppKey
- `Authorization`: Bearer {session_token}

**请求体**:
```json
{
  "amount": 1,
  "reason": "使用功能 A"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "deductAmount": 1,
    "remainingPoints": 99,
    "totalPoints": 100
  }
}
```

---

### 4. 云控接口

#### 4.1 获取远程变量

**GET** `/client/cloud/vars`

获取该软件的所有远程变量。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "varName": "api_url",
      "varValue": "https://api.example.com",
      "varType": "string"
    },
    {
      "varName": "max_retry",
      "varValue": 3,
      "varType": "number"
    },
    {
      "varName": "config",
      "varValue": {
        "timeout": 5000,
        "debug": false
      },
      "varType": "json"
    }
  ]
}
```

#### 4.2 获取远程开关

**GET** `/client/cloud/switches`

获取该软件的所有远程开关。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "switchKey": "feature_enabled",
      "switchValue": true,
      "switchName": "功能开关"
    },
    {
      "switchKey": "debug_mode",
      "switchValue": false,
      "switchName": "调试模式"
    }
  ]
}
```

#### 4.3 获取公告列表

**GET** `/client/cloud/announcements`

获取当前有效的公告列表。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "系统维护通知",
      "content": "系统将于今晚 22:00 进行维护",
      "type": "warning",
      "isPopup": true,
      "showOnce": true,
      "startTime": "2024-01-18T00:00:00.000Z",
      "endTime": "2024-01-19T00:00:00.000Z"
    }
  ]
}
```

#### 4.4 检查版本更新

**GET** `/client/cloud/version/check`

检查是否有新版本。

**请求头**:
- `X-App-Key`: 软件的 AppKey

**查询参数**:
- `currentVersion`: 当前版本号（如 "1.0.0"）

**响应（有更新）**:
```json
{
  "success": true,
  "data": {
    "hasUpdate": true,
    "version": "2.0.0",
    "versionCode": 200,
    "title": "重大更新",
    "changelog": "1. 新增功能 A\n2. 修复 Bug B",
    "downloadUrl": "https://example.com/download/v2.0.0.exe",
    "fileSize": "50MB",
    "fileMd5": "abc123...",
    "forceUpdate": false
  }
}
```

**响应（无更新）**:
```json
{
  "success": true,
  "data": {
    "hasUpdate": false,
    "message": "当前已是最新版本"
  }
}
```

---

## 附录

### A. 授权码类型说明

#### 时长卡 (isPointCard: false)

时长卡按时间计费，支持以下类型：
- `minute`: 分钟
- `hour`: 小时
- `day`: 天
- `week`: 周
- `month`: 月
- `quarter`: 季度
- `year`: 年
- `permanent`: 永久

激活模式：
- `first_use`: 首次使用激活（激活时开始计时）
- `scheduled`: 定时激活（预设开始和结束时间）

#### 点卡 (isPointCard: true)

点卡按点数计费，支持以下扣点类型：
- `per_use`: 按次数扣点
- `per_hour`: 按小时扣点
- `per_day`: 按天扣点

### B. 设备指纹生成

设备指纹基于以下硬件信息生成：
- CPU ID
- 主板序列号
- 硬盘序列号
- MAC 地址
- 操作系统平台

生成算法：
```
fingerprint = SHA256(cpuId + '|' + boardSerial + '|' + diskSerial + '|' + macAddress + '|' + platform)
```

### C. 速率限制

不同 API 的速率限制：
- 管理端 API: 100 请求/15分钟/IP
- 客户端激活 API: 10 请求/小时/IP
- 客户端验证 API: 60 请求/分钟/IP
- 心跳 API: 120 请求/分钟/IP

### D. 安全建议

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **AppKey 保护**: 不要在客户端代码中明文硬编码 AppKey
3. **设备指纹**: 确保设备指纹采集的准确性和唯一性
4. **心跳间隔**: 建议 15-20 秒发送一次心跳
5. **错误处理**: 客户端应妥善处理所有错误响应
6. **令牌存储**: 会话令牌应安全存储，避免泄露

---

**文档版本**: 1.0.0  
**最后更新**: 2024-01-18
