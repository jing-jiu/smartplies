// 设备设置同步测试工具
import { deviceStore } from '../stores/deviceStore';

export class DeviceSettingsSyncTester {
  
  // 测试设备设置同步功能
  static async testDeviceSettingsSync(deviceId: string) {
    console.log('=== 开始测试设备设置同步功能 ===');
    
    const device = deviceStore.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error('设备不存在:', deviceId);
      return;
    }
    
    console.log('原始设备信息:', device);
    
    // 测试各种设置修改
    const testSettings = [
      { powerOn: !device.powerOn },
      { mode: device.mode === 1 ? 2 : 1 },
      { indicatorColor: device.indicatorColor === 'RED' ? 'BLUE' : 'RED' },
      { indicatorBrightness: device.indicatorBrightness === 80 ? 60 : 80 },
      { delayOffTime: device.delayOffTime === '关' ? '1min' : '关' },
      { 
        schedule: device.schedule.length > 0 ? [] : [
          { startTime: '09:00', endTime: '18:00', enabled: true }
        ]
      }
    ];
    
    for (let i = 0; i < testSettings.length; i++) {
      const setting = testSettings[i];
      console.log(`\n--- 测试设置 ${i + 1}: ${Object.keys(setting)[0]} ---`);
      console.log('修改前:', device[Object.keys(setting)[0]]);
      
      // 修改设置
      deviceStore.updateDeviceSettings(deviceId, setting);
      
      console.log('修改后:', device[Object.keys(setting)[0]]);
      
      // 等待同步完成
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== 最终设备信息 ===');
    console.log(device);
    console.log('=== 设备设置同步测试完成 ===');
  }
  
  // 测试所有设备的设置同步
  static async testAllDevicesSync() {
    console.log('=== 开始测试所有设备设置同步 ===');
    
    for (const device of deviceStore.devices) {
      console.log(`\n测试设备: ${device.name} (${device.id})`);
      await this.testDeviceSettingsSync(device.id);
    }
    
    console.log('\n=== 所有设备设置同步测试完成 ===');
  }
  
  // 验证设备设置完整性
  static validateDeviceSettings(deviceId: string): boolean {
    const device = deviceStore.devices.find(d => d.id === deviceId);
    if (!device) {
      console.error('设备不存在:', deviceId);
      return false;
    }
    
    const requiredFields = [
      'powerOn', 'mode', 'indicatorColor', 'indicatorBrightness', 
      'delayOffTime', 'schedule'
    ];
    
    const missingFields = requiredFields.filter(field => 
      device[field] === undefined || device[field] === null
    );
    
    if (missingFields.length > 0) {
      console.error('设备缺少必要字段:', missingFields);
      return false;
    }
    
    console.log('设备设置完整性验证通过:', device.name);
    return true;
  }
  
  // 验证所有设备设置完整性
  static validateAllDevicesSettings(): boolean {
    console.log('=== 开始验证所有设备设置完整性 ===');
    
    let allValid = true;
    for (const device of deviceStore.devices) {
      const isValid = this.validateDeviceSettings(device.id);
      if (!isValid) {
        allValid = false;
      }
    }
    
    console.log('所有设备设置完整性验证结果:', allValid ? '通过' : '失败');
    return allValid;
  }
}

// 使用示例：
/*
// 测试单个设备设置同步
await DeviceSettingsSyncTester.testDeviceSettingsSync('test-device-001');

// 测试所有设备设置同步
await DeviceSettingsSyncTester.testAllDevicesSync();

// 验证设备设置完整性
DeviceSettingsSyncTester.validateAllDevicesSettings();
*/