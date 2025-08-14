# 云函数部署说明

## 云函数列表

### 1. syncDeviceInfo
**功能**: 同步设备信息到云数据库，支持创建、更新和删除操作

**参数**:
- `deviceInfo`: 设备信息对象
- `operation`: 操作类型，'delete' 表示删除操作

**返回值**:
```json
{
  "success": true/false,
  "message": "操作结果描述",
  "data": "操作结果数据"
}
```

### 2. getUserDevices
**功能**: 获取用户的设备列表（排除已删除的设备）

**参数**: 无

**返回值**:
```json
{
  "success": true/false,
  "message": "操作结果描述",
  "data": [设备列表数组]
}
```

## 部署步骤

1. 在微信开发者工具中打开云开发控制台
2. 进入云函数管理页面
3. 分别上传 `syncDeviceInfo` 和 `getUserDevices` 两个云函数
4. 确保云数据库中有 `devices` 集合

## 数据库结构

### devices 集合字段说明:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户openid（自动添加）
- `id`: 设备ID
- `name`: 设备名称
- `deviceId`: 蓝牙设备ID
- `connected`: 连接状态
- `powerOn`: 电源状态
- `mode`: 设备模式
- `serialNumber`: 序列号
- `deleted`: 是否已删除（boolean）
- `deletedAt`: 删除时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 权限设置

确保云函数和数据库的权限设置正确：
- 云函数：仅创建者可读写
- 数据库：仅创建者可读写

## 测试

部署完成后，可以在小程序中测试：
1. 添加设备
2. 删除设备
3. 下拉刷新设备列表

如果遇到问题，请检查：
1. 云函数是否正确部署
2. 数据库权限是否正确设置
3. 网络连接是否正常