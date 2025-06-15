import { makeAutoObservable, action } from "mobx";

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

  constructor() {
    makeAutoObservable(this);
    // 初始化测试设备
    this.initTestDevices();
  }

  // 初始化测试设备数据
  private initTestDevices() {
    const testDevices: Device[] = [
      {
        id: 'test-device-001',
        name: '智能充电桩 1号',
        deviceId: 'test-device-id-001',
        connected: true,
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
        connected: true,
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
  updateDeviceUsage(id: string, dailyUsage: number, monthlyUsage: number, yearlyUsage: number) {
    const device = this.devices.find(d => d.id === id);
    if (device) {
      device.dailyUsage = dailyUsage;
      device.monthlyUsage = monthlyUsage;
      device.yearlyUsage = yearlyUsage;
      this.lastUpdateTime = Date.now();
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
  toggleDevicePower(id: string) {
    const device = this.devices.find(d => d.id === id);
    if (device && device.connected) {
      device.powerOn = !device.powerOn;
      console.log(`设备 ${device.name} 电源状态: ${device.powerOn ? '开启' : '关闭'}`);
      return true;
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
      // 如果设备已存在，更新连接状态
      this.updateDeviceStatus(existingDevice.id, true);
      this.setCurrentDevice(existingDevice);
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
    return newDevice;
  }
}

export const deviceStore = new DeviceStore();