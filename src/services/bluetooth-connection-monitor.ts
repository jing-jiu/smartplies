// 蓝牙连接状态监听器
import Taro from '@tarojs/taro';
import { bluetoothManager } from './bluetooth';
import { deviceStore } from '../stores/deviceStore';

export class BluetoothConnectionMonitor {
  private static instance: BluetoothConnectionMonitor;
  private isMonitoring: boolean = false;
  private checkInterval?: NodeJS.Timeout;
  private connectionStates: Map<string, boolean> = new Map();

  private constructor() {
    this.setupEventListeners();
  }

  // 单例模式
  static getInstance(): BluetoothConnectionMonitor {
    if (!BluetoothConnectionMonitor.instance) {
      BluetoothConnectionMonitor.instance = new BluetoothConnectionMonitor();
    }
    return BluetoothConnectionMonitor.instance;
  }

  // 设置事件监听器
  private setupEventListeners() {
    // 监听蓝牙适配器状态变化
    Taro.onBluetoothAdapterStateChange((res) => {
      console.log('蓝牙适配器状态变化:', res);
      
      if (!res.available) {
        // 蓝牙不可用时，将所有设备标记为离线
        this.markAllDevicesOffline();
      }
    });

    // 监听蓝牙连接状态变化
    Taro.onBLEConnectionStateChange((res) => {
      console.log('蓝牙连接状态变化:', res);
      this.handleConnectionStateChange(res.deviceId, res.connected);
    });
  }

  // 处理连接状态变化
  private handleConnectionStateChange(deviceId: string, connected: boolean) {
    const previousState = this.connectionStates.get(deviceId);
    this.connectionStates.set(deviceId, connected);

    // 只有状态真正变化时才处理
    if (previousState !== connected) {
      console.log(`设备 ${deviceId} 连接状态变化: ${previousState} -> ${connected}`);
      
      // 更新设备存储中的状态
      const device = deviceStore.devices.find(d => d.deviceId === deviceId);
      if (device) {
        deviceStore.updateDeviceStatus(device.id, connected);
        
        // 显示状态变化提示
        Taro.showToast({
          title: `${device.name} ${connected ? '已连接' : '已断开'}`,
          icon: connected ? 'success' : 'none',
          duration: 2000
        });
      }
    }
  }

  // 将所有设备标记为离线
  private markAllDevicesOffline() {
    console.log('蓝牙不可用，将所有设备标记为离线');
    
    for (const device of deviceStore.devices) {
      if (device.connected) {
        deviceStore.updateDeviceStatus(device.id, false);
        this.connectionStates.set(device.deviceId, false);
      }
    }
    
    Taro.showToast({
      title: '蓝牙不可用，设备已离线',
      icon: 'none',
      duration: 3000
    });
  }

  // 开始监听
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('连接状态监听已在运行');
      return;
    }

    console.log('开始蓝牙连接状态监听');
    this.isMonitoring = true;

    // 定期检查连接状态（每60秒）
    this.checkInterval = setInterval(async () => {
      await this.performPeriodicCheck();
    }, 60000);

    // 立即执行一次检查
    setTimeout(async () => {
      await this.performPeriodicCheck();
    }, 3000);
  }

  // 停止监听
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('停止蓝牙连接状态监听');
    this.isMonitoring = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  // 执行定期检查
  private async performPeriodicCheck() {
    if (!this.isMonitoring || deviceStore.devices.length === 0) {
      return;
    }

    console.log('执行定期蓝牙连接状态检查');

    try {
      const deviceIds = deviceStore.devices.map(d => d.deviceId);
      const connectionStates = await bluetoothManager.checkAllDevicesConnectionState(deviceIds);

      // 更新连接状态
      for (const device of deviceStore.devices) {
        const isConnected = connectionStates.get(device.deviceId) || false;
        const previousState = this.connectionStates.get(device.deviceId);

        if (previousState !== isConnected) {
          console.log(`定期检查发现设备 ${device.name} 状态变化: ${previousState} -> ${isConnected}`);
          this.handleConnectionStateChange(device.deviceId, isConnected);
        }
      }
    } catch (error) {
      console.error('定期连接状态检查失败:', error);
    }
  }

  // 手动检查所有设备连接状态
  async checkAllDevices(): Promise<void> {
    console.log('手动检查所有设备连接状态');

    try {
      const deviceIds = deviceStore.devices.map(d => d.deviceId);
      const connectionStates = await bluetoothManager.checkAllDevicesConnectionState(deviceIds);

      let changedCount = 0;

      // 更新连接状态
      for (const device of deviceStore.devices) {
        const isConnected = connectionStates.get(device.deviceId) || false;
        const previousState = device.connected;

        if (previousState !== isConnected) {
          deviceStore.updateDeviceStatus(device.id, isConnected);
          this.connectionStates.set(device.deviceId, isConnected);
          changedCount++;
        }
      }

      if (changedCount > 0) {
        Taro.showToast({
          title: `${changedCount}个设备状态已更新`,
          icon: 'success',
          duration: 2000
        });
      } else {
        Taro.showToast({
          title: '所有设备状态正常',
          icon: 'success',
          duration: 1500
        });
      }
    } catch (error) {
      console.error('检查设备连接状态失败:', error);
      Taro.showToast({
        title: '检查失败',
        icon: 'none',
        duration: 2000
      });
    }
  }

  // 检查单个设备连接状态
  async checkSingleDevice(deviceId: string): Promise<boolean> {
    try {
      const isConnected = await bluetoothManager.checkDeviceConnectionState(deviceId);
      const device = deviceStore.devices.find(d => d.deviceId === deviceId);
      
      if (device && device.connected !== isConnected) {
        deviceStore.updateDeviceStatus(device.id, isConnected);
        this.connectionStates.set(deviceId, isConnected);
        
        Taro.showToast({
          title: `${device.name} ${isConnected ? '已连接' : '已断开'}`,
          icon: isConnected ? 'success' : 'none',
          duration: 2000
        });
      }
      
      return isConnected;
    } catch (error) {
      console.error('检查单个设备连接状态失败:', error);
      return false;
    }
  }

  // 获取监听状态
  isRunning(): boolean {
    return this.isMonitoring;
  }

  // 获取当前连接状态缓存
  getConnectionStates(): Map<string, boolean> {
    return new Map(this.connectionStates);
  }

  // 清理资源
  destroy() {
    this.stopMonitoring();
    this.connectionStates.clear();
  }
}

// 导出单例实例
export const bluetoothConnectionMonitor = BluetoothConnectionMonitor.getInstance();