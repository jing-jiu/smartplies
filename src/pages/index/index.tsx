import { View, Text, ScrollView } from '@tarojs/components';
import { useLoad, useDidShow, usePullDownRefresh, stopPullDownRefresh, showToast } from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AtButton, AtIcon } from 'taro-ui';
import { deviceStore } from '../../stores/deviceStore';
import { connectToDevice, getAvailableDevices, initBluetooth, sendCommand, startDiscover, stopDiscover } from '../../services/bluetooth';
import './index.scss';
import Taro from '@tarojs/taro';

const Index = observer(() => {
  // 页面加载时初始化蓝牙
  useLoad(() => {
    initBluetooth()
      .then(() => {
        deviceStore.setBluetoothReady(true);
        console.log('蓝牙初始化成功');
      })
      .catch(err => {
        console.error('蓝牙初始化失败', err);
      });
  });

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

  // 跳转到我的页面
  const navigateToProfile = () => {
    Taro.switchTab({
      url: '/pages/profile/index'
    });
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
  const navigateToDeviceManage = (deviceId) => {
    Taro.navigateTo({
      url: `/pages/device/manage?deviceId=${deviceId}`
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
          
          // 解析扫码结果，获取设备ID
          // 假设二维码内容格式为：smartplies:deviceId:serialNumber
          // 或者简单的只包含设备ID
          let deviceId = res.result;
          let serialNumber = '';
          
          if (res.result.startsWith('smartplies:')) {
            const parts = res.result.split(':');
            if (parts.length >= 2) {
              deviceId = parts[1];
              serialNumber = parts.length >= 3 ? parts[2] : '';
            }
          }
          
          if (!deviceId) {
            showToast({
              title: '无效的设备码',
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
              
              // 查找匹配的设备
              const matchedDevice = availableDevices.devices.find(d => d.deviceId === deviceId);
              
              if (matchedDevice) {
                 // 连接设备
                 await connectToDevice(matchedDevice.deviceId);
                 
                 // 添加设备到设备列表
                 const newDevice = deviceStore.addAndConnectDevice({
                   deviceId: matchedDevice.deviceId,
                   name: matchedDevice.name || undefined,
                   serialNumber: serialNumber || undefined
                 });
                 
                 // 发送初始化命令
                 try {
                   await sendCommand(matchedDevice.deviceId, 'INIT');
                   console.log('设备初始化命令发送成功');
                 } catch (error) {
                   console.error('设备初始化命令发送失败:', error);
                   // 即使命令发送失败，我们仍然认为设备添加成功
                 }
                 
                 // 停止搜索
                 await stopDiscover();
                 
                 // 隐藏加载提示
                 Taro.hideLoading();
                 
                 // 显示成功提示
                 showToast({
                   title: `成功添加设备: ${newDevice.name}`,
                   icon: 'success',
                   duration: 2000
                 });
               } else {
                 // 未找到设备
                 // 停止搜索
                 await stopDiscover();
                 
                 // 隐藏加载提示
                 Taro.hideLoading();
                 
                 showToast({
                   title: '未找到设备，请确保设备已开启',
                   icon: 'none',
                   duration: 2000
                 });
               }
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
   const handleTogglePower = (deviceId: string) => {
     const success = deviceStore.toggleDevicePower(deviceId);
     if (success) {
       const device = deviceStore.devices.find(d => d.id === deviceId);
       showToast({
         title: `${device?.name} 电源已${device?.powerOn ? '开启' : '关闭'}`,
         icon: 'success',
         duration: 2000
       });
     } else {
       showToast({
         title: '设备离线，无法控制',
         icon: 'none',
         duration: 2000
       });
     }
   };

   // 选择当前设备
   const handleSelectDevice = (device) => {
     deviceStore.setCurrentDevice(device);
     showToast({
       title: `已选择 ${device.name}`,
       icon: 'success',
       duration: 2000
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
   
       {/* 设备列表 */}
       <ScrollView className='device-list' scrollY>
         {deviceStore.devices.map(device => (
           <View 
             className='device-card' 
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
               </View>
               <View 
                 className={`power-button ${device.powerOn ? 'on' : 'off'}`}
                 onClick={(e) => {
                   e.stopPropagation(); // 阻止事件冒泡
                   handleTogglePower(device.id);
                 }}
               >
                 <AtIcon value='lightning-bolt' size='20' color={device.powerOn ? '#52c41a' : '#999'}></AtIcon>
               </View>
             </View>
           </View>
         ))}
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