// 蓝牙服务使用示例
import { 
  BluetoothManager, 
  BluetoothDevice, 
  BluetoothDeviceCommunicator,
  bluetoothManager 
} from './bluetooth';

// 示例：搜索和连接蓝牙设备的页面逻辑
export class BluetoothPageController {
  private manager: BluetoothManager;
  private devicesList: BluetoothDevice[] = [];
  private searching: boolean = false;
  private communicator?: BluetoothDeviceCommunicator;

  constructor() {
    this.manager = bluetoothManager;
    this.setupEventListeners();
  }

  // 设置事件监听
  private setupEventListeners() {
    // 监听设备发现
    this.manager.getDeviceManager().onDeviceFound((devices) => {
      this.devicesList = devices;
      this.onDevicesUpdate?.(devices);
    });

    // 监听搜索状态变化
    this.manager.getDeviceManager().onStateChange((state) => {
      this.searching = state.searching;
      this.onSearchStateChange?.(state.searching);
    });
  }

  // 开始/停止搜索
  async toggleSearch(): Promise<void> {
    try {
      if (this.searching) {
        await this.manager.stopSearch();
      } else {
        await this.manager.startSearch();
      }
    } catch (error) {
      console.error('切换搜索状态失败:', error);
      throw error;
    }
  }

  // 连接设备
  async connectDevice(deviceId: string, name?: string): Promise<void> {
    try {
      this.communicator = await this.manager.connectDevice(deviceId, name);
      
      // 设置消息接收回调
      this.communicator.onMessage((message) => {
        this.onMessageReceived?.(message);
      });

      // 设置连接状态回调
      this.communicator.onConnectionStateChange((connected) => {
        this.onConnectionStateChange?.(connected);
      });

      console.log('设备连接成功:', deviceId);
    } catch (error) {
      console.error('连接设备失败:', error);
      throw error;
    }
  }

  // 发送消息
  async sendMessage(message: string): Promise<void> {
    try {
      await this.manager.sendMessage(message);
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    try {
      await this.manager.disconnectCurrentDevice();
      this.communicator = undefined;
    } catch (error) {
      console.error('断开连接失败:', error);
      throw error;
    }
  }

  // 获取设备列表
  getDevicesList(): BluetoothDevice[] {
    return this.devicesList;
  }

  // 获取搜索状态
  isSearching(): boolean {
    return this.searching;
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.manager.hasConnectedDevice();
  }

  // 获取当前设备ID
  getCurrentDeviceId(): string | undefined {
    return this.manager.getCurrentDeviceId();
  }

  // 清空接收文本
  clearReceiveText(): void {
    this.communicator?.clearReceiveText();
  }

  // 获取接收文本
  getReceiveText(): string {
    return this.communicator?.getReceiveText() || '';
  }

  // 事件回调接口
  onDevicesUpdate?: (devices: BluetoothDevice[]) => void;
  onSearchStateChange?: (searching: boolean) => void;
  onMessageReceived?: (message: string) => void;
  onConnectionStateChange?: (connected: boolean) => void;

  // 清理资源
  destroy(): void {
    this.manager.destroy();
    this.communicator = undefined;
  }
}

// 页面使用示例
/*
// 在Taro页面中使用：

import { BluetoothPageController } from '@/services/bluetooth-example';

export default function BluetoothPage() {
  const [controller] = useState(() => new BluetoothPageController());
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [searching, setSearching] = useState(false);
  const [connected, setConnected] = useState(false);
  const [inputText, setInputText] = useState('Hello World!');
  const [receiveText, setReceiveText] = useState('');

  useEffect(() => {
    // 设置事件回调
    controller.onDevicesUpdate = setDevices;
    controller.onSearchStateChange = setSearching;
    controller.onConnectionStateChange = setConnected;
    controller.onMessageReceived = (message) => {
      setReceiveText(prev => prev + message);
    };

    return () => {
      controller.destroy();
    };
  }, []);

  // 搜索设备
  const handleSearch = async () => {
    try {
      await controller.toggleSearch();
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  // 连接设备
  const handleConnect = async (deviceId: string, name: string) => {
    try {
      await controller.connectDevice(deviceId, name);
    } catch (error) {
      console.error('连接失败:', error);
    }
  };

  // 发送消息
  const handleSend = async () => {
    try {
      await controller.sendMessage(inputText);
    } catch (error) {
      console.error('发送失败:', error);
    }
  };

  return (
    <View>
      <Button onClick={handleSearch}>
        {searching ? '停止搜索' : '开始搜索'}
      </Button>
      
      {devices.map(device => (
        <View key={device.deviceId} onClick={() => handleConnect(device.deviceId, device.name)}>
          {device.name} - {device.deviceId}
        </View>
      ))}
      
      {connected && (
        <View>
          <Input value={inputText} onInput={(e) => setInputText(e.detail.value)} />
          <Button onClick={handleSend}>发送</Button>
          <Text>{receiveText}</Text>
        </View>
      )}
    </View>
  );
}
*/