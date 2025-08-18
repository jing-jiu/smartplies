import { makeAutoObservable, action } from "mobx";
import Taro from '@tarojs/taro';
import { bluetoothManager } from '../services/bluetooth';

export interface Device {
  id: string;
  name: string;
  deviceId: string;
  connected: boolean;
  powerOn: boolean; // 设备电源状态
  mode: number; // 1, 2, 3
  currentVoltage: number;
  currentAmpere: number;
  indicatorColor: string;
  indicatorBrightness: number;
  schedule: Array<{ day: number; time: string; on: boolean }>;
  version: string;
  serialNumber: string;
  dailyUsage: number; // 今日用电量
  monthlyUsage: number; // 本月用电量
  yearlyUsage: number; // 年度用电量
}

export class DeviceStore {
  devices: Device[] = [];
  currentDevice: Device | null = null;
  isBluetoothReady = false;
  discovering = false;
  lastUpdateTime: number = 0;
  loading = false;

  constructor() {
    makeAutoObservable(this);
    
    // 尝试从云数据库加载设备
    if (process.env.TARO_ENV === 'weapp') {
      // 延迟执行，确保云环境已初始化
      setTimeout(() => {
        this.loadDevicesFromCloud().catch(err => {
          // console.error('从云数据库加载设备失败，使用测试设备:', err);
          // 如果从云端加载失败，使用测试设备
          if (this.devices.length === 0) {
            this.initTestDevices();
          }
        });
      }, 2000);
    } else {
      // 非微信环境，使用测试设备
      this.initTestDevices();
    }
  }

  // 初始化测试设备数据
  private initTestDevices() {
    const testDevices: Device[] = [
      {
        id: 'test-device-001',
        name: '智能充电桩 1号',
        deviceId: 'test-device-id-001',
        connected: false, // 初始状态为离线
        powerOn: true,
        mode: 1,
        currentVoltage: 220,
        currentAmpere: 2.5,
        indicatorColor: '#52c41a',
        indicatorBrightness: 80,
        schedule: [
          { day: 1, time: '08:00', on: true },
          { day: 1, time: '18:00', on: false },
        ],
        version: '1.0.0',
        serialNumber: 'SN12345678',
        dailyUsage: 0.2,
        monthlyUsage: 5.8,
        yearlyUsage: 45.2
      },
      {
        id: 'test-device-002',
        name: '智能充电桩 2号',
        deviceId: 'test-device-id-002',
        connected: false, // 初始状态为离线
        powerOn: false,
        mode: 2,
        currentVoltage: 220,
        currentAmpere: 1.8,
        indicatorColor: '#1890ff',
        indicatorBrightness: 70,
        schedule: [
          { day: 2, time: '07:30', on: true },
          { day: 2, time: '17:30', on: false },
        ],
        version: '1.0.0',
        serialNumber: 'SN87654321',
        dailyUsage: 0.1,
        monthlyUsage: 3.2,
        yearlyUsage: 28.7
      },
      {
        id: 'test-device-003',
        name: '智能充电桩 3号',
        deviceId: 'test-device-id-003',
        connected: false,
        powerOn: false,
        mode: 3,
        currentVoltage: 0,
        currentAmpere: 0,
        indicatorColor: '#f5222d',
        indicatorBrightness: 50,
        schedule: [],
        version: '1.0.0',
        serialNumber: 'SN11223344',
        dailyUsage: 0,
        monthlyUsage: 1.5,
        yearlyUsage: 15.3
      }
    ];
    
    this.devices = testDevices;
    this.currentDevice = testDevices[0];
  }

  @action
  addDevice(device: Device) {
    this.devices.push(device);
  }

  @action
  updateDeviceStatus(id: string, connected: boolean) {
    const device = this.devices.find(d => d.id === id);
    if (device) {
      device.connected = connected;
      // 连接状态改变时保存到本地存储
      this.saveConnectionStates();
    }
  }

  @action
  updateDeviceSettings(id: string, settings: Partial<Device>) {
    const device = this.devices.find(d => d.id === id);
    if (device) {
      Object.assign(device, settings);
    }
  }

  @action
  setCurrentDevice(device: Device) {
    this.currentDevice = device;
  }

  @action
  setBluetoothReady(ready: boolean) {
    this.isBluetoothReady = ready;
  }

  @action
  toggleDiscovering() {
    this.discovering = !this.discovering;
  }

  @action
  setLoading(loading: boolean) {
    this.loading = loading;
  }

  @action
  updateDeviceUsage(id: string, dailyUsage: number, monthlyUsage: number, yearlyUsage: number) {
    const device = this.devices.find(d => d.id === id);
    if (device) {
      device.dailyUsage = dailyUsage;
      device.monthlyUsage = monthlyUsage;
      device.yearlyUsage = yearlyUsage;
      this.lastUpdateTime = Date.now();
      
      // 同步更新到云数据库
      this.syncDeviceToCloud(device).catch(err => {
        console.error('同步设备用电量失败:', err);
      });
    }
  }

  @action
  refreshDeviceData() {
    // 在实际应用中，这里应该从服务器或设备获取最新数据
    console.log('刷新设备数据');
    // 模拟数据更新
    this.devices.forEach(device => {
      if (device.connected && device.powerOn) {
        this.updateDeviceUsage(
          device.id,
          Math.round(Math.random() * 10) / 10, // 随机生成0-1之间的一位小数
          Math.round(Math.random() * 100) / 10,
          Math.round(Math.random() * 1000) / 10
        );
      }
    });
  }

  // 切换设备电源状态
  @action
  async toggleDevicePower(id: string) {
    const device = this.devices.find(d => d.id === id);
    if (device && device.connected) {
      const oldPowerState = device.powerOn;
      device.powerOn = !device.powerOn;
      console.log(`设备 ${device.name} 电源状态: ${device.powerOn ? '开启' : '关闭'}`);
      
      try {
        // 发送蓝牙命令
        const command = device.powerOn ? 'CHARGE:1\\r\\n' : 'CHARGE:0\\r\\n';
        console.log(`发送电源控制命令: ${command}`);
        await bluetoothManager.sendMessage(command);
        console.log('电源控制命令发送成功');
        
        // 同步更新到云数据库
        this.syncDeviceToCloud(device).catch(err => {
          console.error('同步设备电源状态失败:', err);
        });
        
        return true;
      } catch (error) {
        console.error('发送电源控制命令失败:', error);
        // 如果蓝牙命令发送失败，回滚状态
        device.powerOn = oldPowerState;
        throw error;
      }
    }
    return false;
  }

  // 获取设备的今日用电量
  getDailyUsage(): number {
    return this.currentDevice?.dailyUsage || 0;
  }

  // 获取设备的本月用电量
  getMonthlyUsage(): number {
    return this.currentDevice?.monthlyUsage || 0;
  }

  // 获取设备的年度用电量
  getYearlyUsage(): number {
    return this.currentDevice?.yearlyUsage || 0;
  }

  // 通过设备ID查找设备
  findDeviceByDeviceId(deviceId: string): Device | undefined {
    return this.devices.find(d => d.deviceId === deviceId);
  }

  // 添加新设备并连接
  @action
  addAndConnectDevice(deviceInfo: { deviceId: string, name?: string, serialNumber?: string }): Device {
    // 检查设备是否已存在
    const existingDevice = this.findDeviceByDeviceId(deviceInfo.deviceId);
    if (existingDevice) {
      // 如果设备已存在，更新连接状态和设备信息
      this.updateDeviceStatus(existingDevice.id, true);
      
      // 更新设备名称（如果提供了新名称）
      if (deviceInfo.name && deviceInfo.name !== existingDevice.name) {
        existingDevice.name = deviceInfo.name;
      }
      
      // 更新序列号（如果提供了新序列号）
      if (deviceInfo.serialNumber && deviceInfo.serialNumber !== existingDevice.serialNumber) {
        existingDevice.serialNumber = deviceInfo.serialNumber;
      }
      
      this.setCurrentDevice(existingDevice);
      
      // 同步更新到云数据库，确保重新激活被删除的设备
      this.syncDeviceToCloud(existingDevice).catch(err => {
        console.error('同步现有设备失败:', err);
      });
      
      return existingDevice;
    }

    // 创建新设备
    const newDevice: Device = {
      id: `device-${Date.now()}`,
      name: deviceInfo.name || `智能充电桩 ${this.devices.length + 1}号`,
      deviceId: deviceInfo.deviceId,
      connected: true,
      powerOn: false,
      mode: 1,
      currentVoltage: 220,
      currentAmpere: 0,
      indicatorColor: '#52c41a',
      indicatorBrightness: 80,
      schedule: [],
      version: '1.0.0',
      serialNumber: deviceInfo.serialNumber || `SN${Math.floor(Math.random() * 10000000)}`,
      dailyUsage: 0,
      monthlyUsage: 0,
      yearlyUsage: 0
    };

    // 添加到设备列表
    this.devices.push(newDevice);
    this.setCurrentDevice(newDevice);
    
    // 保存连接状态
    this.saveConnectionStates();
    
    // 同步新设备到云数据库
    this.syncDeviceToCloud(newDevice).catch(err => {
      console.error('同步新设备失败:', err);
    });
    
    return newDevice;
  }

  // 同步设备信息到云数据库
  @action
  syncDeviceToCloud(device: Device) {
    if (!Taro.cloud) {
      console.error('云开发环境未初始化');
      return Promise.reject('云开发环境未初始化');
    }

    return new Promise((resolve, reject) => {
      console.log('正在同步设备信息到云数据库:', device.id);
      console.log(device);
      
      Taro.cloud.callFunction({
        name: 'syncDeviceInfo',
        data: {
          deviceInfo: device
        },
        success: (res: any) => {
          console.log('设备信息同步成功:', res);
          resolve(res);
        },
        fail: (err) => {
          console.error('设备信息同步失败:', err);
          reject(err);
        }
      });
    });
  }

  // 同步所有设备信息到云数据库
  @action
  syncAllDevicesToCloud() {
    if (this.devices.length === 0) {
      console.log('没有设备需要同步');
      return Promise.resolve();
    }

    const promises = this.devices.map(device => this.syncDeviceToCloud(device));
    return Promise.all(promises);
  }

  // 保存设备连接状态到本地存储
  @action
  saveConnectionStates() {
    try {
      const connectionStates = {};
      this.devices.forEach(device => {
        connectionStates[device.deviceId] = device.connected;
      });
      Taro.setStorageSync('deviceConnectionStates', connectionStates);
    } catch (error) {
      console.error('保存连接状态失败:', error);
    }
  }

  // 从本地存储加载设备连接状态
  @action
  loadConnectionStates() {
    try {
      const connectionStates = Taro.getStorageSync('deviceConnectionStates') || {};
      return connectionStates;
    } catch (error) {
      console.error('加载连接状态失败:', error);
      return {};
    }
  }

  // 从云数据库加载用户设备
  @action
  loadDevicesFromCloud() {
    if (!Taro.cloud) {
      console.error('云开发环境未初始化');
      return Promise.reject('云开发环境未初始化');
    }

    this.setLoading(true);

    return new Promise((resolve, reject) => {
      console.log('正在从云数据库加载设备信息');
      Taro.cloud.callFunction({
        name: 'getUserDevices',
        data: {},
        success: (res: any) => {
          console.log('设备信息加载成功:', res);
          if (res.result && res.result.success && res.result.data) {
            // 加载本地保存的连接状态
            const connectionStates = this.loadConnectionStates();
            
            // 清空设备列表
            this.devices = [];
            
            // 添加从云端获取的设备，过滤掉已删除的设备，应用本地连接状态
            const seenDevices = new Set();
            res.result.data.forEach((deviceInfo: any) => {
              // 只添加未删除的设备，并且去重
              if (!deviceInfo.deleted && !seenDevices.has(deviceInfo.deviceId)) {
                seenDevices.add(deviceInfo.deviceId);
                
                // 使用本地保存的连接状态
                const connected = connectionStates[deviceInfo.deviceId] || false;
                
                this.devices.push({
                  ...deviceInfo,
                  connected: connected // 应用本地连接状态
                });
              }
            });
            
            // 如果有设备，设置第一个为当前设备
            if (this.devices.length > 0) {
              this.setCurrentDevice(this.devices[0]);
            }
            
            this.setLoading(false);
            resolve(this.devices);
          } else {
            this.setLoading(false);
            reject('获取设备信息失败');
          }
        },
        fail: (err) => {
          console.error('加载设备信息失败:', err);
          this.setLoading(false);
          reject(err);
        }
      });
    });
  }

  // 删除设备
  @action
  async deleteDevice(deviceId: string, forceLocal: boolean = false) {
    const deviceIndex = this.devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) {
      throw new Error('设备不存在');
    }

    const device = this.devices[deviceIndex];
    
    // 如果不是强制本地删除，尝试同步到云数据库
    if (!forceLocal && process.env.TARO_ENV === 'weapp' && Taro.cloud) {
      try {
        await new Promise((resolve, reject) => {
          console.log('正在从云数据库删除设备:', device.id);
          
          Taro.cloud.callFunction({
            name: 'syncDeviceInfo',
            data: {
              deviceInfo: {
                ...device,
                deleted: true, // 添加删除标记
                deletedAt: new Date().toISOString() // 添加删除时间
              },
              operation: 'delete' // 添加操作类型
            },
            success: (res: any) => {
              console.log('设备删除同步成功:', res);
              // 确保从本地删除
              this.devices.splice(deviceIndex, 1);
              
              // 如果删除的是当前设备，重新设置当前设备
              if (this.currentDevice?.id === deviceId) {
                this.currentDevice = this.devices.length > 0 ? this.devices[0] : null;
              }
              
              console.log(`设备 ${device.name} 已删除`);
              resolve(res);
            },
            fail: (err) => {
              console.error('设备删除同步失败:', err);
              reject(err);
            }
          });
        });
        console.log('设备已从云数据库删除');
      } catch (error) {
        console.error('从云数据库删除设备失败:', error);
        // 云端删除失败，抛出错误让调用方处理
        throw new Error('云端删除失败，请检查网络连接后重试');
      }
    } else {
      // 从本地删除
      this.devices.splice(deviceIndex, 1);
      
      // 如果删除的是当前设备，重新设置当前设备
      if (this.currentDevice?.id === deviceId) {
        this.currentDevice = this.devices.length > 0 ? this.devices[0] : null;
      }
      
      // 清理本地存储的连接状态
      this.saveConnectionStates();
      
      console.log(`设备 ${device.name} 已删除${forceLocal ? '（仅本地）' : ''}`);
    }
  }
}

export const deviceStore = new DeviceStore();