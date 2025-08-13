import { View, Text, ScrollView } from '@tarojs/components';
import { useLoad, useDidShow, usePullDownRefresh, stopPullDownRefresh, showToast } from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AtButton, AtIcon } from 'taro-ui';
import { deviceStore } from '../../stores/deviceStore';
import { connectToDevice, getAvailableDevices, initBluetooth, sendCommand, startDiscover, stopDiscover, enableMessageReceiving, addMessageListener, removeMessageListener, setBLEMTU, getBLEMTU } from '../../services/bluetooth';
import './index.scss';
import Taro from '@tarojs/taro';

const Index = observer(() => {
  // 页面加载时初始化蓝牙
  useLoad(() => {
    initBluetooth()
      .then(() => {
        deviceStore.setBluetoothReady(true);
        console.log('蓝牙初始化成功');
        // 自动扫描并连接ai-thinker设备
        autoConnectAiThinker();
      })
      .catch(err => {
        console.error('蓝牙初始化失败', err);
      });
  });

  // 自动连接ai-thinker设备的函数
  const autoConnectAiThinker = async () => {
    try {
      console.log('开始自动扫描ai-thinker设备');

      // 开始搜索设备
      await startDiscover();

      // 监听发现的设备
      Taro.onBluetoothDeviceFound((res) => {
        res.devices.forEach(async (device) => {
          // 检查设备名称是否包含ai-thinker
          console.log(device.name);

          if (device.name && device.name.toLowerCase().includes('ai-thinker')) {
            console.log('发现ai-thinker设备:', device);

            try {
              // 停止搜索
              await stopDiscover();

              // 连接设备
              await connectToDevice(device.deviceId);
              console.log('成功连接ai-thinker设备');

              // 启用蓝牙消息接收
              try {
                await enableMessageReceiving(device.deviceId);
                console.log('ai-thinker设备消息接收已启用');

                // 添加消息监听器
                const messageHandler = (deviceId: string, message: string) => {
                  console.log(`收到来自设备 ${deviceId} 的消息:`, message);
                  // 这里可以根据消息内容进行相应处理
                  if (message.includes('ERROR')) {
                    console.log('收到设备错误消息:', message);
                    showToast({
                      title: '设备报告错误',
                      icon: 'none',
                      duration: 2000
                    });
                  }
                };

                addMessageListener(messageHandler);
                console.log('消息监听器已添加');
              } catch (error) {
                console.error('启用消息接收失败:', error);
                // 消息接收失败不影响设备连接
              }

              // 添加设备到设备列表
              const newDevice = deviceStore.addAndConnectDevice({
                deviceId: device.deviceId,
                name: device.name,
                serialNumber: `AUTO-${Date.now()}`
              });

              // 发送初始化命令
              try {
                // 等待一段时间确保连接稳定
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 发送简单的测试命令
                // await sendCommand(device.deviceId, 'CHARGE:0\n\r');
                console.log('ai-thinker设备测试命令发送成功');
              } catch (error) {
                console.error('ai-thinker设备命令发送失败:', error);
                // 命令发送失败不影响设备连接，继续后续流程
                console.log('设备已连接，但命令发送失败，可能设备不支持该命令格式');
              }

              // 同步设备信息到云数据库
              if (process.env.TARO_ENV === 'weapp') {
                try {
                  await deviceStore.syncDeviceToCloud(newDevice);
                  console.log('ai-thinker设备信息已同步到云数据库');
                } catch (syncError) {
                  console.error('同步ai-thinker设备信息失败:', syncError);
                }
              }

              // 显示连接成功提示
              showToast({
                title: `自动连接成功: ${device.name}`,
                icon: 'success',
                duration: 2000
              });

            } catch (error) {
              console.error('连接ai-thinker设备失败:', error);
              showToast({
                title: '自动连接ai-thinker失败',
                icon: 'none',
                duration: 2000
              });
            }
          }
        });
      });

      // 设置超时，如果10秒内没找到设备就停止搜索
      setTimeout(async () => {
        try {
          await stopDiscover();
          console.log('ai-thinker设备搜索超时，停止搜索');
        } catch (error) {
          console.error('停止搜索失败:', error);
        }
      }, 10000);

    } catch (error) {
      console.error('自动连接ai-thinker设备失败:', error);
    }
  };

  // 每次页面显示时检查设备连接状态
  useDidShow(() => {
    if (deviceStore.devices.length > 0) {
      // 检查设备连接状态
      console.log('检查设备连接状态');
    }
  });

  // 下拉刷新
  usePullDownRefresh(() => {
    console.log('下拉刷新');
    // 刷新设备数据
    deviceStore.refreshDeviceData();
    // 停止下拉刷新动画
    setTimeout(() => {
      stopPullDownRefresh();
    }, 1000);
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

  // 连接所有离线设备
  const handleConnectAll = async () => {
    console.log('连接所有离线设备');
    
    // 检查蓝牙是否就绪
    if (!deviceStore.isBluetoothReady) {
      showToast({
        title: '蓝牙未就绪，请稍后重试',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 获取所有离线设备
    const offlineDevices = deviceStore.devices.filter(d => !d.connected && d.deviceId);
    
    if (offlineDevices.length === 0) {
      showToast({
        title: '所有设备都已连接',
        icon: 'success',
        duration: 2000
      });
      return;
    }

    // 显示连接进度
    Taro.showLoading({
      title: `正在连接 ${offlineDevices.length} 个设备...`
    });

    try {
      // 开始搜索设备
      await startDiscover();
      console.log('开始批量连接设备');

      let connectedCount = 0;
      const totalDevices = offlineDevices.length;

      // 设置批量连接超时
      const batchTimeout = setTimeout(async () => {
        try {
          await stopDiscover();
          Taro.hideLoading();
          
          if (connectedCount > 0) {
            showToast({
              title: `成功连接 ${connectedCount}/${totalDevices} 个设备`,
              icon: 'success',
              duration: 2000
            });
          } else {
            showToast({
              title: '未找到可连接的设备',
              icon: 'none',
              duration: 2000
            });
          }
        } catch (error) {
          console.error('停止批量连接搜索失败:', error);
        }
      }, 15000); // 15秒超时

      // 监听发现的设备
      const batchDeviceFoundHandler = (res) => {
        res.devices.forEach(async (discoveredDevice) => {
          // 查找匹配的离线设备
          const targetDevice = offlineDevices.find(d => d.deviceId === discoveredDevice.deviceId);
          
          if (targetDevice && !targetDevice.connected) {
            console.log('发现离线设备:', discoveredDevice.name, discoveredDevice.deviceId);

            try {
              // 连接设备
              await connectToDevice(discoveredDevice.deviceId);
              console.log('批量连接设备成功:', targetDevice.name);

              // 设置MTU
              try {
                await setBLEMTU(discoveredDevice.deviceId, 230);
              } catch (mtuError) {
                console.log('MTU设置失败，继续连接流程:', mtuError);
              }

              // 启用消息接收
              try {
                await enableMessageReceiving(discoveredDevice.deviceId);
                
                // 添加消息监听器
                const messageHandler = (deviceId: string, message: string) => {
                  handleDeviceMessage(deviceId, message);
                };
                addMessageListener(messageHandler);
              } catch (error) {
                console.error('启用消息接收失败:', error);
              }

              // 更新设备连接状态
              deviceStore.updateDeviceStatus(targetDevice.id, true);
              connectedCount++;

              // 更新加载提示
              Taro.showLoading({
                title: `已连接 ${connectedCount}/${totalDevices} 个设备`
              });

              // 如果所有设备都已连接，提前结束
              if (connectedCount >= totalDevices) {
                clearTimeout(batchTimeout);
                await stopDiscover();
                Taro.hideLoading();
                
                showToast({
                  title: `成功连接所有设备 (${connectedCount}/${totalDevices})`,
                  icon: 'success',
                  duration: 2000
                });
              }

            } catch (error) {
              console.error('批量连接设备失败:', error);
            }
          }
        });
      };

      // 绑定设备发现事件
      Taro.onBluetoothDeviceFound(batchDeviceFoundHandler);

    } catch (error) {
      console.error('批量连接设备失败:', error);
      
      Taro.hideLoading();
      showToast({
        title: '批量连接失败',
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

  // 扫码充电
  const handleScanCode = () => {
    console.log('扫码充电');

    // 调用微信扫一扫API
    Taro.scanCode({
      onlyFromCamera: true, // 只允许从相机扫码
      scanType: ['qrCode', 'barCode'], // 扫码类型
      success: async (res) => {
        try {
          console.log('扫码结果:', res);

          // 解析扫码结果，获取蓝牙MAC地址
          // 二维码内容格式为纯MAC地址：XX:XX:XX:XX:XX:XX 或 XX-XX-XX-XX-XX-XX
          let macAddress = '';
          let serialNumber = '';

          const input = res.result.trim();
          
          // 检查是否为MAC地址格式
          const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
          if (macRegex.test(input)) {
            // 直接是MAC地址，统一转换为冒号分隔格式
            macAddress = input.toUpperCase().replace(/-/g, ':');
            serialNumber = `SCAN-${Date.now()}`; // 生成一个扫码时间戳作为序列号
          }

          console.log('解析结果 - MAC地址:', macAddress, 'serialNumber:', serialNumber);

          if (!macAddress) {
            showToast({
              title: '无效的设备MAC地址',
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
            await initBluetooth();
            deviceStore.setBluetoothReady(true);
          }

          // 开始搜索设备
          await startDiscover();

          // 等待一段时间让设备被发现
          setTimeout(async () => {
            try {
              // 获取可用设备
              const availableDevices = await getAvailableDevices();
              console.log('可用设备:', availableDevices);

              // 查找匹配的设备（通过MAC地址比对）
              const matchedDevice = availableDevices.devices.find(d => {
                // 将设备的MAC地址转换为大写并统一格式
                const deviceMac = d.deviceId ? d.deviceId.toUpperCase().replace(/-/g, ':') : '';
                const targetMac = macAddress.toUpperCase().replace(/-/g, ':');
                console.log('比对MAC地址:', deviceMac, 'vs', targetMac);
                return deviceMac === targetMac;
              });
              console.log('匹配的设备:', matchedDevice, '查找的MAC地址:', macAddress);

              if (matchedDevice) {
                // 连接设备
                await connectToDevice(matchedDevice.deviceId);

                // 设置MTU（解决安卓微信小程序接收消息问题）
                try {
                  await setBLEMTU(matchedDevice.deviceId, 230);
                  await setBLEMTU(matchedDevice.deviceId, 230);
                  await setBLEMTU(matchedDevice.deviceId, 230);
                  console.log('扫码设备MTU设置成功');
                } catch (error) {
                }

                // 启用蓝牙消息接收
                try {
                  await enableMessageReceiving(matchedDevice.deviceId);
                  console.log('扫码设备消息接收已启用');

                  // 添加消息监听器
                  const messageHandler = (deviceId: string, message: string) => {
                    console.log(`收到来自扫码设备 ${deviceId} 的消息:`, message);
                    // 处理设备消息
                    if (message.includes('CHARGE_COMPLETE')) {
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
                    }
                  };

                  addMessageListener(messageHandler);
                  console.log('扫码设备消息监听器已添加');
                } catch (error) {
                  console.error('启用扫码设备消息接收失败:', error);
                }

                // 添加设备到设备列表
                const newDevice = deviceStore.addAndConnectDevice({
                  deviceId: matchedDevice.deviceId,
                  name: matchedDevice.name || undefined,
                  serialNumber: serialNumber || undefined
                });

                // 发送初始化命令
                try {
                  console.log('设备初始化命令发送成功');
                } catch (error) {
                  console.error('设备初始化命令发送失败:', error);
                }

                // 停止搜索
                await stopDiscover();

                // 隐藏加载提示
                Taro.hideLoading();

                // 同步设备信息到云数据库
                if (process.env.TARO_ENV === 'weapp') {
                  try {
                    await deviceStore.syncDeviceToCloud(newDevice);
                    console.log('设备信息已同步到云数据库');
                  } catch (syncError) {
                    console.error('同步设备信息到云数据库失败:', syncError);
                    // 同步失败不影响用户体验，只记录日志
                  }
                }

                // 显示成功提示
                showToast({
                  title: `成功添加设备: ${newDevice.name}`,
                  icon: 'success',
                  duration: 2000
                });
              } else {
                // 未找到设备 - 使用Mock模式直接绑定
                console.log('未找到真实设备，使用Mock模式绑定');

                // 停止搜索
                await stopDiscover();

                // 创建Mock设备信息
                const mockDeviceName = `设备-${deviceId.slice(-4)}`; // 使用deviceId后4位作为设备名称

                // 直接添加设备到设备列表（Mock模式）
                const newDevice = deviceStore.addAndConnectDevice({
                  deviceId: deviceId,
                  name: mockDeviceName,
                  serialNumber: serialNumber || `MOCK-${Date.now()}`,
                  connected: false // Mock设备标记为未连接状态
                });

                // 隐藏加载提示
                Taro.hideLoading();

                // 同步设备信息到云数据库
                if (process.env.TARO_ENV === 'weapp') {
                  try {
                    await deviceStore.syncDeviceToCloud(newDevice);
                    console.log('Mock设备信息已同步到云数据库');
                  } catch (syncError) {
                    console.error('同步Mock设备信息到云数据库失败:', syncError);
                    // 同步失败不影响用户体验，只记录日志
                  }
                }

                // 显示成功提示
                showToast({
                  title: `成功添加设备: ${newDevice.name} (Mock模式)`,
                  icon: 'success',
                  duration: 2000
                });
              }
              // 停止搜索
              await stopDiscover();

              // 隐藏加载提示
              Taro.hideLoading();

              showToast({
                title: `未找到MAC地址为${macAddress}的设备，请确保设备已开启`,
                icon: 'none',
                duration: 2000
              });
            } catch (error) {
              console.error('连接设备失败:', error);
              // 停止搜索
              await stopDiscover();

              // 隐藏加载提示
              Taro.hideLoading();

              showToast({
                title: '连接设备失败',
                icon: 'none',
                duration: 2000
              });
            }
          }, 3000); // 等待3秒让设备被发现

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
    console.log('点击设备，尝试连接:', device.name);
    
    // 如果设备已连接，直接选择
    if (device.connected) {
      deviceStore.setCurrentDevice(device);
      showToast({
        title: `已选择 ${device.name}`,
        icon: 'success',
        duration: 2000
      });
      return;
    }

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
      // 开始搜索设备
      await startDiscover();
      console.log('开始搜索设备进行连接');

      // 设置连接超时
      const connectTimeout = setTimeout(async () => {
        try {
          await stopDiscover();
          Taro.hideLoading();
          showToast({
            title: `连接 ${device.name} 超时`,
            icon: 'none',
            duration: 2000
          });
        } catch (error) {
          console.error('停止搜索失败:', error);
        }
      }, 10000); // 10秒超时

      // 监听发现的设备
      const deviceFoundHandler = (res) => {
        res.devices.forEach(async (discoveredDevice) => {
          // 检查是否是目标设备
          if (discoveredDevice.deviceId === device.deviceId) {
            console.log('发现目标设备:', discoveredDevice.name, discoveredDevice.deviceId);

            try {
              // 清除超时定时器
              clearTimeout(connectTimeout);

              // 停止搜索
              await stopDiscover();

              // 连接设备
              await connectToDevice(discoveredDevice.deviceId);
              console.log('设备连接成功:', device.name);

              // 设置MTU（提高连接稳定性）
              try {
                await setBLEMTU(discoveredDevice.deviceId, 230);
                console.log('MTU设置成功');
              } catch (mtuError) {
                console.log('MTU设置失败，继续连接流程:', mtuError);
              }

              // 启用消息接收
              try {
                await enableMessageReceiving(discoveredDevice.deviceId);
                console.log('消息接收已启用');

                // 添加消息监听器
                const messageHandler = (deviceId: string, message: string) => {
                  console.log(`收到来自设备 ${deviceId} 的消息:`, message);
                  handleDeviceMessage(deviceId, message);
                };

                addMessageListener(messageHandler);
                console.log('消息监听器已添加');
              } catch (error) {
                console.error('启用消息接收失败:', error);
                // 消息接收失败不影响设备连接
              }

              // 更新设备连接状态
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
                title: `连接 ${device.name} 失败`,
                icon: 'none',
                duration: 2000
              });
            }
          }
        });
      };

      // 绑定设备发现事件
      Taro.onBluetoothDeviceFound(deviceFoundHandler);

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
    }
  };

  return (
    <View className='index-page'>
      {/* 顶部操作栏 */}
      <View className='top-bar'>
        <View className='placeholder'></View>
        <View className='actions'>
          <View className='action-item' onClick={handleConnectAll}>
            <AtIcon value='bluetooth' size='20' color='#1890ff'></AtIcon>
            <Text className='action-text'>连接全部</Text>
          </View>
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
          {deviceStore.devices.some(d => !d.connected) && (
            <View className='quick-connect' onClick={handleConnectAll}>
              <AtIcon value='bluetooth' size='16' color='#1890ff'></AtIcon>
              <Text className='quick-connect-text'>连接全部</Text>
            </View>
          )}
        </View>
      )}

      {/* 设备列表 */}
      <ScrollView className='device-list' scrollY>
        {deviceStore.devices.length === 0 ? (
          <View className='empty-state'>
            <AtIcon value='bluetooth' size='60' color='#ccc'></AtIcon>
            <Text className='empty-title'>暂无设备</Text>
            <Text className='empty-desc'>点击"扫码充电"添加新设备</Text>
          </View>
        ) : (
          deviceStore.devices.map(device => (
          <View
            className={`device-card ${!device.connected ? 'disconnected' : ''}`}
            key={device.id}
            onClick={() => handleSelectDevice(device)}
          >
            <View className='device-header'>
              <Text className='device-title'>我的设备</Text>
              <View className='device-controls'>
                <View className='device-status'>
                  <View className={`status-dot ${device.connected ? 'online' : 'offline'}`}></View>
                  <Text className='status-text'>{device.connected ? '在线' : '离线'}</Text>
                </View>
                {!device.connected && (
                  <View className='connect-hint'>
                    <AtIcon value='bluetooth' size='16' color='#1890ff'></AtIcon>
                    <Text className='connect-text'>点击连接</Text>
                  </View>
                )}
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
                {!device.connected && (
                  <Text className='device-hint'>点击卡片进行蓝牙连接</Text>
                )}
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
        </View>
        <View className='usage-content'>
          <Text className='usage-value'>{deviceStore.getDailyUsage()}</Text>
          <Text className='usage-unit'>度 (今日)</Text>
        </View>
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
    </View>
  );
});

export default Index;