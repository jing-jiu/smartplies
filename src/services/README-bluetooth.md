# 蓝牙服务重构说明

## 概述

将原始的微信小程序蓝牙代码重构为Taro代码，提供了更好的类型安全、错误处理和代码组织结构。

## 主要改进

### 1. 类型安全
- 添加了完整的TypeScript接口定义
- 所有函数都有明确的返回类型
- 提供了设备、状态等接口定义

### 2. 模块化设计
- `BluetoothDeviceManager`: 负责设备搜索和连接
- `BluetoothDeviceCommunicator`: 负责设备通信
- `BluetoothManager`: 统一管理器，整合所有功能

### 3. 错误处理
- 完善的Promise错误处理
- 用户友好的错误提示
- 自动重试和恢复机制

### 4. 事件驱动
- 基于回调的事件系统
- 实时状态更新
- 消息接收处理

## 核心类说明

### BluetoothDeviceManager
负责蓝牙设备的搜索、发现和连接管理。

**主要功能：**
- 搜索蓝牙设备
- 过滤指定设备（ai-thinker）
- 管理设备列表
- 处理连接操作

**使用示例：**
```typescript
const manager = new BluetoothDeviceManager();

// 设置设备发现回调
manager.onDeviceFound((devices) => {
  console.log('发现设备:', devices);
});

// 开始搜索
await manager.startSearch();

// 连接设备
await manager.connectDevice(deviceId);
```

### BluetoothDeviceCommunicator
负责与已连接设备的通信。

**主要功能：**
- 发送消息到设备
- 接收设备消息
- 管理连接状态
- 处理服务和特征值

**使用示例：**
```typescript
const communicator = new BluetoothDeviceCommunicator(deviceId);

// 初始化通信
await communicator.initialize();

// 设置消息接收回调
communicator.onMessage((message) => {
  console.log('收到消息:', message);
});

// 发送消息
await communicator.sendMessage('Hello Device!');
```

### BluetoothManager
统一的蓝牙管理器，整合设备管理和通信功能。

**主要功能：**
- 统一的API接口
- 自动管理设备生命周期
- 简化的使用方式

**使用示例：**
```typescript
import { bluetoothManager } from '@/services/bluetooth';

// 搜索设备
await bluetoothManager.startSearch();

// 连接设备
const communicator = await bluetoothManager.connectDevice(deviceId);

// 发送消息
await bluetoothManager.sendMessage('Hello!');

// 断开连接
await bluetoothManager.disconnectCurrentDevice();
```

## 原代码对应关系

### 搜索功能对应
```javascript
// 原代码
Search: function() {
  // 复杂的搜索逻辑
}

// 新代码
await bluetoothManager.startSearch();
```

### 连接功能对应
```javascript
// 原代码
Connect: function(e) {
  // 复杂的连接逻辑
}

// 新代码
await bluetoothManager.connectDevice(deviceId, name);
```

### 发送消息对应
```javascript
// 原代码
SendTap: function() {
  // 复杂的发送逻辑
}

// 新代码
await bluetoothManager.sendMessage(message);
```

### 消息接收对应
```javascript
// 原代码
wx.onBLECharacteristicValueChange(function(res) {
  // 处理接收数据
})

// 新代码
communicator.onMessage((message) => {
  // 处理接收数据
});
```

## 在Taro页面中使用

### 1. 基础使用
```typescript
import { bluetoothManager, BluetoothDevice } from '@/services/bluetooth';

export default function BluetoothPage() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const deviceManager = bluetoothManager.getDeviceManager();
    
    deviceManager.onDeviceFound(setDevices);
    deviceManager.onStateChange((state) => setSearching(state.searching));
    
    return () => {
      bluetoothManager.destroy();
    };
  }, []);

  const handleSearch = async () => {
    await bluetoothManager.startSearch();
  };

  const handleConnect = async (deviceId: string) => {
    await bluetoothManager.connectDevice(deviceId);
  };

  return (
    <View>
      <Button onClick={handleSearch}>
        {searching ? '停止搜索' : '开始搜索'}
      </Button>
      {devices.map(device => (
        <View key={device.deviceId} onClick={() => handleConnect(device.deviceId)}>
          {device.name}
        </View>
      ))}
    </View>
  );
}
```

### 2. 使用控制器模式
```typescript
import { BluetoothPageController } from '@/services/bluetooth-example';

export default function BluetoothPage() {
  const [controller] = useState(() => new BluetoothPageController());
  
  // 使用控制器的方法和回调
  // 参考 bluetooth-example.ts 中的完整示例
}
```

## 配置说明

### 服务UUID配置
```typescript
// 标准服务UUID（默认）
const STANDARD_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';
const WRITE_CHARACTERISTIC_UUID = '49535343-8841-43F4-A8D4-ECBE34729BB3';
const NOTIFY_CHARACTERISTIC_UUID = '49535343-1E4D-4BD9-BA61-23C647249616';

// 通知服务UUID（备用）
const NOTIFY_SERVICE_UUID = '5833FF01-9B8B-5191-6142-22A4536EF123';
```

### 设备过滤配置
默认只搜索名称为 'ai-thinker' 的设备，可以在 `BluetoothDeviceManager` 中修改过滤逻辑。

## 注意事项

1. **权限要求**: 确保应用有蓝牙权限
2. **平台兼容**: 代码兼容微信小程序、H5、React Native等Taro支持的平台
3. **错误处理**: 所有异步操作都应该用try-catch包装
4. **资源清理**: 页面卸载时记得调用destroy方法清理资源
5. **连接管理**: 同时只能连接一个设备，连接新设备会自动断开旧设备

## 迁移指南

### 从原代码迁移步骤

1. **替换导入**:
   ```typescript
   import { bluetoothManager } from '@/services/bluetooth';
   ```

2. **替换搜索逻辑**:
   ```typescript
   // 替换 Search 函数
   await bluetoothManager.startSearch();
   ```

3. **替换连接逻辑**:
   ```typescript
   // 替换 Connect 函数
   await bluetoothManager.connectDevice(deviceId, name);
   ```

4. **替换发送逻辑**:
   ```typescript
   // 替换 SendTap 函数
   await bluetoothManager.sendMessage(message);
   ```

5. **替换事件监听**:
   ```typescript
   // 替换 wx.onBluetoothDeviceFound 等
   bluetoothManager.getDeviceManager().onDeviceFound(callback);
   ```

这样重构后的代码具有更好的可维护性、类型安全性和错误处理能力。