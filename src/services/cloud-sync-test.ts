// 云数据库同步测试工具
import Taro from '@tarojs/taro';
import { deviceStore } from '../stores/deviceStore';

export class CloudSyncTester {
  
  // 测试设备同步功能
  static async testDeviceSync(deviceId: string) {
    console.log('=== 开始测试设备云同步功能 ===');
    
    const device = deviceStore.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error('设备不存在:', deviceId);
      return false;
    }
    
    console.log('测试设备:', device.name);
    console.log('设备信息:', device);
    
    try {
      // 测试同步到云数据库
      console.log('开始同步到云数据库...');
      const result = await deviceStore.syncDeviceToCloud(device);
      console.log('同步结果:', result);
      
      if (result && result.success !== false) {
        console.log('✅ 设备同步成功');
        return true;
      } else {
        console.error('❌ 设备同步失败:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ 设备同步异常:', error);
      return false;
    }
  }
  
  // 测试所有设备同步
  static async testAllDevicesSync() {
    console.log('=== 开始测试所有设备云同步 ===');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const device of deviceStore.devices) {
      console.log(`\n测试设备: ${device.name} (${device.id})`);
      
      const success = await this.testDeviceSync(device.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // 等待一段时间避免频繁调用
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== 同步测试结果 ===');
    console.log(`成功: ${successCount} 个设备`);
    console.log(`失败: ${failCount} 个设备`);
    console.log(`总计: ${successCount + failCount} 个设备`);
    
    return { successCount, failCount, total: successCount + failCount };
  }
  
  // 测试设备设置修改和同步
  static async testDeviceSettingsSync(deviceId: string) {
    console.log('=== 开始测试设备设置修改和同步 ===');
    
    const device = deviceStore.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error('设备不存在:', deviceId);
      return false;
    }
    
    console.log('原始设备状态:', {
      powerOn: device.powerOn,
      mode: device.mode,
      indicatorColor: device.indicatorColor,
      indicatorBrightness: device.indicatorBrightness,
      delayOffTime: device.delayOffTime
    });
    
    try {
      // 测试修改设备设置
      console.log('修改设备设置...');
      
      const newSettings = {
        powerOn: !device.powerOn,
        mode: device.mode === 1 ? 2 : 1,
        indicatorColor: device.indicatorColor === 'RED' ? 'BLUE' : 'RED',
        indicatorBrightness: device.indicatorBrightness === 80 ? 60 : 80,
        delayOffTime: device.delayOffTime === '关' ? '1min' : '关'
      };
      
      console.log('新设置:', newSettings);
      
      // 修改设置（这会自动触发云同步）
      deviceStore.updateDeviceSettings(deviceId, newSettings);
      
      console.log('设置修改完成，等待同步...');
      
      // 等待同步完成
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('修改后设备状态:', {
        powerOn: device.powerOn,
        mode: device.mode,
        indicatorColor: device.indicatorColor,
        indicatorBrightness: device.indicatorBrightness,
        delayOffTime: device.delayOffTime
      });
      
      console.log('✅ 设备设置修改和同步测试完成');
      return true;
      
    } catch (error) {
      console.error('❌ 设备设置修改和同步测试失败:', error);
      return false;
    }
  }
  
  // 检查云函数是否可用
  static async checkCloudFunction() {
    console.log('=== 检查云函数可用性 ===');
    
    if (!Taro.cloud) {
      console.error('❌ 云开发环境未初始化');
      return false;
    }
    
    try {
      // 创建一个测试设备信息
      const testDevice = {
        id: 'test-sync-' + Date.now(),
        name: '同步测试设备',
        deviceId: 'test-device-sync',
        connected: false,
        powerOn: false,
        mode: 1,
        currentVoltage: 220,
        currentAmpere: 0,
        indicatorColor: 'GREEN',
        indicatorBrightness: 50,
        schedule: [],
        delayOffTime: '关',
        version: '1.0.0',
        serialNumber: 'TEST-SYNC',
        dailyUsage: 0,
        monthlyUsage: 0,
        yearlyUsage: 0
      };
      
      console.log('测试云函数调用...');
      
      const result = await new Promise((resolve, reject) => {
        Taro.cloud.callFunction({
          name: 'syncDeviceInfo',
          data: {
            deviceInfo: testDevice
          },
          success: resolve,
          fail: reject
        });
      });
      
      console.log('云函数调用结果:', result);
      
      if (result && result.result && result.result.success) {
        console.log('✅ 云函数可用');
        return true;
      } else {
        console.error('❌ 云函数返回错误:', result);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 云函数调用失败:', error);
      return false;
    }
  }
  
  // 运行完整测试
  static async runFullTest() {
    console.log('=== 开始完整的云同步测试 ===');
    
    // 1. 检查云函数可用性
    const cloudAvailable = await this.checkCloudFunction();
    if (!cloudAvailable) {
      console.error('云函数不可用，停止测试');
      return;
    }
    
    // 2. 测试所有设备同步
    const syncResult = await this.testAllDevicesSync();
    
    // 3. 测试设备设置修改和同步
    if (deviceStore.devices.length > 0) {
      const firstDevice = deviceStore.devices[0];
      await this.testDeviceSettingsSync(firstDevice.id);
    }
    
    console.log('\n=== 完整测试结果 ===');
    console.log('云函数可用:', cloudAvailable ? '✅' : '❌');
    console.log('设备同步成功率:', `${syncResult.successCount}/${syncResult.total}`);
    
    return {
      cloudAvailable,
      syncResult
    };
  }
}

// 使用示例：
/*
// 检查云函数可用性
await CloudSyncTester.checkCloudFunction();

// 测试单个设备同步
await CloudSyncTester.testDeviceSync('test-device-001');

// 测试所有设备同步
await CloudSyncTester.testAllDevicesSync();

// 测试设备设置修改和同步
await CloudSyncTester.testDeviceSettingsSync('test-device-001');

// 运行完整测试
await CloudSyncTester.runFullTest();
*/