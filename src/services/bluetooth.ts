import Taro from "@tarojs/taro";

// 定义标准服务UUID
const STANDARD_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';
const WRITE_CHARACTERISTIC_UUID = '49535343-8841-43F4-A8D4-ECBE34729BB3';
const NOTIFY_CHARACTERISTIC_UUID = '49535343-1E4D-4BD9-BA61-23C647249616';

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
      success: resolve,
      fail: reject,
      interval:0,
    });
  });
};

export const stopDiscover = () => {
  return Taro.stopBluetoothDevicesDiscovery();
};

// 强制重置蓝牙适配器
export const resetBluetoothAdapter = async () => {
  try {
    console.log('开始重置蓝牙适配器');

    // 停止当前搜索
    try {
      await stopDiscover();
    } catch (error) {
      console.log('停止搜索失败或未在搜索:', error);
    }

    // 关闭蓝牙适配器
    await new Promise((resolve) => {
      Taro.closeBluetoothAdapter({
        success: resolve,
        fail: resolve // 即使失败也继续
      });
    });

    console.log('蓝牙适配器已关闭，等待重新初始化');

    // 等待一段时间确保完全关闭
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 重新初始化
    await initBluetooth();

    console.log('蓝牙适配器重置完成');

    return true;
  } catch (error) {
    console.error('重置蓝牙适配器失败:', error);
    throw error;
  }
};

export const getAvailableDevices = () => {
  return Taro.getBluetoothDevices();
};

export const connectToDevice = (deviceId: string) => {
  return new Promise((resolve, reject) => {
    Taro.createBLEConnection({
      deviceId,
      success: resolve,
      fail: reject
    });
  });
};

// 断开设备连接
export const disconnectDevice = (deviceId: string) => {
  return new Promise((resolve, reject) => {
    Taro.closeBLEConnection({
      deviceId,
      success: resolve,
      fail: reject
    });
  });
};

// 完全断开蓝牙 - 包含清理资源
export const disconnectBluetoothCompletely = async (deviceId?: string) => {
  try {
    console.log('开始完全断开蓝牙连接');
    
    // 1. 停止蓝牙设备发现
    try {
      await stopDiscover();
      console.log('已停止蓝牙设备发现');
    } catch (error) {
      console.log('停止发现失败:', error);
    }

    // 2. 如果有指定设备ID，断开该设备连接
    if (deviceId) {
      try {
        await disconnectDevice(deviceId);
        console.log(`已断开设备连接: ${deviceId}`);
        
        // 清理设备的服务信息
        deviceServiceMap.delete(deviceId);
        console.log(`已清理设备服务信息: ${deviceId}`);
      } catch (error) {
        console.log('断开设备连接失败:', error);
      }
    } else {
      // 清理所有设备的服务信息
      deviceServiceMap.clear();
      console.log('已清理所有设备服务信息');
    }

    // 3. 关闭蓝牙适配器
    try {
      await new Promise((resolve) => {
        Taro.closeBluetoothAdapter({
          success: resolve,
          fail: resolve // 即使失败也继续
        });
      });
      console.log('蓝牙适配器已关闭');
    } catch (error) {
      console.log('关闭蓝牙适配器失败:', error);
    }

    // 4. 清理消息监听器
    messageCallbacks = [];
    console.log('已清理消息监听器');

    return true;
  } catch (error) {
    console.error('完全断开蓝牙失败:', error);
    throw error;
  }
};

// 重置蓝牙状态 - 用于错误恢复
export const resetBluetoothState = async () => {
  try {
    console.log('开始重置蓝牙状态');
    
    // 1. 停止发现
    await stopDiscover();
    
    // 2. 关闭蓝牙适配器
    await new Promise((resolve) => {
      Taro.closeBluetoothAdapter({
        success: resolve,
        fail: resolve
      });
    });
    
    // 3. 等待一段时间后重新初始化
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 重新初始化蓝牙
    await initBluetooth();
    
    console.log('蓝牙状态重置完成');
    return true;
  } catch (error) {
    console.error('重置蓝牙状态失败:', error);
    throw error;
  }
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

// 存储设备的服务和特征值信息
interface DeviceServiceInfo {
  serviceId: string;
  notifyCharacteristicId: string;
  writeCharacteristicId?: string;
}

const deviceServiceMap = new Map<string, DeviceServiceInfo>();

// 添加消息监听器
export const addMessageListener = (callback: MessageCallback) => {
  messageCallbacks.push(callback);
};

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
        const standardService = servicesRes.services.find(s => s.uuid === STANDARD_SERVICE_UUID);

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
                c => c.uuid === NOTIFY_CHARACTERISTIC_UUID
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

                  // 存储服务信息
                  const serviceInfo: DeviceServiceInfo = {
                    serviceId: standardService.uuid,
                    notifyCharacteristicId: notifyCharacteristic.uuid,
                    writeCharacteristicId: WRITE_CHARACTERISTIC_UUID
                  };
                  deviceServiceMap.set(deviceId, serviceInfo);
                  
                  resolve(serviceInfo);
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

                // 存储服务信息
                const serviceInfo: DeviceServiceInfo = {
                  serviceId: service.uuid,
                  notifyCharacteristicId: notifyCharacteristic.uuid,
                  writeCharacteristicId: characteristicsRes.characteristics[0]?.uuid
                };
                deviceServiceMap.set(deviceId, serviceInfo);
                
                resolve(serviceInfo);
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
    // 首先检查是否已有存储的服务信息
    const serviceInfo = deviceServiceMap.get(deviceId);
    if (serviceInfo && serviceInfo.writeCharacteristicId) {
      console.log('使用已存储的服务信息发送命令:', {
        deviceId,
        serviceId: serviceInfo.serviceId,
        characteristicId: serviceInfo.writeCharacteristicId
      });
      
      // 将命令字符串转换为ArrayBuffer
      const buffer = new ArrayBuffer(command.length);
      const dataView = new DataView(buffer);
      for (let i = 0; i < command.length; i++) {
        dataView.setUint8(i, command.charCodeAt(i));
      }

      console.log(`准备通过标准服务发送命令:`, command, '转换为字节:', Array.from(new Uint8Array(buffer)));

      // 直接使用存储的服务和特征值写入数据
      Taro.writeBLECharacteristicValue({
        deviceId,
        serviceId: serviceInfo.serviceId,
        characteristicId: serviceInfo.writeCharacteristicId,
        value: buffer,
        success: (res) => {
          console.log(`通过标准服务发送命令成功:`, res);
          resolve({
            ...res,
            serviceId: serviceInfo.serviceId,
            characteristicId: serviceInfo.writeCharacteristicId,
            usingStoredService: true
          });
        },
        fail: (err) => {
          console.error(`通过标准服务发送命令失败:`, err);
          reject(err);
        }
      });
      return;
    }

    console.log('未找到存储的服务信息，使用默认查找逻辑');
    
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