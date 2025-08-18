import { View, Text, Switch, Slider, Picker } from '@tarojs/components';
import Taro, { useLoad, useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { observer } from 'mobx-react';
import { AtIcon, AtButton } from 'taro-ui';
import { deviceStore } from '../../stores/deviceStore';
import { bluetoothManager } from '../../services/bluetooth';
import './manage.scss';

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

const DeviceManage = observer(() => {
  const router = useRouter();
  const [device, setDevice] = useState<any>(null);
  const [powerOn, setPowerOn] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [indicatorEnabled, setIndicatorEnabled] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [brightnessValue, setBrightnessValue] = useState(70);
  const [selectedMode, setSelectedMode] = useState(1);
  const [selectedDelay, setSelectedDelay] = useState('关');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('00:00');

  useLoad(() => {
    console.log('设备管理页面加载');
    // 首先从路由参数获取设备ID
    let deviceId = router.params.deviceId;

    // 如果路由参数中没有设备ID，尝试从本地存储获取
    if (!deviceId) {
      try {
        deviceId = Taro.getStorageSync('currentDeviceId');
        console.log('从本地存储获取设备ID:', deviceId);
      } catch (err) {
        console.error('从本地存储获取设备ID失败:', err);
      }
    }

    if (deviceId) {
      // 从设备存储中获取设备信息
      const foundDevice = deviceStore.devices.find(d => d.id === deviceId);
      if (foundDevice) {
        setDevice(foundDevice);
        setPowerOn(foundDevice.powerOn);
        setIndicatorEnabled(foundDevice.indicatorBrightness > 0);
        // 根据设备的indicatorColor找到对应的颜色索引
        const colorIndex = colorArray.findIndex(c => c.color === foundDevice.indicatorColor) || 0;
        setSelectedColorIndex(colorIndex);
        setBrightnessValue(foundDevice.indicatorBrightness);
        setSelectedMode(foundDevice.mode);
        setTimerEnabled(foundDevice.schedule && foundDevice.schedule.length > 0);
        setSelectedDelay(foundDevice.delayOffTime || '关');

        // 如果设备有定时信息，设置开始和结束时间
        if (foundDevice.schedule && foundDevice.schedule.length > 0) {
          setStartTime(foundDevice.schedule[0].startTime || '00:00');
          setEndTime(foundDevice.schedule[0].endTime || '00:00');
        }
      } else {
        Taro.showToast({
          title: '设备不存在',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          Taro.redirectTo({
            url: '/pages/index/index'
          });
        }, 2000);
      }
    } else {
      Taro.showToast({
        title: '未找到设备信息',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        Taro.redirectTo({
          url: '/pages/index/index'
        });
      }, 2000);
    }
  });

  // 处理电源开关变化
  const handlePowerChange = async (value) => {
    setPowerOn(value);
    if (device) {
      // 更新设备状态
      deviceStore.updateDeviceSettings(device.id, { powerOn: value });

      // 如果设备已连接，发送蓝牙指令
      if (device.connected) {
        try {
          const command = value ? 'CHARGE:1\\r\\n' : 'CHARGE:0\\r\\n';
          console.log(`发送电源控制命令: ${command}`);
          await bluetoothManager.sendMessage(command);
          console.log('电源控制命令发送成功');

          Taro.showToast({
            title: `电源已${value ? '开启' : '关闭'}`,
            icon: 'success',
            duration: 2000
          });
        } catch (error) {
          console.error('发送电源控制命令失败:', error);
          // 如果蓝牙命令发送失败，回滚状态
          setPowerOn(!value);
          deviceStore.updateDeviceSettings(device.id, { powerOn: !value });
          Taro.showToast({
            title: '电源控制失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    }
  };

  // 处理定时开关变化
  const handleTimerChange = (value) => {
    setTimerEnabled(value);
    // 更新设备定时状态
    if (device) {
      if (value) {
        // 启用定时
        deviceStore.updateDeviceSettings(device.id, {
          schedule: [{
            startTime: startTime,
            endTime: endTime,
            enabled: true
          }]
        });
      } else {
        // 禁用定时
        deviceStore.updateDeviceSettings(device.id, { schedule: [] });
      }
    }
  };

  // 处理开始时间变化
  const handleStartTimeChange = (e) => {
    const newTime = e.detail.value;
    setStartTime(newTime);
    if (device && timerEnabled) {
      const currentSchedule = device.schedule || [];
      if (currentSchedule.length === 0) {
        deviceStore.updateDeviceSettings(device.id, {
          schedule: [{
            startTime: newTime,
            endTime: endTime,
            enabled: true
          }]
        });
      } else {
        const updatedSchedule = [...currentSchedule];
        updatedSchedule[0].startTime = newTime;
        deviceStore.updateDeviceSettings(device.id, { schedule: updatedSchedule });
      }
    }
  };

  // 处理结束时间变化
  const handleEndTimeChange = (e) => {
    const newTime = e.detail.value;
    setEndTime(newTime);
    if (device && timerEnabled) {
      const currentSchedule = device.schedule || [];
      if (currentSchedule.length === 0) {
        deviceStore.updateDeviceSettings(device.id, {
          schedule: [{
            startTime: startTime,
            endTime: newTime,
            enabled: true
          }]
        });
      } else {
        const updatedSchedule = [...currentSchedule];
        updatedSchedule[0].endTime = newTime;
        deviceStore.updateDeviceSettings(device.id, { schedule: updatedSchedule });
      }
    }
  };

  // 处理蓝牙绑定开关变化
  const handleBluetoothChange = (value) => {
    setBluetoothEnabled(value);
    // 这里可以添加蓝牙绑定的逻辑
  };

  // 处理指示灯开关变化
  const handleIndicatorChange = (value) => {
    setIndicatorEnabled(value);
    if (!value) {
      // 如果关闭指示灯，将亮度设为0
      setBrightnessValue(0);
      if (device) {
        deviceStore.updateDeviceSettings(device.id, { indicatorBrightness: 0 });
      }
    } else {
      // 如果开启指示灯，恢复之前的亮度
      setBrightnessValue(70);
      if (device) {
        deviceStore.updateDeviceSettings(device.id, { indicatorBrightness: 70 });
      }
    }
  };

  // 处理颜色选择变化
  const handleColorChange = async (e) => {
    const selectedIndex = e.detail.value;
    setSelectedColorIndex(selectedIndex);

    if (device && device.connected) {
      const selectedColor = colorArray[selectedIndex];
      deviceStore.updateDeviceSettings(device.id, { indicatorColor: selectedColor.color });

      try {
        // 发送蓝牙指令
        const command = `SET_LED:${selectedColor.index}\\r\\n`;
        console.log(`发送LED颜色控制命令: ${command}`);
        await bluetoothManager.sendMessage(command);
        console.log('LED颜色控制命令发送成功');

        Taro.showToast({
          title: `颜色已设置为${selectedColor.color}`,
          icon: 'success',
          duration: 2000
        });
      } catch (error) {
        console.error('发送LED颜色控制命令失败:', error);
        Taro.showToast({
          title: '颜色设置失败',
          icon: 'none',
          duration: 2000
        });
      }
    }
  };

  // 处理亮度滑块变化
  const handleBrightnessChange = (value) => {
    setBrightnessValue(value);
    if (device) {
      deviceStore.updateDeviceSettings(device.id, { indicatorBrightness: value });
      
      // 如果设备已连接，发送蓝牙指令
      if (device.connected) {
        try {
          const command = `SET_BRIGHTNESS:${value}\\r\\n`;
          console.log(`发送亮度控制命令: ${command}`);
          bluetoothManager.sendMessage(command).then(() => {
            console.log('亮度控制命令发送成功');
          }).catch(error => {
            console.error('发送亮度控制命令失败:', error);
          });
        } catch (error) {
          console.error('亮度设置失败:', error);
        }
      }
    }
  };

  // 处理模式选择
  const handleModeSelect = async (mode) => {
    setSelectedMode(mode);
    if (device) {
      deviceStore.updateDeviceSettings(device.id, { mode: mode });

      // 如果设备已连接，发送蓝牙指令
      if (device.connected) {
        try {
          const command = `SET_DEV_MODE:${mode}\\r\\n`;
          console.log(`发送模式切换命令: ${command}`);
          await bluetoothManager.sendMessage(command);
          console.log('模式切换命令发送成功');

          Taro.showToast({
            title: `已切换到模式${mode}`,
            icon: 'success',
            duration: 2000
          });
        } catch (error) {
          console.error('发送模式切换命令失败:', error);
          Taro.showToast({
            title: '模式切换失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    }
  };

  // 处理延时关闭选择
  const handleDelaySelect = (delay) => {
    setSelectedDelay(delay);
    if (device) {
      // 更新设备延时关闭设置
      deviceStore.updateDeviceSettings(device.id, { delayOffTime: delay });
      
      // 如果设备已连接，发送蓝牙指令
      if (device.connected) {
        try {
          let delayValue = 0;
          switch (delay) {
            case '1min':
              delayValue = 1;
              break;
            case '5min':
              delayValue = 5;
              break;
            case '30min':
              delayValue = 30;
              break;
            default:
              delayValue = 0; // '关'
          }
          
          const command = `SET_DELAY_OFF:${delayValue}\\r\\n`;
          console.log(`发送延时关闭命令: ${command}`);
          bluetoothManager.sendMessage(command).then(() => {
            console.log('延时关闭命令发送成功');
            Taro.showToast({
              title: `延时关闭已设置为${delay}`,
              icon: 'success',
              duration: 2000
            });
          }).catch(error => {
            console.error('发送延时关闭命令失败:', error);
            Taro.showToast({
              title: '延时关闭设置失败',
              icon: 'none',
              duration: 2000
            });
          });
        } catch (error) {
          console.error('延时关闭设置失败:', error);
        }
      }
    }
  };

  // HSL转HEX颜色
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // 断开蓝牙连接
  const handleDisconnectBluetooth = async () => {
    if (!device) return;

    Taro.showModal({
      title: '提示',
      content: '确定要断开蓝牙连接吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({
            title: '断开连接中...'
          });

          try {
            await bluetoothManager.disconnectCurrentDevice();
            
            // 更新设备连接状态
            deviceStore.updateDeviceSettings(device.id, { connected: false });
            
            Taro.hideLoading();
            Taro.showToast({
              title: '蓝牙已断开',
              icon: 'success',
              duration: 1500
            });

            // 延迟返回首页
            setTimeout(() => {
              handleBack();
            }, 1500);
          } catch (error) {
            console.error('断开蓝牙失败:', error);
            Taro.hideLoading();
            Taro.showToast({
              title: '断开连接失败',
              icon: 'none',
              duration: 2000
            });
          }
        }
      }
    });
  };

  // 保存设备设置并同步到云数据库
  const handleSaveSettings = async () => {
    if (!device) return;

    try {
      // 显示加载提示
      Taro.showLoading({
        title: '保存设置中...'
      });

      // 同步设备信息到云数据库
      if (process.env.TARO_ENV === 'weapp') {
        try {
          await deviceStore.syncDeviceToCloud(device);
          console.log('设备信息已同步到云数据库');
        } catch (syncError) {
          console.error('同步设备信息到云数据库失败:', syncError);
          // 同步失败不影响用户体验，只记录日志
        }
      }

      Taro.hideLoading();
      Taro.showToast({
        title: '设置已保存',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回首页
      setTimeout(() => {
        handleBack();
      }, 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
      Taro.hideLoading();
      Taro.showToast({
        title: '保存设置失败',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 返回上一页
  const handleBack = () => {
    // 使用redirectTo返回首页，避免页面堆栈问题
    Taro.redirectTo({
      url: '/pages/index/index',
      success: () => {
        console.log('成功返回首页');
      },
      fail: (err) => {
        console.error('返回首页失败:', err);
        // 如果redirectTo失败，尝试使用switchTab
        Taro.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  };

  return (
    <View className='device-manage-page'>
      <View className='settings-container'>
        <View className='setting-item'>
          <Text className='setting-label'>电源</Text>
          <Switch checked={powerOn} onChange={e => handlePowerChange(e.detail.value)} color='#636AE8FF' />
        </View>

        <View className='setting-item'>
          <View className='setting-label-container'>
            <Text className='setting-label'>定时开关</Text>
            <View className='setting-time'>
              <AtIcon value='clock' size='14' color='#666'></AtIcon>
              <Picker mode='time' value={startTime} onChange={handleStartTimeChange}>
                <Text className='time-text'>{startTime}</Text>
              </Picker>
              <Text className='time-separator'> ~ </Text>
              <Picker mode='time' value={endTime} onChange={handleEndTimeChange}>
                <Text className='time-text'>{endTime}</Text>
              </Picker>
              <Text className='time-text'>每天</Text>
            </View>
          </View>
          <Switch checked={timerEnabled} onChange={e => handleTimerChange(e.detail.value)} color='#636AE8FF' />
        </View>

        <View className='setting-item'>
          <Text className='setting-label'>蓝牙绑定</Text>
          <Switch checked={bluetoothEnabled} onChange={e => handleBluetoothChange(e.detail.value)} color='#636AE8FF' />
        </View>

        <View className='setting-item'>
          <Text className='setting-label'>指示灯显示</Text>
          <Switch checked={indicatorEnabled} onChange={e => handleIndicatorChange(e.detail.value)} color='#636AE8FF' />
        </View>

        <View className='setting-item'>
          <Text className='setting-label'>颜色</Text>
          <Picker mode='selector' range={colorArray.map(c => c.color)} value={selectedColorIndex} onChange={handleColorChange}>
            <View className='picker-view'>
              <Text className='picker-text'>{colorArray[selectedColorIndex]?.color || '请选择颜色'}</Text>
              <AtIcon value='chevron-down' size='16' color='#999'></AtIcon>
            </View>
          </Picker>
        </View>

        <View className='slider-item'>
          <View className='slider-header'>
            <Text className='slider-label'>亮度</Text>
            <Text className='slider-value'>{brightnessValue}%</Text>
          </View>
          <Slider value={brightnessValue} activeColor='#636AE8FF' backgroundColor='#e9e9e9' blockSize={28} blockColor='#636AE8FF' activeHeight={6} onChange={e => handleBrightnessChange(e.detail.value)} />
        </View>

        <View className='mode-selector'>
          <Text className='mode-title'>模式</Text>
          <View className='mode-buttons'>
            <View className={`mode-button ${selectedMode === 1 ? 'active' : ''}`} onClick={() => handleModeSelect(1)}>
              <Text>模式 1</Text>
            </View>
            <View className={`mode-button ${selectedMode === 2 ? 'active' : ''}`} onClick={() => handleModeSelect(2)}>
              <Text>模式 2</Text>
            </View>
            <View className={`mode-button ${selectedMode === 3 ? 'active' : ''}`} onClick={() => handleModeSelect(3)}>
              <Text>模式 3</Text>
            </View>
            <View className={`mode-button ${selectedMode === 4 ? 'active' : ''}`} onClick={() => handleModeSelect(4)}>
              <Text>模式 4</Text>
            </View>
          </View>
        </View>

        <View className='delay-selector'>
          <Text className='delay-title'>灯延迟关闭时间</Text>
          <View className='delay-buttons'>
            <View className={`delay-button ${selectedDelay === '关' ? 'active' : ''}`} onClick={() => handleDelaySelect('关')}>
              <Text>关</Text>
            </View>
            <View className={`delay-button ${selectedDelay === '1min' ? 'active' : ''}`} onClick={() => handleDelaySelect('1min')}>
              <Text>1min</Text>
            </View>
            <View className={`delay-button ${selectedDelay === '5min' ? 'active' : ''}`} onClick={() => handleDelaySelect('5min')}>
              <Text>5min</Text>
            </View>
            <View className={`delay-button ${selectedDelay === '30min' ? 'active' : ''}`} onClick={() => handleDelaySelect('30min')}>
              <Text>30min</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 底部按钮区域 */}
      <View className='bottom-buttons'>
        <AtButton className='disconnect-button' onClick={handleDisconnectBluetooth}>断开蓝牙</AtButton>
        <AtButton className='save-button' type='primary' onClick={handleSaveSettings}>保存设置</AtButton>
      </View>
    </View>
  );
});

export default DeviceManage;