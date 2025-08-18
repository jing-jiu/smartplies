// 蓝牙服务测试文件
import { bluetoothManager, BluetoothDevice } from './bluetooth';

// 测试蓝牙功能的简单示例
export class BluetoothTester {
  private devices: BluetoothDevice[] = [];
  private searching: boolean = false;
  private connected: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  // 设置事件监听
  private setupEventListeners() {
    const deviceManager = bluetoothManager.getDeviceManager();
    
    // 监听设备发现
    deviceManager.onDeviceFound((devices) => {
      this.devices = devices;
      console.log('测试 - 发现设备:', devices.length);
    });

    // 监听搜索状态变化
    deviceManager.onStateChange((state) => {
      this.searching = state.searching;
      console.log('测试 - 搜索状态:', state);
    });
  }

  // 测试搜索功能
  async testSearch(): Promise<void> {
    try {
      console.log('测试 - 开始搜索设备');
      await bluetoothManager.startSearch();
      
      // 搜索10秒后停止
      setTimeout(async () => {
        await bluetoothManager.stopSearch();
        console.log('测试 - 搜索完成，发现设备数量:', this.devices.length);
      }, 10000);
    } catch (error) {
      console.error('测试 - 搜索失败:', error);
    }
  }

  // 测试连接功能
  async testConnect(deviceId: string): Promise<void> {
    try {
      console.log('测试 - 开始连接设备:', deviceId);
      const communicator = await bluetoothManager.connectDevice(deviceId);
      
      // 设置消息接收回调
      communicator.onMessage((message) => {
        console.log('测试 - 收到消息:', message);
      });

      // 设置连接状态回调
      communicator.onConnectionStateChange((connected) => {
        this.connected = connected;
        console.log('测试 - 连接状态变化:', connected);
      });

      console.log('测试 - 设备连接成功');
    } catch (error) {
      console.error('测试 - 连接失败:', error);
    }
  }

  // 测试发送消息
  async testSendMessage(message: string): Promise<void> {
    try {
      console.log('测试 - 发送消息:', message);
      await bluetoothManager.sendMessage(message);
      console.log('测试 - 消息发送成功');
    } catch (error) {
      console.error('测试 - 发送消息失败:', error);
    }
  }

  // 测试断开连接
  async testDisconnect(): Promise<void> {
    try {
      console.log('测试 - 断开连接');
      await bluetoothManager.disconnectCurrentDevice();
      console.log('测试 - 断开连接成功');
    } catch (error) {
      console.error('测试 - 断开连接失败:', error);
    }
  }

  // 获取测试状态
  getStatus() {
    return {
      devices: this.devices,
      searching: this.searching,
      connected: this.connected,
      hasConnectedDevice: bluetoothManager.hasConnectedDevice(),
      currentDeviceId: bluetoothManager.getCurrentDeviceId()
    };
  }

  // 运行完整测试流程
  async runFullTest(): Promise<void> {
    console.log('测试 - 开始完整蓝牙功能测试');
    
    try {
      // 1. 测试搜索
      await this.testSearch();
      
      // 等待搜索完成
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      // 2. 如果找到设备，测试连接第一个设备
      if (this.devices.length > 0) {
        const firstDevice = this.devices[0];
        await this.testConnect(firstDevice.deviceId);
        
        // 等待连接稳定
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. 测试发送消息
        if (this.connected) {
          await this.testSendMessage('TEST:Hello\\r\\n');
          
          // 等待消息发送
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 4. 测试断开连接
          await this.testDisconnect();
        }
      }
      
      console.log('测试 - 完整测试流程结束');
      console.log('测试 - 最终状态:', this.getStatus());
    } catch (error) {
      console.error('测试 - 完整测试失败:', error);
    }
  }

  // 清理资源
  destroy() {
    bluetoothManager.destroy();
  }
}

// 导出测试实例
export const bluetoothTester = new BluetoothTester();

// 使用示例：
/*
// 在页面中使用测试器
import { bluetoothTester } from '@/services/bluetooth-test';

// 运行完整测试
bluetoothTester.runFullTest();

// 或者单独测试各个功能
bluetoothTester.testSearch();
bluetoothTester.testConnect('device-id');
bluetoothTester.testSendMessage('Hello Device');
bluetoothTester.testDisconnect();

// 获取测试状态
console.log(bluetoothTester.getStatus());
*/