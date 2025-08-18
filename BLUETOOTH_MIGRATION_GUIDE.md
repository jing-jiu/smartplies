# 蓝牙服务迁移指南

## 概述

本次重构将原始的微信小程序蓝牙代码完全重写为现代化的Taro TypeScript代码，提供了更好的类型安全、错误处理和代码组织结构。

## 主要变更

### 1. 新的API结构

#### 旧的API (已废弃)
```typescript
import { sendCommand, connectToDevice, initBluetooth } from './bluetooth';

// 旧的使用方式
await initBluetooth();
await connectToDevice(deviceId);
await sendCommand(deviceId, command);
```

#### 新的API (推荐使用)
```typescript
import { bluetoothManager } from './bluetooth';

// 新的使用方式
await bluetoothManager.startSearch();
const communicator = await bluetoothManager.connectDevice(deviceId);
await bluetoothManager.sendMessage(command);
```

### 2. 文件更改清单

#### 已修改的文件：

1. **src/services/bluetooth.ts** - 完全重构
   - 添加了新的类型定义
   - 实现了模块化的类结构
   - 提供了统一的bluetoothManager接口

2. **src/stores/deviceStore.ts** - 更新蓝牙API调用
   - `sendCommand` → `bluetoothManager.sendMessage`

3. **src/pages/device/manage.tsx** - 更新蓝牙API调用
   - `sendCommand` → `bluetoothManager.sendMessage`
   - `disconnectBluetoothCompletely` → `bluetoothManager.disconnectCurrentDevice`

4. **src/pages/index/index.tsx** - 重写蓝牙逻辑
   - 完全重写了设备搜索和连接逻辑
   - 使用新的bluetoothManager API
   - 简化了事件处理机制

#### 新增的文件：

1. **src/services/bluetooth-example.ts** - 使用示例和控制器模式
2. **src/services/bluetooth-test.ts** - 测试工具
3. **src/services/README-bluetooth.md** - 详细文档
4. **BLUETOOTH_MIGRATION_GUIDE.md** - 本迁移指南

### 3. API对照表

| 旧API | 新API | 说明 |
|-------|-------|------|
| `initBluetooth()` | `bluetoothManager.getDeviceManager()` | 初始化改为自动管理 |
| `startDiscover()` | `bluetoothManager.startSearch()` | 开始搜索设备 |
| `stopDiscover()` | `bluetoothManager.stopSearch()` | 停止搜索设备 |
| `connectToDevice(deviceId)` | `bluetoothManager.connectDevice(deviceId)` | 连接设备 |
| `sendCommand(deviceId, cmd)` | `bluetoothManager.sendMessage(cmd)` | 发送消息 |
| `disconnectDevice(deviceId)` | `bluetoothManager.disconnectCurrentDevice()` | 断开连接 |
| `disconnectBluetoothCompletely()` | `bluetoothManager.reset()` | 完全重置 |
| `addMessageListener(callback)` | `communicator.onMessage(callback)` | 消息监听 |

### 4. 核心类说明

#### BluetoothDeviceManager
- 负责设备搜索和发现
- 管理设备列表
- 处理蓝牙适配器状态

#### BluetoothDeviceCommunicator  
- 负责设备通信
- 处理消息发送和接收
- 管理连接状态

#### BluetoothManager
- 统一的管理接口
- 整合设备管理和通信功能
- 提供简化的API

### 5. 事件处理变更

#### 旧的事件处理
```typescript
// 旧方式 - 直接使用微信API
Taro.onBluetoothDeviceFound((res) => {
  // 处理设备发现
});

Taro.onBLECharacteristicValueChange((res) => {
  // 处理消息接收
});
```

#### 新的事件处理
```typescript
// 新方式 - 使用回调函数
const deviceManager = bluetoothManager.getDeviceManager();
deviceManager.onDeviceFound((devices) => {
  // 处理设备发现
});

const communicator = await bluetoothManager.connectDevice(deviceId);
communicator.onMessage((message) => {
  // 处理消息接收
});
```

### 6. 错误处理改进

#### 旧的错误处理
```typescript
// 旧方式 - 基本的成功/失败回调
wx.createBLEConnection({
  deviceId,
  success: (res) => { /* 处理成功 */ },
  fail: (err) => { /* 处理失败 */ }
});
```

#### 新的错误处理
```typescript
// 新方式 - Promise和async/await
try {
  const communicator = await bluetoothManager.connectDevice(deviceId);
  // 连接成功
} catch (error) {
  // 统一的错误处理
  console.error('连接失败:', error.message);
}
```

### 7. 类型安全改进

#### 新增的类型定义
```typescript
interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI: number;
  advertisData?: ArrayBuffer;
  // ...更多属性
}

interface BluetoothState {
  searching: boolean;
  available: boolean;
  discovering: boolean;
}

interface ConnectionState {
  deviceId: string;
  connected: boolean;
}
```

### 8. 迁移步骤

#### 步骤1: 更新导入语句
```typescript
// 旧的导入
import { sendCommand, connectToDevice } from './bluetooth';

// 新的导入
import { bluetoothManager } from './bluetooth';
```

#### 步骤2: 更新初始化代码
```typescript
// 旧的初始化
useLoad(() => {
  initBluetooth().then(() => {
    console.log('蓝牙初始化成功');
  });
});

// 新的初始化
useLoad(() => {
  const deviceManager = bluetoothManager.getDeviceManager();
  deviceManager.onDeviceFound((devices) => {
    // 处理设备发现
  });
});
```

#### 步骤3: 更新设备连接代码
```typescript
// 旧的连接方式
await connectToDevice(deviceId);
await enableMessageReceiving(deviceId);
addMessageListener(messageHandler);

// 新的连接方式
const communicator = await bluetoothManager.connectDevice(deviceId);
communicator.onMessage(messageHandler);
```

#### 步骤4: 更新消息发送代码
```typescript
// 旧的发送方式
await sendCommand(deviceId, command);

// 新的发送方式
await bluetoothManager.sendMessage(command);
```

#### 步骤5: 更新断开连接代码
```typescript
// 旧的断开方式
await disconnectBluetoothCompletely(deviceId);

// 新的断开方式
await bluetoothManager.disconnectCurrentDevice();
```

### 9. 兼容性说明

- 新的API完全向后兼容
- 旧的API仍然可用，但标记为废弃
- 建议逐步迁移到新API
- 新功能只在新API中提供

### 10. 测试验证

使用提供的测试工具验证迁移结果：

```typescript
import { bluetoothTester } from '@/services/bluetooth-test';

// 运行完整测试
await bluetoothTester.runFullTest();

// 检查测试结果
console.log(bluetoothTester.getStatus());
```

### 11. 性能优化

新的实现包含以下性能优化：

1. **连接池管理** - 避免重复连接
2. **自动重试机制** - 提高连接成功率
3. **内存管理** - 自动清理资源
4. **事件去重** - 避免重复处理
5. **MTU优化** - 提高传输效率

### 12. 故障排除

#### 常见问题及解决方案：

1. **设备连接失败**
   ```typescript
   // 尝试重置蓝牙管理器
   await bluetoothManager.reset();
   ```

2. **消息发送失败**
   ```typescript
   // 检查设备连接状态
   if (!bluetoothManager.hasConnectedDevice()) {
     // 重新连接设备
   }
   ```

3. **设备搜索无结果**
   ```typescript
   // 检查设备过滤条件
   // 默认只搜索名称为 'ai-thinker' 的设备
   ```

4. **"no characteristic" 错误**
   
   这是最常见的错误，通常是因为设备的服务结构与预期不符。解决方案：
   
   ```typescript
   // 使用调试工具查看设备服务结构
   import { BluetoothDebugger } from '@/services/bluetooth-debug';
   
   // 调试设备服务和特征值
   await BluetoothDebugger.debugDeviceServices(deviceId);
   
   // 查找最佳服务特征值组合
   const best = await BluetoothDebugger.findBestServiceCharacteristics(deviceId);
   if (best) {
     console.log('推荐使用的服务配置:', best);
   }
   ```

5. **通知启用失败**
   ```typescript
   // 测试特定特征值的通知功能
   await BluetoothDebugger.testNotification(deviceId, serviceId, characteristicId);
   ```

6. **特征值不存在**
   
   新的实现会自动查找可用的特征值，如果仍然失败：
   
   ```typescript
   // 手动指定特征值
   const communicator = new BluetoothDeviceCommunicator(
     deviceId,
     'your-service-uuid',
     'your-write-characteristic-uuid',
     'your-notify-characteristic-uuid'
   );
   ```

### 13. 最佳实践

1. **资源清理** - 页面卸载时调用destroy方法
2. **错误处理** - 使用try-catch包装所有异步操作
3. **状态管理** - 使用回调函数监听状态变化
4. **连接管理** - 避免同时连接多个设备
5. **消息处理** - 实现消息队列避免丢失

### 14. 后续计划

1. 添加更多设备类型支持
2. 实现设备自动重连
3. 添加数据加密功能
4. 优化电量消耗
5. 支持批量操作

---

## 总结

本次重构大幅提升了蓝牙服务的可维护性、类型安全性和用户体验。新的API设计更加直观，错误处理更加完善，代码结构更加清晰。建议开发团队尽快完成迁移，以享受新架构带来的优势。