import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { useLoad, useDidShow, usePullDownRefresh, stopPullDownRefresh, showToast } from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AtButton, AtIcon } from 'taro-ui';
import { deviceStore } from '../../stores/deviceStore';
import { bluetoothManager, BluetoothDeviceManager } from '../../services/bluetooth';
import './index.scss';
import Taro from '@tarojs/taro';
import { bluetoothConnectionMonitor } from '../../services/bluetooth-connection-monitor';

// 颜色选项数组
const colorArray = [
  { color: "RED", index: 1 },         // 红色
  { color: "GREEN", index: 2 },      // 绿色
  { color: "DARK_BLUE", index: 3 },  // 深蓝色
  { color: "SKY_BLUE", index: 4 },   // 天蓝色
  { color: "PINK", index: 5 },       // 粉色
  { color: "YELLOW", index: 6 },     // 黄色
  { color: "ORANGE", index: 7 },     // 橙色
  { color: "NO_COLOR", index: 8 },   // 无颜色（黑色/透明）
  { color: "WHITE", index: 9 },      // 白色
  { color: "BRIGHT_PINK", index: 10 }, // 鲜艳粉红色
  { color: "DARK_RED", index: 11 },  // 深暗红色
  { color: "BRIGHT_MAGENTA", index: 12 }, // 鲜艳紫红色
  { color: "DARK_ROSE", index: 13 }, // 深玫红色
  { color: "BROWN_RED", index: 14 }, // 棕红色
  { color: "LIGHT_YELLOW_GREEN", index: 15 }, // 淡黄绿色
  { color: "BRIGHT_RED", index: 16 }, // 亮红色
  { color: "TRUE_RED", index: 17 },  // 正红色
  { color: "ORANGE_RED", index: 18 }, // 橙红色
  { color: "DARK_ORANGE_BROWN", index: 19 }, // 深橙棕色
  { color: "BRIGHT_ORANGE", index: 20 }, // 亮橙色
  { color: "LIGHT_BLUE", index: 21 }, // 浅蓝色
  { color: "DARK_GREEN", index: 22 }, // 深绿色
  { color: "GRASS_GREEN", index: 23 }, // 草绿色
  { color: "PURPLE", index: 24 },    // 紫色
  { color: "PEACH", index: 25 }      // 桃红色
];

const Index = observer(() => {
  // 页面加载时初始化蓝牙
  useLoad(async () => {
    try {
      // 使用新的蓝牙管理器初始化
      const deviceManager = bluetoothManager.getDeviceManager();

      // 设置设备发现回调
      deviceManager.onDeviceFound((devices) => {
        console.log('发现设备:', devices);
      });

      // 设置状态变化回调
      deviceManager.onStateChange((state) => {
        deviceStore.setBluetoothReady(state.available);
        console.log('蓝牙状态变化:', state);
      });

      deviceStore.setBluetoothReady(true);
      console.log('蓝牙管理器初始化成功');
      
      // 启动蓝牙连接状态监听
      bluetoothConnectionMonitor.startMonitoring();
      console.log('蓝牙连接状态监听已启动');
    } catch (err) {
      console.error('蓝牙管理器初始化失败', err);
    }
  });

  // 每次页面显示时检查设备连接状态
  useDidShow(async () => {
    if (deviceStore.devices.length > 0) {
      // 检查设备连接状态
      console.log('页面显示，检查设备连接状态');
      try {
        await bluetoothConnectionMonitor.checkAllDevices();
      } catch (error) {
        console.error('检查设备连接状态失败:', error);
      }
    }
  });

  // 下拉刷新
  usePullDownRefresh(async () => {
    console.log('下拉刷新，重新从云数据库加载设备并刷新连接状态');
    try {
      // 重新从云数据库加载设备
      await deviceStore.loadDevicesFromCloud();
      
      // 刷新设备连接状态
      await deviceStore.refreshDeviceConnectionStatus();
      
      showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('刷新失败:', error);
      showToast({
        title: '刷新失败',
        icon: 'none',
        duration: 2000
      });
      // 如果云端加载失败，使用本地数据
      deviceStore.refreshDeviceData();
    } finally {
      // 停止下拉刷新动画
      stopPullDownRefresh();
    }
  });

  // 复制卡片信息
  const handleCopyCard = () => {
    console.log('复制卡片');
    showToast({
      title: '复制卡片功能待实现',
      icon: 'none',
      duration: 2000
    });
  };

  // 添加终端
  const handleAddTerminal = () => {
    console.log('添加终端');
    showToast({
      title: '添加终端功能待实现',
      icon: 'none',
      duration: 2000
    });
  };

  // 动画选项数组
  const animationArray = [
    { name: "表情动画", index: 1 },
    { name: "狗狗动画", index: 2 },
    { name: "彩虹动画", index: 3 },
    { name: "心跳动画", index: 4 },
    { name: "流水动画", index: 5 },
    { name: "闪烁动画", index: 6 },
    { name: "呼吸动画", index: 7 },
    { name: "无动画", index: 8 }
  ];

  // 处理动画选择
  const handleAnimationSelect = async (animationIndex: number) => {
    const currentDevice = deviceStore.currentDevice;
    if (!currentDevice) {
      showToast({
        title: '请先选择设备',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!currentDevice.connected) {
      showToast({
        title: '设备未连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      const selectedAnimation = animationArray[animationIndex - 1];
      const command = `SET_ANIMAL:${animationIndex}\r\n`;
      console.log(`发送动画控制命令: ${command}`);
      await bluetoothManager.sendMessage(command);
      console.log('动画控制命令发送成功');

      showToast({
        title: `已设置为${selectedAnimation.name}`,
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('发送动画控制命令失败:', error);
      showToast({
        title: '动画设置失败',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 处理颜色选择
  const handleColorChange = async (e) => {
    const selectedIndex = e.detail.value;
    const currentDevice = deviceStore.currentDevice;
    
    if (!currentDevice) {
      showToast({
        title: '请先选择设备',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!currentDevice.connected) {
      showToast({
        title: '设备未连接',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      const selectedColor = colorArray[selectedIndex];
      deviceStore.updateDeviceSettings(currentDevice.id, { indicatorColor: selectedColor.color });

      // 发送蓝牙指令
      const command = `SET_LED:${selectedColor.index}\r\n`;
      console.log(`发送LED颜色控制命令: ${command}`);
      await bluetoothManager.sendMessage(command);
      console.log('LED颜色控制命令发送成功');

      showToast({
        title: `颜色已设置为${selectedColor.color}`,
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('发送LED颜色控制命令失败:', error);
      showToast({
        title: '颜色设置失败',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 更多功能
  const handleMore = () => {
    console.log('更多功能');
    showToast({
      title: '更多功能待实现',
      icon: 'none',
      duration: 2000
    });
  };

  // 跳转到设备管理页面
  // 跳转到设备管理页面
  const navigateToDeviceManage = (deviceId) => {
    // 保存当前设备ID到本地存储，以便设备管理页面获取
    Taro.setStorageSync('currentDeviceId', deviceId);
    // 使用redirectTo而不是navigateTo，避免页面堆栈问题
    Taro.redirectTo({
      url: `/pages/device/manage?deviceId=${deviceId}`,
      success: () => {
        console.log('成功跳转到设备管理页面');
      },
      fail: (err) => {
        console.error('跳转到设备管理页面失败:', err);
        showToast({
          title: '跳转失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  };

  // 解析扫码结果
  const parseScanResult = (result: string) => {
    let macAddress = '';
    let serialNumber = '';
    let deviceName = '';

    const input = result.trim();

    try {
      // 尝试解析为JSON格式
      const jsonData = JSON.parse(input);
      if (jsonData && typeof jsonData === 'object') {
        // JSON格式，提取相关字段
        deviceName = jsonData.name || '';
        macAddress = jsonData.mac || jsonData.address || '';
        serialNumber = jsonData.sn || jsonData.serial || '';
        console.log('解析JSON格式 - 设备名称:', deviceName, 'MAC地址:', macAddress, '序列号:', serialNumber);
      }
    } catch (e) {
      // 不是JSON格式，检查是否为MAC地址格式
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (macRegex.test(input)) {
        // 纯MAC地址格式
        macAddress = input.toUpperCase().replace(/-/g, ':');
        serialNumber = `SCAN-${Date.now()}`; // 生成一个扫码时间戳作为序列号
        console.log('解析MAC地址格式 - MAC地址:', macAddress, '序列号:', serialNumber);
      } else {
        console.log('无法识别的扫码格式:', input);
      }
    }

    return { macAddress, serialNumber, deviceName };
  };

  // 处理扫码结果并连接设备
  const handleScanResult = async (result: string) => {
    try {
      const { macAddress, serialNumber, deviceName } = parseScanResult(result);

      if (!macAddress && !deviceName) {
        showToast({
          title: '无效的扫码内容',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 显示加载提示
      Taro.showLoading({
        title: '正在连接设备...'
      });

      // 检查蓝牙是否初始化
      if (!deviceStore.isBluetoothReady) {
        deviceStore.setBluetoothReady(true);
      }

      // 检查是否已有相同设备，如果有则先断开
      const existingDevice = deviceStore.devices.find(d => {
        if (macAddress) {
          // 如果有MAC地址，通过MAC地址匹配
          const deviceMac = d.deviceId ? d.deviceId.toUpperCase().replace(/-/g, ':') : '';
          const targetMac = macAddress.toUpperCase().replace(/-/g, ':');
          return deviceMac === targetMac;
        } else if (deviceName) {
          // 如果没有MAC地址，通过设备名称匹配
          return d.name === deviceName;
        }
        return false;
      });

      if (existingDevice) {
        console.log('发现已存在的设备，先断开连接:', existingDevice.name);
        try {
          await bluetoothManager.disconnectCurrentDevice();
          deviceStore.updateDeviceStatus(existingDevice.id, false);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.log('断开已存在设备连接失败或设备本来就是断开状态:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 开始搜索设备
      await bluetoothManager.startSearch();
      console.log('开始扫码搜索设备');

      let scanDeviceFound = false; // 添加标记避免重复处理

      // 设置搜索超时
      const scanTimeout = setTimeout(async () => {
        if (!scanDeviceFound) {
          try {
            await bluetoothManager.stopSearch();
            Taro.hideLoading();
            const searchTarget = macAddress ? `MAC地址为${macAddress}` : `设备名称为${deviceName}`;
            showToast({
              title: `未找到${searchTarget}的设备，请确保设备已开启`,
              icon: 'none',
              duration: 2000
            });
          } catch (error) {
            console.error('停止搜索失败:', error);
          }
        }
      }, 15000); // 15秒超时

      // 设置设备发现回调
      const deviceManager = bluetoothManager.getDeviceManager();
      const originalCallback = deviceManager.onDeviceFoundCallback;

      deviceManager.onDeviceFound((devices) => {
        if (scanDeviceFound) return; // 如果已经找到设备，不再处理

        console.log('扫码搜索到设备:', devices.map(d => ({ name: d.name, deviceId: d.deviceId })));

        devices.forEach(async (discoveredDevice) => {
          let isMatch = false;

          if (macAddress) {
            // 如果有MAC地址，优先通过MAC地址匹配
            const deviceMac = discoveredDevice.deviceId ? discoveredDevice.deviceId.toUpperCase().replace(/-/g, ':') : '';
            const targetMac = macAddress.toUpperCase().replace(/-/g, ':');
            console.log('比对MAC地址:', deviceMac, 'vs', targetMac);
            isMatch = deviceMac === targetMac;
          } else if (deviceName) {
            // 如果没有MAC地址，通过设备名称匹配
            const discoveredName = discoveredDevice.name || '';
            console.log('比对设备名称:', discoveredName, 'vs', deviceName);
            isMatch = discoveredName === deviceName;
          }

          if (isMatch && !scanDeviceFound) {
            scanDeviceFound = true; // 标记已找到设备
            console.log('扫码找到匹配设备:', discoveredDevice.name, discoveredDevice.deviceId);

            try {
              // 清除超时定时器
              clearTimeout(scanTimeout);

              // 连接设备
              const communicator = await bluetoothManager.connectDevice(discoveredDevice.deviceId, deviceName || discoveredDevice.name);
              console.log('扫码设备连接成功');

              // 设置消息接收回调
              communicator.onMessage((message) => {
                console.log(`收到来自扫码设备的消息:`, message);
                handleDeviceMessage(discoveredDevice.deviceId, message);
              });

              // 添加设备到设备列表
              const newDevice = deviceStore.addAndConnectDevice({
                deviceId: discoveredDevice.deviceId,
                name: deviceName || discoveredDevice.name || `扫码设备-${macAddress ? macAddress.slice(-5) : deviceName}`,
                serialNumber: serialNumber || undefined
              });

              // 设置为当前设备
              deviceStore.setCurrentDevice(newDevice);

              // 发送SYNC_DATE指令
              try {
                const syncCommand = `SYNC_DATE:${Math.floor(Date.now() / 1000)}\r\n`;
                console.log('发送同步时间指令:', syncCommand);
                await bluetoothManager.sendMessage(syncCommand);
                console.log('同步时间指令发送成功');
              } catch (error) {
                console.error('发送同步时间指令失败:', error);
              }

              // 隐藏加载提示
              Taro.hideLoading();

              // 显示连接成功提示
              showToast({
                title: `${newDevice.name} 连接成功`,
                icon: 'success',
                duration: 2000
              });

              // 确保设备信息同步到云数据库
              if (process.env.TARO_ENV === 'weapp') {
                try {
                  await deviceStore.syncDeviceToCloud(newDevice);
                  console.log('扫码设备信息已确认同步到云数据库');
                } catch (syncError) {
                  console.error('扫码设备信息同步到云数据库失败:', syncError);
                  // 同步失败不影响设备连接，只记录日志
                }
              }

            } catch (error) {
              console.error('扫码连接设备失败:', error);

              // 隐藏加载提示
              Taro.hideLoading();

              showToast({
                title: `连接设备失败: ${error.message || '未知错误'}`,
                icon: 'none',
                duration: 3000
              });
            } finally {
              // 恢复原始回调
              if (originalCallback) {
                deviceManager.onDeviceFound(originalCallback);
              }
            }
          }
        });
      });

    } catch (error) {
      console.error('扫码充电失败:', error);

      // 隐藏加载提示
      Taro.hideLoading();

      showToast({
        title: '扫码充电失败',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 扫码充电
  const handleScanCode = () => {
    console.log('扫码充电');

    // 显示选择菜单：扫码或从相册选择
    Taro.scanCode({
      onlyFromCamera: false, // 只允许从相机扫码
      scanType: ['qrCode', 'barCode'], // 扫码类型
      success: async (scanRes) => {
        await handleScanResult(scanRes.result);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        showToast({
          title: '扫码失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  };

  // 切换设备电源
  const handleTogglePower = async (deviceId: string) => {
    const device = deviceStore.devices.find(d => d.id === deviceId);
    if (!device || !device.connected) {
      showToast({
        title: '设备离线，无法控制',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      // 调用deviceStore的toggleDevicePower方法，它会处理蓝牙命令发送
      const success = await deviceStore.toggleDevicePower(deviceId);
      if (success) {
        showToast({
          title: `${device.name} 电源已${device.powerOn ? '开启' : '关闭'}`,
          icon: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('电源控制失败:', error);
      showToast({
        title: '电源控制失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 点击设备进行蓝牙连接
  const handleSelectDevice = async (device) => {
    console.log('点击设备，尝试连接:', device.name, '当前状态:', device.connected ? '在线' : '离线');

    // 检查蓝牙是否就绪
    if (!deviceStore.isBluetoothReady) {
      showToast({
        title: '蓝牙未就绪，请稍后重试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 显示连接中提示
    Taro.showLoading({
      title: `正在连接 ${device.name}...`
    });

    try {
      // 确保设备处于断开状态
      console.log('确保设备处于断开状态');
      try {
        // 先断开设备连接
        await bluetoothManager.disconnectCurrentDevice();
        console.log('设备已断开连接');
        // 更新设备状态为离线
        deviceStore.updateDeviceStatus(device.id, false);

        // 等待断开完成
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log('断开设备连接失败或设备本来就是断开状态:', error);
      }

      // 重置蓝牙管理器
      try {
        await bluetoothManager.reset();
        deviceStore.setBluetoothReady(true);
        console.log('蓝牙管理器重置成功，准备开始搜索');
      } catch (error) {
        console.error('蓝牙管理器重置失败:', error);
        deviceStore.setBluetoothReady(true);
      }

      // 开始搜索设备
      await bluetoothManager.startSearch();
      console.log('开始搜索设备进行连接');

      // 设置连接超时时间
      const connectTimeout = setTimeout(async () => {
        try {
          await bluetoothManager.stopSearch();
          Taro.hideLoading();
          showToast({
            title: `连接 ${device.name} 超时`,
            icon: 'none',
            duration: 2000
          });
        } catch (error) {
          console.error('停止搜索失败:', error);
        }
      }, 30000); // 30秒超时

      let deviceFound = false; // 添加标记避免重复处理

      // 设置设备发现回调
      const deviceManager = bluetoothManager.getDeviceManager();
      const originalCallback = deviceManager.onDeviceFoundCallback;

      deviceManager.onDeviceFound(async (devices) => {
        if (deviceFound) return; // 如果已经找到设备，不再处理

        console.log('搜索到设备:', devices.map(d => ({ name: d.name, deviceId: d.deviceId })));

        for (const discoveredDevice of devices) {
          // 检查是否是目标设备（支持多种匹配方式）
          const normalizeDeviceId = (id) => {
            if (!id) return '';
            return id.toUpperCase().replace(/[:-]/g, '');
          };

          const targetDeviceId = normalizeDeviceId(device.deviceId);
          const discoveredDeviceId = normalizeDeviceId(discoveredDevice.deviceId);
          const discoveredDeviceName = discoveredDevice.name ? discoveredDevice.name.toLowerCase() : '';
          const targetDeviceName = device.name ? device.name.toLowerCase() : '';

          const isTargetDevice =
            discoveredDevice.deviceId === device.deviceId ||
            discoveredDeviceId === targetDeviceId ||
            (discoveredDeviceName && targetDeviceName && discoveredDeviceName.includes(targetDeviceName)) ||
            (discoveredDeviceName && discoveredDeviceName.includes('ai-thinker')) ||
            (discoveredDevice.name && device.name && discoveredDevice.name === device.name);

          console.log('设备匹配检查:', {
            discoveredName: discoveredDevice.name,
            discoveredId: discoveredDevice.deviceId,
            targetName: device.name,
            targetId: device.deviceId,
            isMatch: isTargetDevice
          });

          if (isTargetDevice && !deviceFound) {
            deviceFound = true; // 标记已找到设备
            console.log('发现目标设备:', discoveredDevice.name, discoveredDevice.deviceId);

            try {
              // 清除超时定时器
              // clearTimeout(connectTimeout);

              // 连接设备
              const communicator = await bluetoothManager.connectDevice(discoveredDevice.deviceId, device.name);
              console.log('设备连接成功:', device.name);

              // 设置消息接收回调
              communicator.onMessage((message) => {
                handleDeviceMessage(discoveredDevice.deviceId, message);
              });

              // 发送SYNC_DATE指令
              try {
                const syncCommand = `SYNC_DATE:${Math.floor(Date.now() / 1000)}\r\n`;
                console.log('发送同步时间指令:', syncCommand);
                await bluetoothManager.sendMessage(syncCommand);
                console.log('同步时间指令发送成功');
              } catch (error) {
                console.error('发送同步时间指令失败:', error);
              }

              // 更新设备连接状态为在线
              deviceStore.updateDeviceStatus(device.id, true);

              // 设置为当前设备
              deviceStore.setCurrentDevice(device);

              // 隐藏加载提示
              Taro.hideLoading();

              // 显示连接成功提示
              showToast({
                title: `${device.name} 连接成功`,
                icon: 'success',
                duration: 2000
              });

              // 同步设备状态到云数据库
              if (process.env.TARO_ENV === 'weapp') {
                try {
                  await deviceStore.syncDeviceToCloud(device);
                  console.log('设备状态已同步到云数据库');
                } catch (syncError) {
                  console.error('同步设备状态失败:', syncError);
                }
              }

            } catch (error) {
              console.error('连接设备失败:', error);

              // 隐藏加载提示
              Taro.hideLoading();

              showToast({
                title: `连接 ${device.name} 失败: ${error.message || '未知错误'}`,
                icon: 'none',
                duration: 3000
              });
            } finally {
              // 恢复原始回调
              if (originalCallback) {
                deviceManager.onDeviceFound(originalCallback);
              }
            }
            break; // 找到目标设备后退出循环
          }
        }
      });

    } catch (error) {
      console.error('搜索设备失败:', error);

      // 隐藏加载提示
      Taro.hideLoading();

      showToast({
        title: `搜索 ${device.name} 失败`,
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 处理设备消息的统一函数
  const handleDeviceMessage = (deviceId: string, message: string) => {
    console.log('收到设备消息:', deviceId, message);
    
    if (message.includes('ERROR')) {
      console.log('收到设备错误消息:', message);
      showToast({
        title: '设备报告错误',
        icon: 'none',
        duration: 2000
      });
    } else if (message.includes('CHARGE_COMPLETE')) {
      showToast({
        title: '充电完成',
        icon: 'success',
        duration: 2000
      });
    } else if (message.includes('BATTERY_LOW')) {
      showToast({
        title: '电池电量低',
        icon: 'none',
        duration: 2000
      });
    } else {
      // 处理功率信息: POWER:220.5,1.2,264.6
      const dataStr = message.substring(6);
      const [voltage, current, power] = dataStr.split(' ');
      
      console.log('收到实时功率数据:', { voltage, current, power });
      
      // 更新设备实时数据
      deviceStore.updateDeviceRealtimeData(deviceId, {
        voltage,
        current,
        power,
        timestamp: Date.now()
      });
    } 
    // else if (message.startsWith('USAGE:')) {
    //   // 处理用电量信息: USAGE:0.5,12.3,45.6
    //   const dataStr = message.substring(6);
    //   const [daily, monthly, yearly] = dataStr.split(',').map(Number);
      
    //   console.log('收到用电量数据:', { daily, monthly, yearly });
      
    //   // 找到对应的设备
    //   const device = deviceStore.findDeviceByDeviceId(deviceId);
    //   if (device) {
    //     deviceStore.updateDeviceUsage(device.id, daily, monthly, yearly);
    //   }
    // }
  };

  // 长按删除设备
  const handleLongPressDevice = (device) => {
    console.log('长按设备:', device.name);

    Taro.showModal({
      title: '删除设备',
      content: `确定要删除设备"${device.name}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            Taro.showLoading({
              title: '正在删除...'
            });

            // 如果设备已连接，先断开连接
            if (device.connected) {
              try {
                await bluetoothManager.disconnectCurrentDevice();
              } catch (error) {
                console.log('断开设备连接失败:', error);
              }
            }

            // 删除设备
            await deviceStore.deleteDevice(device.id);

            Taro.hideLoading();
            showToast({
              title: '设备已删除',
              icon: 'success',
              duration: 2000
            });
          } catch (error) {
            console.error('删除设备失败:', error);
            Taro.hideLoading();

            // 如果是云端删除失败，提供仅删除本地数据的选项
            if (error.message && error.message.includes('云端删除失败')) {
              Taro.showModal({
                title: '云端删除失败',
                content: '网络连接异常，是否仅删除本地设备数据？（下次联网时可能会重新同步）',
                confirmText: '仅删除本地',
                confirmColor: '#ff4d4f',
                cancelText: '取消',
                success: async (modalRes) => {
                  if (modalRes.confirm) {
                    try {
                      Taro.showLoading({
                        title: '正在删除...'
                      });

                      // 强制本地删除
                      await deviceStore.deleteDevice(device.id, true);

                      Taro.hideLoading();
                      showToast({
                        title: '设备已删除（仅本地）',
                        icon: 'success',
                        duration: 2000
                      });
                    } catch (localError) {
                      console.error('本地删除失败:', localError);
                      Taro.hideLoading();
                      showToast({
                        title: '删除失败',
                        icon: 'none',
                        duration: 2000
                      });
                    }
                  }
                }
              });
            } else {
              // 其他错误类型
              let errorMessage = '删除失败，请重试';
              if (error.message && error.message.includes('设备不存在')) {
                errorMessage = '设备不存在';
              }

              showToast({
                title: errorMessage,
                icon: 'none',
                duration: 3000
              });
            }
          }
        }
      }
    });
  };

  return (
    <View className='index-page'>
      {/* 顶部操作栏 */}
      <View className='top-bar'>
        <View className='placeholder'></View>
        <View className='actions'>
          <View className='action-item' onClick={handleMore}>
            <AtIcon value='add' size='20' color='#333'></AtIcon>
            <Text className='action-text'>更多</Text>
          </View>
          <View className='action-item' onClick={handleScanCode}>
            <AtIcon value='iphone' size='20' color='#333'></AtIcon>
            <Text className='action-text'>扫码充电</Text>
          </View>
        </View>
      </View>

      {/* 设备状态栏 */}
      {deviceStore.devices.length > 0 && (
        <View className='device-status-bar'>
          <View className='status-info'>
            <Text className='status-label'>设备状态</Text>
            <Text className='status-count'>
              在线: {deviceStore.devices.filter(d => d.connected).length} /
              总计: {deviceStore.devices.length}
            </Text>
          </View>
        </View>
      )}

      {/* 设备列表 */}
      <ScrollView className='device-list' scrollY>
        {deviceStore.loading ? (
          <View className='loading-state'>
            <AtIcon value='loading-3' size='60' color='#1890ff'></AtIcon>
            <Text className='loading-title'>正在加载设备...</Text>
          </View>
        ) : deviceStore.devices.length === 0 ? (
          <View className='empty-state'>
            <AtIcon value='bluetooth' size='60' color='#ccc'></AtIcon>
            <Text className='empty-title'>暂无设备</Text>
            <Text className='empty-desc'>点击"扫码充电"添加新设备</Text>
          </View>
        ) : (
          deviceStore.devices.map(device => (
            <View
              className='device-card clickable'
              key={device.id}
              onClick={() => {
                // 设置为当前设备
                deviceStore.setCurrentDevice(device);
                showToast({
                  title: `${device.name}`,
                  icon: 'success',
                  duration: 1500,
                });
              }}
              onLongPress={() => handleLongPressDevice(device)}
            >
              <View className='device-header'>
                <Text className='device-title'>我的设备</Text>
                <View className='device-controls'>
                  <View className='device-status'>
                    <View className={`status-dot ${device.connected ? 'online' : 'offline'}`}></View>
                    <Text className='status-text'>{device.connected ? '在线' : '离线'}</Text>
                  </View>
                  <View
                    className='device-refresh'
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      deviceStore.checkSingleDeviceConnectionStatus(device.id);
                    }}
                  >
                    <AtIcon value='reload' size='16' color='#666'></AtIcon>
                  </View>
                  <View
                    className='device-settings'
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      navigateToDeviceManage(device.id);
                    }}
                  >
                    <AtIcon value='settings' size='20' color='#333'></AtIcon>
                  </View>
                </View>
              </View>
              <View className='device-info'>
                <View className='device-details'>
                  <Text className='device-name'>{device.name}</Text>
                  <Text className='device-sn'>SN: {device.serialNumber}</Text>
                  <Text 
                    className='device-hint' 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡
                      handleSelectDevice(device);
                    }}
                  >
                    {device.connected ? '点击重新连接 | 长按删除' : '点击进行蓝牙连接 | 长按删除'}
                  </Text>
                </View>
                <View
                  className={`power-button ${device.powerOn ? 'on' : 'off'} ${!device.connected ? 'disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    handleTogglePower(device.id);
                  }}
                >
                  <AtIcon value='lightning-bolt' size='20' color={device.powerOn && device.connected ? '#52c41a' : '#999'}></AtIcon>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 用电信息卡片 */}
      <View className='usage-card'>
        <View className='usage-header'>
          <Text className='usage-title'>用电信息</Text>
          <Text className='usage-subtitle'>{deviceStore.currentDevice?.name || '未选择设备'}</Text>
        </View>
        <View className='usage-content'>
          <View className='realtime-data'>
            <View className='data-item'>
              <Text className='data-label'>功率</Text>
              <Text className='data-value'>{deviceStore.currentDevice?.currentPower || '0.0'}W</Text>
            </View>
            <View className='data-item'>
              <Text className='data-label'>电压</Text>
              <Text className='data-value'>{deviceStore.currentDevice?.currentVoltage || '0.0'}V</Text>
            </View>
            <View className='data-item'>
              <Text className='data-label'>电流</Text>
              <Text className='data-value'>{deviceStore.currentDevice?.currentAmpere || '0.00'}A</Text>
            </View>
          </View>
          <View className='daily-usage'>
            <Text className='usage-value'>{deviceStore.getDailyUsage().toFixed(2)}</Text>
            <Text className='usage-unit'>kWh</Text>
          </View>
        </View>
      </View>

      <View className='firmware-upgrade-button'>
        <AtButton className='firmware-button' onClick={() => {}}>
          固件升级
        </AtButton>
      </View>

      {/* NFC功能卡片 */}
      <View className='nfc-card'>
        <View className='nfc-header'>
          <AtIcon value='lightning-bolt' size='20' color='#333'></AtIcon>
          <Text className='nfc-title'>NFC功能(待定)</Text>
        </View>
        <View className='nfc-actions'>
          <AtButton className='nfc-button' onClick={handleCopyCard}>复制卡片</AtButton>
          <AtButton className='nfc-button' onClick={handleAddTerminal}>添加终端</AtButton>
        </View>
      </View>

      {/* 设备功能卡片 - 根据设备类型显示不同内容 */}
      {deviceStore.currentDevice && (
        <View className='device-function-card'>
          {deviceStore.currentDevice.type === 'animal' ? (
            // 动画选择UI
            <>
              <View className='function-header'>
                <Text className='function-title'>动画选择</Text>
                <Text className='function-subtitle'>当前选择: {animationArray[deviceStore.currentDevice.selectedAnimation || 0]?.name || '未选择'}</Text>
              </View>
              <View className='animation-grid'>
                {animationArray.map((animation, index) => (
                  <View 
                    key={animation.index}
                    className={`animation-item ${deviceStore.currentDevice.selectedAnimation === animation.index ? 'selected' : ''}`}
                    onClick={() => {
                      handleAnimationSelect(animation.index);
                      // 更新设备的选中动画
                      deviceStore.updateDeviceSettings(deviceStore.currentDevice.id, { selectedAnimation: animation.index });
                    }}
                  >
                    <View className='animation-icon'>
                      {animation.index === 1 && <View className='emoji-icon'>😊</View>}
                      {animation.index === 2 && <View className='emoji-icon'>🐕</View>}
                      {animation.index === 3 && <View className='emoji-icon'>🌈</View>}
                      {animation.index === 4 && <View className='emoji-icon'>💓</View>}
                      {animation.index === 5 && <View className='emoji-icon'>🌊</View>}
                      {animation.index === 6 && <View className='emoji-icon'>✨</View>}
                      {animation.index === 7 && <View className='emoji-icon'>🫁</View>}
                      {animation.index === 8 && <View className='emoji-icon'>⚫</View>}
                    </View>
                    <Text className='animation-name'>{animation.name}</Text>
                  </View>
                ))}
              </View>
              <View className='function-more'>
                <Text className='more-text'>更多</Text>
                <AtIcon value='chevron-right' size='16' color='#999'></AtIcon>
              </View>
            </>
          ) : (
            // 颜色选择UI
            <>
              <View className='function-header'>
                <Text className='function-title'>颜色选择</Text>
                <Text className='function-subtitle'>当前颜色: {deviceStore.currentDevice.indicatorColor || '未设置'}</Text>
              </View>
              <View className='color-selector'>
                <Picker 
                  mode='selector' 
                  range={colorArray.map(c => c.color)} 
                  value={colorArray.findIndex(c => c.color === deviceStore.currentDevice.indicatorColor) || 0} 
                  onChange={handleColorChange}
                >
                  <View className='picker-view'>
                    <Text className='picker-text'>{deviceStore.currentDevice.indicatorColor || '请选择颜色'}</Text>
                    <AtIcon value='chevron-down' size='16' color='#999'></AtIcon>
                  </View>
                </Picker>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
});

export default Index;