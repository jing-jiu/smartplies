import { View, Text, Switch, Slider } from '@tarojs/components';
import Taro, { useLoad, useRouter } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { AtIcon, AtButton } from 'taro-ui';
import { deviceStore } from '../../stores/deviceStore';
import './manage.scss';

const DeviceManage = observer(() => {
  const router = useRouter();
  const [device, setDevice] = useState<any>(null);
  const [powerOn, setPowerOn] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [indicatorEnabled, setIndicatorEnabled] = useState(false);
  const [colorValue, setColorValue] = useState(50);
  const [brightnessValue, setBrightnessValue] = useState(70);
  const [selectedMode, setSelectedMode] = useState(1);
  const [selectedDelay, setSelectedDelay] = useState('关');

  useLoad(() => {
    console.log('设备管理页面加载');
    const { deviceId } = router.params;
    if (deviceId) {
      // 从设备存储中获取设备信息
      const foundDevice = deviceStore.devices.find(d => d.id === deviceId);
      if (foundDevice) {
        setDevice(foundDevice);
        setPowerOn(foundDevice.powerOn);
        setIndicatorEnabled(foundDevice.indicatorBrightness > 0);
        setColorValue(parseInt(foundDevice.indicatorColor.replace('#', ''), 16) % 100);
        setBrightnessValue(foundDevice.indicatorBrightness);
        setSelectedMode(foundDevice.mode);
        setTimerEnabled(foundDevice.schedule && foundDevice.schedule.length > 0);
      } else {
        Taro.showToast({
          title: '设备不存在',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => {
          Taro.navigateBack();
        }, 2000);
      }
    }
  });

  // 处理电源开关变化
  const handlePowerChange = (value) => {
    setPowerOn(value);
    if (device) {
      // 更新设备状态
      device.powerOn = value;
      // 这里可以添加向设备发送命令的逻辑
    }
  };

  // 处理定时开关变化
  const handleTimerChange = (value) => {
    setTimerEnabled(value);
    // 这里可以添加定时设置的逻辑
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
        device.indicatorBrightness = 0;
      }
    } else {
      // 如果开启指示灯，恢复之前的亮度
      setBrightnessValue(70);
      if (device) {
        device.indicatorBrightness = 70;
      }
    }
  };

  // 处理颜色滑块变化
  const handleColorChange = (value) => {
    setColorValue(value);
    if (device) {
      // 将滑块值转换为颜色
      const hue = Math.floor((value / 100) * 360);
      const color = hslToHex(hue, 100, 50);
      device.indicatorColor = color;
    }
  };

  // 处理亮度滑块变化
  const handleBrightnessChange = (value) => {
    setBrightnessValue(value);
    if (device) {
      device.indicatorBrightness = value;
    }
  };

  // 处理模式选择
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    if (device) {
      device.mode = mode;
    }
  };

  // 处理延时关闭选择
  const handleDelaySelect = (delay) => {
    setSelectedDelay(delay);
    // 这里可以添加延时关闭的逻辑
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

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className='device-manage-page'>
      <View className='header'>
        <View className='back-button' onClick={handleBack}>
          <AtIcon value='chevron-left' size='24' color='#333'></AtIcon>
        </View>
        <Text className='title'>设备管理</Text>
      </View>

      <View className='settings-container'>
        <View className='setting-item'>
          <Text className='setting-label'>电源</Text>
          <Switch checked={powerOn} onChange={e => handlePowerChange(e.detail.value)} color='#6190E8' />
        </View>

        <View className='setting-item'>
          <View className='setting-label-container'>
            <Text className='setting-label'>定时开关</Text>
            <View className='setting-time'>
              <AtIcon value='clock' size='14' color='#999'></AtIcon>
              <Text className='time-text'>0:00 ~ 0:00</Text>
            </View>
          </View>
          <Switch checked={timerEnabled} onChange={e => handleTimerChange(e.detail.value)} color='#6190E8' />
        </View>

        <View className='setting-item'>
          <Text className='setting-label'>蓝牙绑定</Text>
          <Switch checked={bluetoothEnabled} onChange={e => handleBluetoothChange(e.detail.value)} color='#6190E8' />
        </View>

        <View className='setting-item'>
          <Text className='setting-label'>指示灯显示</Text>
          <Switch checked={indicatorEnabled} onChange={e => handleIndicatorChange(e.detail.value)} color='#6190E8' />
        </View>

        <View className='slider-item'>
          <View className='slider-header'>
            <Text className='slider-label'>颜色</Text>
            <Text className='slider-value'>{colorValue}%</Text>
          </View>
          <Slider value={colorValue} activeColor='#6190E8' backgroundColor='#e9e9e9' blockSize={24} onChange={e => handleColorChange(e.detail.value)} />
        </View>

        <View className='slider-item'>
          <View className='slider-header'>
            <Text className='slider-label'>亮度</Text>
            <Text className='slider-value'>{brightnessValue}%</Text>
          </View>
          <Slider value={brightnessValue} activeColor='#6190E8' backgroundColor='#e9e9e9' blockSize={24} onChange={e => handleBrightnessChange(e.detail.value)} />
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
    </View>
  );
});

export default DeviceManage;