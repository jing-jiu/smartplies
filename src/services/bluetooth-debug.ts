// 蓝牙调试工具
import Taro from "@tarojs/taro";

// 调试工具类
export class BluetoothDebugger {
  
  // 调试设备服务和特征值
  static async debugDeviceServices(deviceId: string) {
    try {
      console.log('=== 开始调试设备服务 ===');
      console.log('设备ID:', deviceId);
      
      // 获取设备服务
      const servicesRes = await new Promise<any>((resolve, reject) => {
        Taro.getBLEDeviceServices({
          deviceId,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('设备服务数量:', servicesRes.services.length);
      console.log('所有服务:', servicesRes.services.map(s => s.uuid));
      
      // 遍历每个服务，获取特征值
      for (let i = 0; i < servicesRes.services.length; i++) {
        const service = servicesRes.services[i];
        console.log(`\n--- 服务 ${i + 1}: ${service.uuid} ---`);
        
        try {
          const characteristicsRes = await new Promise<any>((resolve, reject) => {
            Taro.getBLEDeviceCharacteristics({
              deviceId,
              serviceId: service.uuid,
              success: resolve,
              fail: reject
            });
          });
          
          console.log(`特征值数量: ${characteristicsRes.characteristics.length}`);
          
          characteristicsRes.characteristics.forEach((char, index) => {
            console.log(`  特征值 ${index + 1}:`);
            console.log(`    UUID: ${char.uuid}`);
            console.log(`    属性:`, char.properties);
            
            // 检查是否支持通知
            if (char.properties && (char.properties.notify || char.properties.indicate)) {
              console.log(`    ✅ 支持通知`);
            }
            
            // 检查是否支持写入
            if (char.properties && (char.properties.write || char.properties.writeNoResponse)) {
              console.log(`    ✅ 支持写入`);
            }
          });
          
        } catch (error) {
          console.error(`获取服务 ${service.uuid} 特征值失败:`, error);
        }
      }
      
      console.log('=== 调试完成 ===');
      
    } catch (error) {
      console.error('调试设备服务失败:', error);
    }
  }
  
  // 测试特征值通知
  static async testNotification(deviceId: string, serviceId: string, characteristicId: string) {
    try {
      console.log('=== 测试通知功能 ===');
      console.log('设备ID:', deviceId);
      console.log('服务ID:', serviceId);
      console.log('特征值ID:', characteristicId);
      
      const result = await new Promise<any>((resolve, reject) => {
        Taro.notifyBLECharacteristicValueChange({
          deviceId,
          serviceId,
          characteristicId,
          state: true,
          success: (res) => {
            console.log('✅ 通知启用成功:', res);
            resolve(res);
          },
          fail: (error) => {
            console.error('❌ 通知启用失败:', error);
            reject(error);
          }
        });
      });
      
      return result;
      
    } catch (error) {
      console.error('测试通知功能失败:', error);
      throw error;
    }
  }
  
  // 查找最佳的服务和特征值组合
  static async findBestServiceCharacteristics(deviceId: string) {
    try {
      console.log('=== 查找最佳服务特征值组合 ===');
      
      const servicesRes = await new Promise<any>((resolve, reject) => {
        Taro.getBLEDeviceServices({
          deviceId,
          success: resolve,
          fail: reject
        });
      });
      
      const candidates = [];
      
      // 遍历所有服务
      for (const service of servicesRes.services) {
        try {
          const characteristicsRes = await new Promise<any>((resolve, reject) => {
            Taro.getBLEDeviceCharacteristics({
              deviceId,
              serviceId: service.uuid,
              success: resolve,
              fail: reject
            });
          });
          
          // 查找通知和写入特征值
          const notifyChar = characteristicsRes.characteristics.find(c => 
            c.properties && (c.properties.notify || c.properties.indicate)
          );
          
          const writeChar = characteristicsRes.characteristics.find(c => 
            c.properties && (c.properties.write || c.properties.writeNoResponse)
          );
          
          if (notifyChar || writeChar) {
            candidates.push({
              serviceId: service.uuid,
              notifyCharacteristic: notifyChar,
              writeCharacteristic: writeChar,
              score: (notifyChar ? 1 : 0) + (writeChar ? 1 : 0)
            });
          }
          
        } catch (error) {
          console.log(`跳过服务 ${service.uuid}:`, error.message);
        }
      }
      
      // 按分数排序，选择最佳候选
      candidates.sort((a, b) => b.score - a.score);
      
      console.log('找到的候选服务:', candidates.length);
      candidates.forEach((candidate, index) => {
        console.log(`候选 ${index + 1} (分数: ${candidate.score}):`);
        console.log(`  服务ID: ${candidate.serviceId}`);
        console.log(`  通知特征值: ${candidate.notifyCharacteristic?.uuid || '无'}`);
        console.log(`  写入特征值: ${candidate.writeCharacteristic?.uuid || '无'}`);
      });
      
      return candidates.length > 0 ? candidates[0] : null;
      
    } catch (error) {
      console.error('查找最佳服务特征值组合失败:', error);
      return null;
    }
  }
}

// 使用示例：
/*
// 在连接设备后调试
await BluetoothDebugger.debugDeviceServices(deviceId);

// 查找最佳服务特征值组合
const best = await BluetoothDebugger.findBestServiceCharacteristics(deviceId);
if (best) {
  console.log('推荐使用的服务配置:', best);
  
  // 测试通知功能
  if (best.notifyCharacteristic) {
    await BluetoothDebugger.testNotification(
      deviceId, 
      best.serviceId, 
      best.notifyCharacteristic.uuid
    );
  }
}
*/