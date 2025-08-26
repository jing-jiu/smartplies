import Taro from "@tarojs/taro";

// 定义标准服务UUID
const STANDARD_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';
const WRITE_CHARACTERISTIC_UUID = '49535343-8841-43F4-A8D4-ECBE34729BB3';
const NOTIFY_CHARACTERISTIC_UUID = '49535343-1E4D-4BD9-BA61-23C647249616';
const NOTIFY_SERVICE_UUID = '5833FF01-9B8B-5191-6142-22A4536EF123';

// 蓝牙设备接口
export interface BluetoothDevice {
  deviceId: string;
  name: string;
  RSSI: number;
  advertisData?: ArrayBuffer;
  advertisServiceUUIDs?: string[];
  localName?: string;
  serviceData?: any;
}

// 蓝牙状态接口
export interface BluetoothState {
  searching: boolean;
  available: boolean;
  discovering: boolean;
}

// 连接状态接口
export interface ConnectionState {
  deviceId: string;
  connected: boolean;
}

// ArrayBuffer转字符串 (类似原代码中的buf2string)
export const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < uint8Array.length; i++) {
    result += String.fromCharCode(uint8Array[i]);
  }
  return result;
};

// 字符串转ArrayBuffer
export const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const buffer = new ArrayBuffer(str.length);
  const dataView = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    dataView[i] = str.charCodeAt(i);
  }
  return buffer;
};

// 内部使用的蓝牙适配器初始化函数
const initBluetooth = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    Taro.openBluetoothAdapter({
      mode: 'central', // 明确指定为主机模式
      success: (res) => {
        console.log('蓝牙适配器初始化成功:', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('蓝牙适配器初始化失败:', err);
        reject(err);
      }
    });
  });
};

// 内部使用的蓝牙适配器状态获取函数
const getBluetoothAdapterState = (): Promise<BluetoothState> => {
  return new Promise((resolve, reject) => {
    Taro.getBluetoothAdapterState({
      success: (res) => {
        resolve({
          searching: res.discovering,
          available: res.available,
          discovering: res.discovering
        });
      },
      fail: reject
    });
  });
};

// 内部使用的设备搜索函数
const startDiscover = (allowDuplicatesKey: boolean = false): Promise<any> => {
  return new Promise((resolve, reject) => {
    Taro.startBluetoothDevicesDiscovery({
      allowDuplicatesKey,
      interval: 0,
      success: (res) => {
        console.log('开始搜索蓝牙设备成功:', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('开始搜索蓝牙设备失败:', err);
        reject(err);
      }
    });
  });
};

// 内部使用的停止搜索函数
const stopDiscover = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    Taro.stopBluetoothDevicesDiscovery({
      success: (res) => {
        console.log('停止搜索蓝牙设备成功:', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('停止搜索蓝牙设备失败:', err);
        reject(err);
      }
    });
  });
};

// 内部使用的蓝牙适配器重置函数
const resetBluetoothAdapter = async () => {
  try {
    console.log('开始重置蓝牙适配器');

    // 停止当前搜索
    try {
      await stopDiscover();
    } catch (error) {
      console.log('停止搜索失败或未在搜索:', error);
    }

    // 关闭蓝牙适配器
    await new Promise((resolve) => {
      Taro.closeBluetoothAdapter({
        success: resolve,
        fail: resolve // 即使失败也继续
      });
    });

    console.log('蓝牙适配器已关闭，等待重新初始化');

    // 等待一段时间确保完全关闭
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 重新初始化
    await initBluetooth();

    console.log('蓝牙适配器重置完成');

    return true;
  } catch (error) {
    console.error('重置蓝牙适配器失败:', error);
    throw error;
  }
};

// 内部使用的MTU设置函数
const setBLEMTU = (deviceId: string, mtu: number = 185) => {
  return new Promise((resolve, reject) => {
    Taro.setBLEMTU({
      deviceId,
      mtu,
      success: (res) => {
        console.log('MTU 设置成功:', res);
        resolve(res);
      },
      fail: (error) => {
        console.log('MTU 设置失败:', error);
        reject(error);
      }
    });
  });
};

// 内部使用的MTU获取函数
const getBLEMTU = (deviceId: string) => {
  return new Promise((resolve, reject) => {
    Taro.getBLEMTU({
      deviceId,
      success: (res) => {
        console.log('获取MTU成功:', res);
        resolve(res);
      },
      fail: (error) => {
        console.log('获取MTU失败:', error);
        reject(error);
      }
    });
  });
};

// 设备搜索管理类
export class BluetoothDeviceManager {
  private devicesList: BluetoothDevice[] = [];
  private searching: boolean = false;
  onDeviceFoundCallback?: (devices: BluetoothDevice[]) => void;
  private onStateChangeCallback?: (state: BluetoothState) => void;

  constructor() {
    this.setupEventListeners();
  }

  // 设置事件监听器
  private setupEventListeners() {
    // 监听蓝牙适配器状态变化
    Taro.onBluetoothAdapterStateChange((res) => {
      console.log('蓝牙适配器状态变化:', res);
      this.searching = res.discovering;

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback({
          searching: res.discovering,
          available: res.available,
          discovering: res.discovering
        });
      }

      if (!res.available) {
        this.searching = false;
        this.devicesList = [];
      }
    });

    // 监听发现新设备
    Taro.onBluetoothDeviceFound((res) => {
      console.log('发现新设备:', res);
      this.handleDeviceFound(res);
    });
  }

  // 处理发现的设备
  private handleDeviceFound(res: any) {
    let devices: BluetoothDevice[] = [];

    // 处理不同的返回格式
    if (res.devices && Array.isArray(res.devices)) {
      devices = res.devices;
    } else if (res.deviceId) {
      devices = [res];
    } else if (Array.isArray(res)) {
      devices = res;
    }

    devices.forEach(device => {
      // 过滤设备名称 (只保留 'ai-thinker' 设备，类似原代码逻辑)
      if (device.name !== 'ai-thinker') {
        return;
      }

      // 检查设备是否已存在
      const existingIndex = this.devicesList.findIndex(d => d.deviceId === device.deviceId);

      if (existingIndex === -1) {
        // 处理广播数据
        if (device.advertisData) {
          device.advertisData = device.advertisData;
        }

        this.devicesList.push(device);
        console.log('添加新设备:', device);
      } else {
        // 更新现有设备信息
        this.devicesList[existingIndex] = { ...this.devicesList[existingIndex], ...device };
      }
    });

    // 通知设备列表更新
    if (this.onDeviceFoundCallback) {
      this.onDeviceFoundCallback([...this.devicesList]);
    }
  }

  // 开始搜索设备
  async startSearch(): Promise<void> {
    try {
      if (this.searching) {
        await this.stopSearch();
      }

      // 确保蓝牙适配器已初始化
      await ensureBluetoothInitialized();

      // 重置蓝牙适配器
      await this.resetAdapter();

      // 初始化蓝牙
      await initBluetooth();

      // 获取蓝牙状态
      await getBluetoothAdapterState();

      // 开始搜索
      await startDiscover(false);

      this.searching = true;
      this.devicesList = [];

      console.log('开始搜索蓝牙设备');
    } catch (error) {
      console.error('开始搜索失败:', error);
      this.searching = false;

      // 显示错误提示
      Taro.showModal({
        title: '提示',
        content: '请检查手机蓝牙是否打开',
        showCancel: false
      });

      throw error;
    }
  }

  // 停止搜索设备
  async stopSearch(): Promise<void> {
    try {
      if (this.searching) {
        await stopDiscover();
        this.searching = false;
        console.log('停止搜索蓝牙设备');
      }
    } catch (error) {
      console.error('停止搜索失败:', error);
      this.searching = false;
    }
  }

  // 重置蓝牙适配器
  private async resetAdapter(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        Taro.closeBluetoothAdapter({
          complete: () => resolve()
        });
      });
      console.log('蓝牙适配器已重置');
    } catch (error) {
      console.log('重置蓝牙适配器失败:', error);
    }
  }

  // 连接设备
  async connectDevice(deviceId: string): Promise<ConnectionState> {
    try {
      // 停止搜索
      await this.stopSearch();

      // 显示连接提示
      Taro.showLoading({
        title: '连接蓝牙设备中...'
      });

      // 创建连接
      await new Promise((resolve, reject) => {
        Taro.createBLEConnection({
          deviceId,
          success: resolve,
          fail: reject
        });
      });

      Taro.hideLoading();

      // 显示连接成功提示
      Taro.showToast({
        title: '连接成功',
        icon: 'success',
        duration: 1000
      });

      console.log('设备连接成功:', deviceId);
      return { deviceId, connected: true };
    } catch (error) {
      Taro.hideLoading();

      // 显示连接失败提示
      Taro.showModal({
        title: '提示',
        content: '连接失败',
        showCancel: false
      });

      console.error('设备连接失败:', error);
      throw error;
    }
  }

  // 设置设备发现回调
  onDeviceFound(callback: (devices: BluetoothDevice[]) => void) {
    this.onDeviceFoundCallback = callback;
  }

  // 设置状态变化回调
  onStateChange(callback: (state: BluetoothState) => void) {
    this.onStateChangeCallback = callback;
  }

  // 获取当前设备列表
  getDevicesList(): BluetoothDevice[] {
    return [...this.devicesList];
  }

  // 获取搜索状态
  isSearching(): boolean {
    return this.searching;
  }

  // 清理资源
  destroy() {
    this.devicesList = [];
    this.searching = false;
    this.onDeviceFoundCallback = undefined;
    this.onStateChangeCallback = undefined;
  }
}

// 设备通信管理类
export class BluetoothDeviceCommunicator {
  private deviceId: string;
  private serviceId: string;
  private writeCharacteristicId: string;
  private notifyCharacteristicId: string;
  private connected: boolean = false;
  private receiveText: string = '';
  private onMessageCallback?: (message: string) => void;
  private onConnectionStateCallback?: (connected: boolean) => void;

  constructor(
    deviceId: string,
    serviceId: string = STANDARD_SERVICE_UUID,
    writeCharacteristicId: string = WRITE_CHARACTERISTIC_UUID,
    notifyCharacteristicId: string = NOTIFY_CHARACTERISTIC_UUID
  ) {
    this.deviceId = deviceId;
    this.serviceId = serviceId;
    this.writeCharacteristicId = writeCharacteristicId;
    this.notifyCharacteristicId = notifyCharacteristicId;
    this.setupEventListeners();
  }

  // 设置事件监听器
  private setupEventListeners() {
    // 监听连接状态变化
    Taro.onBLEConnectionStateChange((res) => {
      console.log('连接状态变化:', res);
      if (res.deviceId === this.deviceId) {
        this.connected = res.connected;
        if (this.onConnectionStateCallback) {
          this.onConnectionStateCallback(res.connected);
        }
      }
    });

    // 监听特征值变化 (接收消息)
    Taro.onBLECharacteristicValueChange((res) => {
      if (res.deviceId === this.deviceId &&
        res.serviceId === this.serviceId &&
        res.characteristicId === this.notifyCharacteristicId) {

        const message = arrayBufferToString(res.value);
        const time = this.getCurrentTime();
        const fullMessage = time + message;

        this.receiveText += fullMessage;
        console.log('接收到数据:', message);

        if (this.onMessageCallback) {
          this.onMessageCallback(fullMessage);
        }
      }
    });
  }

  // 初始化设备通信
  async initialize(): Promise<void> {
    try {
      console.log('初始化设备通信:', this.deviceId);

      // 确保蓝牙适配器已初始化
      await ensureBluetoothInitialized();

      // 获取设备服务
      const servicesRes = await new Promise<any>((resolve, reject) => {
        Taro.getBLEDeviceServices({
          deviceId: this.deviceId,
          success: resolve,
          fail: reject
        });
      });

      console.log('设备服务:', servicesRes.services);

      if (!servicesRes.services || servicesRes.services.length === 0) {
        throw new Error('设备没有可用的服务');
      }

      // 查找标准服务或备用服务
      let targetService = servicesRes.services.find((s: any) => s.uuid === STANDARD_SERVICE_UUID);
      let targetNotifyService = servicesRes.services.find((s: any) => s.uuid === NOTIFY_SERVICE_UUID);

      let serviceToUse = null;
      let characteristicsToUse = null;

      // 优先使用标准服务
      if (targetService) {
        console.log('找到标准服务:', targetService.uuid);
        serviceToUse = targetService;
        characteristicsToUse = await this.getServiceCharacteristics(targetService.uuid);
      } else if (targetNotifyService) {
        console.log('找到通知服务:', targetNotifyService.uuid);
        serviceToUse = targetNotifyService;
        characteristicsToUse = await this.getServiceCharacteristics(targetNotifyService.uuid);
      } else {
        // 如果没有找到标准服务，尝试使用倒数第三个服务（兼容原逻辑）
        if (servicesRes.services.length >= 3) {
          const fallbackServiceIndex = servicesRes.services.length - 3;
          serviceToUse = servicesRes.services[fallbackServiceIndex];
          console.log('使用备用服务:', serviceToUse.uuid);
          characteristicsToUse = await this.getServiceCharacteristics(serviceToUse.uuid);
        } else {
          throw new Error('设备服务不兼容');
        }
      }

      if (!serviceToUse || !characteristicsToUse) {
        throw new Error('无法获取设备服务信息');
      }

      // 更新服务和特征值信息
      this.serviceId = serviceToUse.uuid;

      // 查找可用的特征值
      const { writeCharacteristic, notifyCharacteristic } = this.findUsableCharacteristics(characteristicsToUse);

      if (writeCharacteristic) {
        this.writeCharacteristicId = writeCharacteristic.uuid;
        console.log('找到写入特征值:', writeCharacteristic.uuid);
      }

      if (notifyCharacteristic) {
        this.notifyCharacteristicId = notifyCharacteristic.uuid;
        console.log('找到通知特征值:', notifyCharacteristic.uuid);

        // 启用通知
        await this.enableNotificationForCharacteristic(this.serviceId, this.notifyCharacteristicId);
      } else {
        console.warn('未找到通知特征值，消息接收功能可能不可用');
      }

      this.connected = true;
      console.log('设备通信初始化完成');
      console.log('最终使用的服务ID:', this.serviceId);
      console.log('最终使用的写入特征值ID:', this.writeCharacteristicId);
      console.log('最终使用的通知特征值ID:', this.notifyCharacteristicId);
    } catch (error) {
      console.error('设备通信初始化失败:', error);
      throw error;
    }
  }

  // 获取服务的特征值
  private async getServiceCharacteristics(serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      Taro.getBLEDeviceCharacteristics({
        deviceId: this.deviceId,
        serviceId: serviceId,
        success: (res) => {
          console.log(`服务 ${serviceId} 的特征值:`, res.characteristics);
          resolve(res.characteristics);
        },
        fail: (err) => {
          console.error(`获取服务 ${serviceId} 特征值失败:`, err);
          reject(err);
        }
      });
    });
  }

  // 查找可用的特征值
  private findUsableCharacteristics(characteristics: any[]) {
    let writeCharacteristic = null;
    let notifyCharacteristic = null;

    // 优先查找预定义的特征值
    writeCharacteristic = characteristics.find(c => c.uuid === WRITE_CHARACTERISTIC_UUID);
    notifyCharacteristic = characteristics.find(c => c.uuid === NOTIFY_CHARACTERISTIC_UUID);

    // 如果没找到预定义的，根据属性查找
    if (!writeCharacteristic) {
      writeCharacteristic = characteristics.find(c =>
        c.properties && (c.properties.write || c.properties.writeNoResponse)
      );
    }

    if (!notifyCharacteristic) {
      notifyCharacteristic = characteristics.find(c =>
        c.properties && (c.properties.notify || c.properties.indicate)
      );
    }

    // 如果还是没找到，使用索引方式（兼容原逻辑）
    if (!writeCharacteristic && characteristics.length > 0) {
      writeCharacteristic = characteristics[0];
    }

    if (!notifyCharacteristic && characteristics.length > 1) {
      notifyCharacteristic = characteristics[1];
    }

    console.log('选择的写入特征值:', writeCharacteristic);
    console.log('选择的通知特征值:', notifyCharacteristic);

    return { writeCharacteristic, notifyCharacteristic };
  }

  // 为指定特征值启用通知
  private async enableNotificationForCharacteristic(serviceId: string, characteristicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`启用通知 - 服务ID: ${serviceId}, 特征值ID: ${characteristicId}`);

      Taro.notifyBLECharacteristicValueChange({
        state: true,
        deviceId: this.deviceId,
        serviceId: serviceId,
        characteristicId: characteristicId,
        success: () => {
          console.log('启用notify成功');
          resolve();
        },
        fail: (err) => {
          console.log('启用notify失败:', err);
          reject(err);
        }
      });
    });
  }

  // 发送消息
  async sendMessage(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('蓝牙已断开');
    }

    try {
      const buffer = stringToArrayBuffer(message);

      await new Promise<void>((resolve, reject) => {
        Taro.writeBLECharacteristicValue({
          deviceId: this.deviceId,
          serviceId: this.serviceId,
          characteristicId: this.writeCharacteristicId,
          value: buffer,
          success: () => {
            console.log('发送成功:', message);
            resolve();
          },
          fail: (err) => {
            console.error('发送失败:', err);
            reject(err);
          }
        });
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        Taro.closeBLEConnection({
          deviceId: this.deviceId,
          success: () => {
            console.log('断开连接成功');
            this.connected = false;
            resolve();
          },
          fail: reject
        });
      });
    } catch (error) {
      console.error('断开连接失败:', error);
      throw error;
    }
  }

  // 获取当前时间字符串
  private getCurrentTime(): string {
    const addZero = (num: number): string => {
      return num < 10 ? '0' + num : num.toString();
    };

    const now = new Date();
    const hours = addZero(now.getHours());
    const minutes = addZero(now.getMinutes());
    const seconds = addZero(now.getSeconds());

    return `${hours}时${minutes}分${seconds}秒 收到：`;
  }

  // 清空接收文本
  clearReceiveText(): void {
    this.receiveText = '';
  }

  // 获取接收文本
  getReceiveText(): string {
    return this.receiveText;
  }

  // 设置消息接收回调
  onMessage(callback: (message: string) => void): void {
    this.onMessageCallback = callback;
  }

  // 设置连接状态回调
  onConnectionStateChange(callback: (connected: boolean) => void): void {
    this.onConnectionStateCallback = callback;
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.connected;
  }

  // 获取设备ID
  getDeviceId(): string {
    return this.deviceId;
  }

  // 清理资源
  destroy(): void {
    this.connected = false;
    this.receiveText = '';
    this.onMessageCallback = undefined;
    this.onConnectionStateCallback = undefined;
  }
}

// 统一的蓝牙管理器
export class BluetoothManager {
  private deviceManager: BluetoothDeviceManager;
  private communicator?: BluetoothDeviceCommunicator;
  private currentDeviceId?: string;
  private connectionStateCallback?: (deviceId: string, connected: boolean) => void;

  constructor() {
    this.deviceManager = new BluetoothDeviceManager();
    this.setupGlobalConnectionListener();
  }

  // 设置全局蓝牙连接状态监听
  private setupGlobalConnectionListener() {
    Taro.onBLEConnectionStateChange((res) => {
      console.log('全局蓝牙连接状态变化:', res);
      
      // 通知外部回调
      if (this.connectionStateCallback) {
        this.connectionStateCallback(res.deviceId, res.connected);
      }
      
      // 如果是当前连接的设备断开了
      if (res.deviceId === this.currentDeviceId && !res.connected) {
        console.log('当前设备断开连接:', res.deviceId);
        this.handleDeviceDisconnected();
      }
    });
  }

  // 处理设备断开连接
  private handleDeviceDisconnected() {
    if (this.communicator) {
      this.communicator.destroy();
      this.communicator = undefined;
      this.currentDeviceId = undefined;
      console.log('已清理断开的设备连接');
    }
  }

  // 开始搜索设备
  async startSearch(): Promise<void> {
    return this.deviceManager.startSearch();
  }

  // 停止搜索设备
  async stopSearch(): Promise<void> {
    return this.deviceManager.stopSearch();
  }

  // 连接设备
  async connectDevice(deviceId: string, name?: string): Promise<BluetoothDeviceCommunicator> {
    try {
      // 确保蓝牙适配器已初始化
      await ensureBluetoothInitialized();
      
      // 使用设备管理器连接设备
      await this.deviceManager.connectDevice(deviceId);

      // 创建通信器
      this.communicator = new BluetoothDeviceCommunicator(deviceId);
      this.currentDeviceId = deviceId;

      // 初始化通信
      await this.communicator.initialize();

      return this.communicator;
    } catch (error) {
      console.error('连接设备失败:', error);
      throw error;
    }
  }

  // 断开当前设备
  async disconnectCurrentDevice(): Promise<void> {
    if (this.communicator) {
      await this.communicator.disconnect();
      this.communicator.destroy();
      this.communicator = undefined;
      this.currentDeviceId = undefined;
    }
  }

  // 发送消息到当前设备
  async sendMessage(message: string): Promise<void> {
    if (!this.communicator) {
      throw new Error('没有连接的设备');
    }
    return this.communicator.sendMessage(message);
  }

  // 获取当前通信器
  getCurrentCommunicator(): BluetoothDeviceCommunicator | undefined {
    return this.communicator;
  }

  // 获取设备管理器
  getDeviceManager(): BluetoothDeviceManager {
    return this.deviceManager;
  }

  // 获取当前连接的设备ID
  getCurrentDeviceId(): string | undefined {
    return this.currentDeviceId;
  }

  // 检查是否有连接的设备
  hasConnectedDevice(): boolean {
    return !!this.communicator && this.communicator.isConnected();
  }

  // 完全重置蓝牙状态
  async reset(): Promise<void> {
    try {
      // 断开当前设备
      await this.disconnectCurrentDevice();

      // 停止搜索
      await this.stopSearch();

      // 重置蓝牙适配器
      await resetBluetoothAdapter();

      console.log('蓝牙管理器重置完成');
    } catch (error) {
      console.error('蓝牙管理器重置失败:', error);
      throw error;
    }
  }

  // 设置连接状态变化回调
  onConnectionStateChange(callback: (deviceId: string, connected: boolean) => void): void {
    this.connectionStateCallback = callback;
  }

  // 检查设备连接状态
  async checkDeviceConnectionState(deviceId: string): Promise<boolean> {
    try {
      // 尝试获取设备服务来检查连接状态
      await new Promise((resolve, reject) => {
        Taro.getBLEDeviceServices({
          deviceId,
          success: resolve,
          fail: reject
        });
      });
      return true; // 如果能获取服务，说明设备已连接
    } catch (error) {
      console.log('设备未连接或连接已断开:', deviceId);
      return false; // 获取服务失败，说明设备未连接
    }
  }

  // 批量检查所有设备的连接状态
  async checkAllDevicesConnectionState(deviceIds: string[]): Promise<Map<string, boolean>> {
    const connectionStates = new Map<string, boolean>();
    
    for (const deviceId of deviceIds) {
      try {
        const isConnected = await this.checkDeviceConnectionState(deviceId);
        connectionStates.set(deviceId, isConnected);
      } catch (error) {
        console.error('检查设备连接状态失败:', deviceId, error);
        connectionStates.set(deviceId, false);
      }
      
      // 避免频繁调用，添加小延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return connectionStates;
  }

  // 清理资源
  destroy(): void {
    if (this.communicator) {
      this.communicator.destroy();
    }
    this.deviceManager.destroy();
    this.communicator = undefined;
    this.currentDeviceId = undefined;
    this.connectionStateCallback = undefined;
  }
}

// 全局蓝牙适配器初始化检查
export const ensureBluetoothInitialized = async (): Promise<void> => {
  try {
    const state = await getBluetoothAdapterState();
    if (state.available) {
      console.log('蓝牙适配器已初始化');
      return;
    }
  } catch (error) {
    console.log('蓝牙适配器未初始化，正在初始化...');
  }
  
  try {
    await initBluetooth();
    console.log('蓝牙适配器初始化成功');
  } catch (error) {
    console.error('蓝牙适配器初始化失败:', error);
    throw new Error('蓝牙适配器初始化失败，请检查蓝牙权限和状态');
  }
};

// 导出单例实例
export const bluetoothManager = new BluetoothManager();