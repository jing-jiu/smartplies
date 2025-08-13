import Taro from "@tarojs/taro";

export const initBluetooth = () => {
  return new Promise((resolve, reject) => {
    Taro.openBluetoothAdapter({
      mode: 'central', // 明确指定为主机模式
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

// 设置蓝牙MTU
export const setBLEMTU = (deviceId: string, mtu: number = 185) => {
  return new Promise((resolve, reject) => {
    Taro.setBLEMTU({
      deviceId,
      mtu,
      success: (res) => {
        console.log('MTU 设置成功:', res);
        resolve(res);
      },
      fail: (error) => {
        console.log('MTU 设置失败:', error);
        reject(error);
      }
    });
  });
};

// 获取当前设备的MTU
export const getBLEMTU = (deviceId: string) => {
  return new Promise((resolve, reject) => {
    Taro.getBLEMTU({
      deviceId,
      success: (res) => {
        console.log('获取MTU成功:', res);
        resolve(res);
      },
      fail: (error) => {
        console.log('获取MTU失败:', error);
        reject(error);
      }
    });
  });
};

// 消息接收回调函数类型
type MessageCallback = (deviceId: string, message: string) => void;

// 存储消息回调函数
let messageCallbacks: MessageCallback[] = [];

// 添加消息监听器
export const addMessageListener = (callback: MessageCallback) => {
  messageCallbacks.push(callback);
};

// 定义标准服务UUID
const STANDARD_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';
const WRITE_CHARACTERISTIC_UUID = '49535343-8841-43F4-A8D4-ECBE34729BB3';
const NOTIFY_CHARACTERISTIC_UUID = '49535343-1E4D-4BD9-BA61-23C647249616';

// 发送消息到蓝牙设备
export const sendMessage = (deviceId: string, serviceId: string, characteristicId: string, message: string) => {
  return new Promise((resolve, reject) => {
    const buffer = new ArrayBuffer(message.length);
    const dataView = new Uint8Array(buffer);
    for (let i = 0; i < message.length; i++) {
      dataView[i] = message.charCodeAt(i);
    }

    Taro.writeBLECharacteristicValue({
      deviceId,
      serviceId,
      characteristicId,
      value: buffer,
      success: resolve,
      fail: reject
    });
  });
};

// 移除消息监听器
export const removeMessageListener = (callback: MessageCallback) => {
  const index = messageCallbacks.indexOf(callback);
  if (index > -1) {
    messageCallbacks.splice(index, 1);
  }
};

// 启用蓝牙消息接收
export const enableMessageReceiving = async (deviceId: string) => {
  await getBLEMTU(deviceId);
  setTimeout(async () => {
    try {
      await setBLEMTU(deviceId, 230)
    } catch (error) {
      console.log(error);
    }
  }, 1000);
  return new Promise((resolve, reject) => {
    console.log('开始启用蓝牙消息接收:', deviceId);

    // 获取设备服务
    Taro.getBLEDeviceServices({
      deviceId,
      success: (servicesRes) => {
        console.log('获取设备服务成功:', servicesRes.services.length);

        if (servicesRes.services.length === 0) {
          reject(new Error('设备没有可用的服务'));
          return;
        }

        // 查找标准服务
        const standardService = servicesRes.services.find(s => s.uuid.toUpperCase() === STANDARD_SERVICE_UUID);
        
        if (standardService) {
          console.log('找到标准服务:', standardService.uuid);
          
          // 获取标准服务的特征值
          Taro.getBLEDeviceCharacteristics({
            deviceId,
            serviceId: standardService.uuid,
            success: (characteristicsRes) => {
              console.log('标准服务的特征值:', characteristicsRes.characteristics);
              
              // 查找通知特征值
              const notifyCharacteristic = characteristicsRes.characteristics.find(
                c => c.uuid.toUpperCase() === NOTIFY_CHARACTERISTIC_UUID
              );
              
              if (!notifyCharacteristic) {
                reject(new Error('标准服务中没有找到通知特征值'));
                return;
              }
              
              // 启用特征值变化通知
              Taro.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId: standardService.uuid,
                characteristicId: notifyCharacteristic.uuid,
                state: true,
                success: () => {
                  console.log('启用标准服务特征值通知成功');
                  
                  // 监听特征值变化
                  Taro.onBLECharacteristicValueChange((res) => {
                    if (res.deviceId === deviceId &&
                      res.serviceId === standardService.uuid &&
                      res.characteristicId === notifyCharacteristic.uuid) {
                      
                      // 将接收到的数据转换为字符串
                      const message = arrayBufferToString(res.value);
                      // 调用所有注册的回调函数
                      messageCallbacks.forEach(callback => {
                        try {
                          callback(deviceId, message);
                        } catch (error) {
                          console.error('消息回调函数执行失败:', error);
                        }
                      });
                    }
                  });
                  
                  resolve({
                    serviceId: standardService.uuid,
                    characteristicId: notifyCharacteristic.uuid,
                    writeCharacteristicId: WRITE_CHARACTERISTIC_UUID
                  });
                },
                fail: reject
              });
            },
            fail: reject
          });
          return;
        }

        // 如果没有找到标准服务，使用原来的逻辑
        console.log('未找到标准服务，使用默认服务选择逻辑');
        
        // 检查是否有足够的服务（至少3个）
        if (servicesRes.services.length < 3) {
          reject(new Error('设备服务数量不足，无法使用倒数第三个服务'));
          return;
        }

        // 使用倒数第三个服务
        const targetServiceIndex = servicesRes.services.length - 3;
        const service = servicesRes.services[targetServiceIndex];

        console.log('找到的所有服务:', servicesRes.services.map((s, index) => ({
          index: index + 1,
          uuid: s.uuid,
          isPrimary: s.isPrimary,
          isTarget: index === targetServiceIndex
        })));

        console.log(`使用倒数第三个服务 (索引 ${targetServiceIndex + 1}): ${service.uuid}`);

        // 获取目标服务的特征值
        Taro.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
          success: (characteristicsRes) => {
            console.log(`倒数第三个服务 (${service.uuid}) 的特征值:`, characteristicsRes.characteristics.map(c => ({
              uuid: c.uuid,
              properties: c.properties
            })));

            // 使用第二个特征值来接收消息
            if (characteristicsRes.characteristics.length < 2) {
              reject(new Error(`倒数第三个服务中特征值数量不足，需要至少2个特征值`));
              return;
            }

            const notifyCharacteristic = characteristicsRes.characteristics[1]; // 第二个特征值（索引1）

            if (!notifyCharacteristic.properties.notify && !notifyCharacteristic.properties.indicate) {
              reject(new Error(`倒数第三个服务的第二个特征值不支持通知功能`));
              return;
            }

            console.log('在倒数第三个服务中使用第二个特征值接收消息:', {
              serviceIndex: targetServiceIndex + 1,
              serviceId: service.uuid,
              characteristicId: notifyCharacteristic.uuid,
              characteristicIndex: 2,
              properties: notifyCharacteristic.properties
            });

            // 启用特征值变化通知
            Taro.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId: service.uuid,
              characteristicId: notifyCharacteristic.uuid,
              state: true,
              success: () => {
                console.log(`启用倒数第三个服务特征值通知成功`);

                // 监听特征值变化
                Taro.onBLECharacteristicValueChange((res) => {
                  if (res.deviceId === deviceId &&
                    res.serviceId === service.uuid &&
                    res.characteristicId === notifyCharacteristic.uuid) {

                    // 将接收到的数据转换为字符串
                    const message = arrayBufferToString(res.value);
                    // 调用所有注册的回调函数
                    messageCallbacks.forEach(callback => {
                      try {
                        callback(deviceId, message);
                      } catch (error) {
                        console.error('消息回调函数执行失败:', error);
                      }
                    });
                  }
                });

                resolve({
                  serviceId: service.uuid,
                  characteristicId: notifyCharacteristic.uuid,
                  serviceIndex: targetServiceIndex + 1
                });
              },
              fail: (err) => {
                console.error(`启用倒数第三个服务特征值通知失败:`, err);
                reject(err);
              }
            });
          },
          fail: (err) => {
            console.error(`获取倒数第三个服务 (${service.uuid}) 的特征值失败:`, err);
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

// ArrayBuffer转字符串
const arrayBufferToString = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < uint8Array.length; i++) {
    result += String.fromCharCode(uint8Array[i]);
  }
  return result;
};

export const sendCommand = (deviceId: string, command: string) => {
  return new Promise((resolve, reject) => {
    // 查找设备的服务和特征值
    Taro.getBLEDeviceServices({
      deviceId,
      success: (servicesRes) => {
        console.log('获取设备服务成功:', servicesRes);
        console.log('服务列表:', servicesRes.services.map(s => ({ uuid: s.uuid, isPrimary: s.isPrimary })));

        if (servicesRes.services.length === 0) {
          const error = new Error('设备没有可用的服务');
          console.error(error);
          reject(error);
          return;
        }

        // 检查是否有足够的服务（至少3个）
        if (servicesRes.services.length < 3) {
          reject(new Error('设备服务数量不足，无法使用倒数第三个服务'));
          return;
        }

        // 使用倒数第三个服务
        const targetServiceIndex = servicesRes.services.length - 3;
        const service = servicesRes.services[targetServiceIndex];

        console.log('查找可写服务，所有服务:', servicesRes.services.map((s, index) => ({
          index: index + 1,
          uuid: s.uuid,
          isPrimary: s.isPrimary,
          isTarget: index === targetServiceIndex
        })));

        console.log(`使用倒数第三个服务 (索引 ${targetServiceIndex + 1}) 发送命令: ${service.uuid}`);

        // 获取目标服务的特征值
        Taro.getBLEDeviceCharacteristics({
          deviceId,
          serviceId: service.uuid,
          success: (characteristicsRes) => {
            console.log(`倒数第三个服务 (${service.uuid}) 的特征值:`, characteristicsRes.characteristics.map(c => ({
              uuid: c.uuid,
              properties: c.properties
            })));

            // 使用第一个特征值来发送消息
            if (characteristicsRes.characteristics.length < 1) {
              reject(new Error(`倒数第三个服务中特征值数量不足，需要至少1个特征值`));
              return;
            }

            const characteristic = characteristicsRes.characteristics[0]; // 第一个特征值（索引0）

            if (!characteristic.properties.write && !characteristic.properties.writeNoResponse && !characteristic.properties.writeWithoutResponse) {
              reject(new Error(`倒数第三个服务的第一个特征值不支持写入功能`));
              return;
            }

            console.log('在倒数第三个服务中使用第一个特征值发送消息:', {
              serviceIndex: targetServiceIndex + 1,
              serviceId: service.uuid,
              characteristicId: characteristic.uuid,
              characteristicIndex: 1,
              properties: characteristic.properties
            });

            // 将命令字符串转换为ArrayBuffer
            const buffer = new ArrayBuffer(command.length);
            const dataView = new DataView(buffer);
            for (let i = 0; i < command.length; i++) {
              dataView.setUint8(i, command.charCodeAt(i));
            }

            console.log(`准备通过倒数第三个服务发送命令:`, command, '转换为字节:', Array.from(new Uint8Array(buffer)));

            // 写入数据
            Taro.writeBLECharacteristicValue({
              deviceId,
              serviceId: service.uuid,
              characteristicId: characteristic.uuid,
              value: buffer,
              success: (res) => {
                console.log(`通过倒数第三个服务发送命令成功:`, res);
                resolve({
                  ...res,
                  serviceIndex: targetServiceIndex + 1,
                  serviceId: service.uuid,
                  characteristicId: characteristic.uuid
                });
              },
              fail: (err) => {
                console.error(`通过倒数第三个服务发送命令失败:`, err);
                reject(err);
              }
            });
          },
          fail: (err) => {
            console.error(`获取倒数第三个服务 (${service.uuid}) 的特征值失败:`, err);
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