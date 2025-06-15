import Taro from "@tarojs/taro";

export const initBluetooth = () => {
  return new Promise((resolve, reject) => {
    Taro.openBluetoothAdapter({
      success: resolve,
      fail: reject
    });
  });
};

export const startDiscover = () => {
  return new Promise((resolve, reject) => {
    Taro.startBluetoothDevicesDiscovery({
      services: [],
      success: resolve,
      fail: reject
    });
  });
};

export const stopDiscover = () => {
  return Taro.stopBluetoothDevicesDiscovery();
};

export const getAvailableDevices = () => {
  return Taro.getBluetoothDevices();
};

export const connectToDevice = (deviceId: string) => {
  return new Promise((resolve, reject) => {
    const device = Taro.createBLEConnection({
      deviceId,
      success: resolve,
      fail: reject
    });
  });
};

export const sendCommand = (deviceId: string, command: string) => {
  return new Promise((resolve, reject) => {
    // 查找设备的服务和特征值
    Taro.getBLEDeviceServices({
      deviceId,
      success: (servicesRes) => {
        console.log('获取设备服务成功:', servicesRes);
        
        // 假设我们知道设备的服务UUID
        const serviceId = servicesRes.services[0].uuid;
        
        // 获取特征值
        Taro.getBLEDeviceCharacteristics({
          deviceId,
          serviceId,
          success: (characteristicsRes) => {
            console.log('获取特征值成功:', characteristicsRes);
            
            // 找到可写的特征值
            const characteristic = characteristicsRes.characteristics.find(
              c => c.properties.write || c.properties.writeNoResponse
            );
            
            if (characteristic) {
              // 将命令字符串转换为ArrayBuffer
              const buffer = new ArrayBuffer(command.length);
              const dataView = new DataView(buffer);
              for (let i = 0; i < command.length; i++) {
                dataView.setUint8(i, command.charCodeAt(i));
              }
              
              // 写入数据
              Taro.writeBLECharacteristicValue({
                deviceId,
                serviceId,
                characteristicId: characteristic.uuid,
                value: buffer,
                success: (res) => {
                  console.log('发送命令成功:', res);
                  resolve(res);
                },
                fail: (err) => {
                  console.error('发送命令失败:', err);
                  reject(err);
                }
              });
            } else {
              const error = new Error('未找到可写的特征值');
              console.error(error);
              reject(error);
            }
          },
          fail: (err) => {
            console.error('获取特征值失败:', err);
            reject(err);
          }
        });
      },
      fail: (err) => {
        console.error('获取设备服务失败:', err);
        reject(err);
      }
    });
  });
};