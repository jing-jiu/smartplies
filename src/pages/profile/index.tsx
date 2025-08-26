import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { AtIcon } from 'taro-ui';
import { observer } from 'mobx-react';
import { deviceStore } from '../../stores/deviceStore';
import { userStore } from '../../stores/userStore';
import './index.scss';

const Profile = observer(() => {
  // 页面加载
  useLoad(() => {
    console.log('个人页面加载');
    // 检查用户登录状态
    checkLoginStatus();
  });

  // 检查登录状态
  const checkLoginStatus = () => {
    console.log('检查登录状态');
    // 不再使用getSetting检查scope.userInfo，因为微信已更新获取用户信息的方式
    // 直接尝试从云数据库获取用户信息
    if (Taro.cloud) {
      console.log('尝试从云数据库获取用户信息');
      Taro.cloud.callFunction({
        name: 'getUserInfo',
        data: {},
        success: (result: any) => {
          console.log('getUserInfo云函数调用成功:', result);
          const dbUserInfo = result.result?.data;
          if (dbUserInfo && dbUserInfo.userInfo) {
            // 如果云数据库中有用户信息，使用云数据库中的信息
            console.log('云数据库中存在用户信息:', dbUserInfo.userInfo);
            userStore.setLoggedIn(true);
            
            // 尝试从云数据库加载用户的设备信息
            try {
              deviceStore.loadDevicesFromCloud().then(() => {
                console.log('从云数据库加载设备信息成功');
              }).catch(err => {
                console.error('从云数据库加载设备信息失败:', err);
              });
            } catch (error) {
              console.error('加载设备信息时发生错误:', error);
            }
            
            // 设置头像URL
            if (dbUserInfo.userInfo.avatarUrl) {
              // 检查是否是云存储的fileID
              if (dbUserInfo.userInfo.avatarUrl.startsWith('cloud://')) {
                // 获取临时URL
                Taro.cloud.getTempFileURL({
                  fileList: [dbUserInfo.userInfo.avatarUrl],
                  success: (res: any) => {
                    if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                      userStore.setAvatarUrl(res.fileList[0].tempFileURL);
                    }
                  },
                  fail: (err) => {
                    console.error('获取临时文件URL失败:', err);
                  }
                });
              } else {
                userStore.setAvatarUrl(dbUserInfo.userInfo.avatarUrl);
              }
            }
          } else {
            // 用户不存在，设置为未登录状态
            console.log('云数据库中不存在用户信息，设置为未登录状态');
            userStore.setLoggedIn(false);
          }
        },
        fail: (err) => {
          console.error('从云数据库获取用户信息失败', err);
          console.log('错误信息:', err.errMsg);
          
          // 检查是否是因为云函数未部署
          if (err.errMsg && err.errMsg.includes('FunctionName parameter could not be found')) {
            console.error('可能原因: 云函数未部署或函数名称错误');
            console.log('请在微信开发者工具中上传并部署云函数');
          }
          
          // 设置为未登录状态
          userStore.setLoggedIn(false);
        }
      });
    } else {
      console.error('云环境未初始化');
      userStore.setLoggedIn(false);
    }
  };

  // 处理编辑头像
  const handleEditAvatar = () => {
    // 确保用户已登录
    if (!userStore.hasLoggedIn) {
      Taro.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 显示加载中
        Taro.showLoading({
          title: '上传中...'
        });

        // 上传到云存储
        const extension = tempFilePath.match(/\.[^.]+?$/);
        const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}${extension ? extension[0] : ''}`;

        Taro.cloud.uploadFile({
          cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            const fileID = uploadRes.fileID;

            // 获取临时URL用于显示
            Taro.cloud.getTempFileURL({
              fileList: [fileID],
              success: (res) => {
                if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                  // 更新本地状态
                  userStore.setAvatarUrl(res.fileList[0].tempFileURL);

                  // 更新到云数据库
                  Taro.cloud.callFunction({
                    name: 'updateUserInfo',
                    data: {
                      avatarUrl: fileID // 存储fileID而不是临时URL
                    },
                    success: () => {
                      Taro.hideLoading();
                      Taro.showToast({
                        title: '头像更新成功',
                        icon: 'success',
                        duration: 2000
                      });
                    },
                    fail: (err) => {
                      console.error('更新用户头像失败', err);
                      Taro.hideLoading();
                      Taro.showToast({
                        title: '头像更新失败',
                        icon: 'none',
                        duration: 2000
                      });
                    }
                  });
                }
              },
              fail: (err) => {
                console.error('获取临时URL失败', err);
                Taro.hideLoading();
                Taro.showToast({
                  title: '头像处理失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            });
          },
          fail: (err) => {
            console.error('上传头像失败', err);
            Taro.hideLoading();
            Taro.showToast({
              title: '上传头像失败',
              icon: 'none',
              duration: 2000
            });
          }
        });
      }
    });
  };

  // 处理账户点击
  const handleAccountClick = () => {
    console.log('账户点击');
    // 如果已登录，显示账户信息
    if (userStore.hasLoggedIn) {
      Taro.showToast({
        title: '您已绑定微信账号',
        icon: 'success',
        duration: 2000
      });
      return;
    }

    // 未登录，显示头像昵称填写弹窗
    Taro.showModal({
      title: '完善个人信息',
      content: '请点击确定按钮，完善您的头像和昵称信息',
      success: function (res) {
        if (res.confirm) {
          // 跳转到个人信息编辑页面
          Taro.navigateTo({
            url: '/pages/profile/edit'
          });
        }
      }
    });
  };

  // 处理获取手机号
  const handleGetPhoneNumber = (e) => {
    console.log('获取手机号事件触发:', e.detail.errMsg);
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      console.log('用户同意获取手机号，cloudID:', e.detail.cloudID);
      
      // 确保云环境已初始化
      if (!Taro.cloud) {
        console.error('云环境未初始化，无法调用云函数');
        Taro.showToast({
          title: '系统错误，请重试',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 获取手机号成功，调用云函数解析手机号
      Taro.cloud.callFunction({
        name: 'getPhoneNumber',
        data: {
          cloudID: e.detail.cloudID
        },
        success: (res) => {
          console.log('getPhoneNumber云函数调用成功:', res);
          const phoneInfo = res.result.phoneInfo;
          console.log('解析到的手机号信息:', phoneInfo);
          
          // 更新用户信息，添加手机号
          Taro.cloud.callFunction({
            name: 'updateUserInfo',
            data: {
              userInfo: {
                phoneNumber: phoneInfo.phoneNumber
              }
            },
            success: (updateRes) => {
              console.log('手机号更新成功:', updateRes);
              Taro.showToast({
                title: '手机号绑定成功',
                icon: 'success',
                duration: 2000
              });
            },
            fail: (err) => {
              console.error('更新手机号失败', err);
              console.log('错误信息:', err.errMsg);
              
              // 检查是否是因为云函数未部署
              if (err.errMsg && err.errMsg.includes('FunctionName parameter could not be found')) {
                console.error('可能原因: 云函数未部署或函数名称错误');
                console.log('请在微信开发者工具中上传并部署云函数');
              }
              
              Taro.showToast({
                title: '手机号绑定失败',
                icon: 'none',
                duration: 2000
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取手机号失败', err);
          console.log('错误信息:', err.errMsg);
          
          // 检查是否是因为云函数未部署
          if (err.errMsg && err.errMsg.includes('FunctionName parameter could not be found')) {
            console.error('可能原因: 云函数未部署或函数名称错误');
            console.log('请在微信开发者工具中上传并部署云函数');
          }
          
          Taro.showToast({
            title: '获取手机号失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else {
      console.log('用户拒绝获取手机号');
      Taro.showToast({
        title: '您拒绝了授权',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 处理设备点击
  const handleDeviceClick = () => {
    if (deviceStore.devices.length > 0) {
      // 显示加载提示
      Taro.showLoading({
        title: '同步设备信息...'
      });
      
      // 同步所有设备信息到云数据库
      if (process.env.TARO_ENV === 'weapp' && userStore.hasLoggedIn) {
        deviceStore.syncAllDevicesToCloud()
          .then(() => {
            Taro.hideLoading();
            Taro.showToast({
              title: `已同步 ${deviceStore.devices.length} 台设备`,
              icon: 'success',
              duration: 2000
            });
          })
          .catch(err => {
            console.error('同步设备信息失败:', err);
            Taro.hideLoading();
            Taro.showToast({
              title: '同步设备信息失败',
              icon: 'none',
              duration: 2000
            });
          });
      } else {
        Taro.hideLoading();
        Taro.showToast({
          title: `您有 ${deviceStore.devices.length} 台设备`,
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      Taro.showToast({
        title: '暂无设备',
        icon: 'none',
        duration: 2000
      });
    }
    // 这里可以跳转到设备列表页面
    // Taro.navigateTo({
    //   url: '/pages/devices/index'
    // });
  };

  // 跳转到官网
  const handleNavigateToWebsite = () => {
    // 使用Taro的网页跳转功能
    Taro.navigateTo({
      url: `/pages/webview/index?url=${encodeURIComponent('https://www.baidu.com')}`
    });
  };

  // 联系客服
  const handleContactService = () => {
    Taro.makePhoneCall({
      phoneNumber: '025-XXXX',
      success: () => {
        console.log('拨打电话成功');
      },
      fail: (err) => {
        console.log('拨打电话失败', err);
        Taro.showToast({
          title: '拨打电话失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  };

  return (
    <View className='profile-page'>
      {/* 用户头像区域 */}
      <View className='avatar-section'>
        <View className='avatar-container' onClick={userStore.hasLoggedIn ? handleEditAvatar : handleAccountClick}>
          <Image
            className='avatar'
            src={userStore.avatarUrl || 'https://joeschmoe.io/api/v1/random'}
            mode='aspectFill'
          />
          <Text className='edit-text'>
            {userStore.hasLoggedIn ? '头像修改' : '点击登录'}
          </Text>
        </View>
      </View>

      {/* 用户信息区域 */}
      <View className='info-section'>
        {/* <View className='info-item' onClick={handleAccountClick}>
          <Text className='label'>我的账户</Text>
          <View className='function-right'>
            <Text className='value'>微信绑定</Text>
            <AtIcon value='chevron-right' size='18' color='#999'></AtIcon>
          </View>
        </View> */}

        {/* 获取手机号按钮，仅在已登录但未绑定手机号时显示 */}
        {/* {userStore.hasLoggedIn && (
          <View className='info-item'>
            <Text className='label'>手机号码</Text>
            <View className='function-right'>
              <Button
                className='phone-button'
                openType='getPhoneNumber'
                onGetPhoneNumber={handleGetPhoneNumber}
              >
                点击获取手机号
              </Button>
              <AtIcon value='chevron-right' size='18' color='#999'></AtIcon>
            </View>
          </View>
        )} */}

        <View className='info-item' onClick={handleDeviceClick}>
          <Text className='label'>我的设备</Text>
          <View className='function-right'>
            <Text className='value'>{deviceStore.devices.length > 0 ? `${deviceStore.devices.length}台设备` : '暂无设备'}</Text>
            <AtIcon value='chevron-right' size='18' color='#999'></AtIcon>
          </View>
        </View>
      </View>

      {/* 功能列表 */}
      <View className='function-section'>
        <View className='function-item' onClick={handleNavigateToWebsite}>
          <Text className='function-label'>官网跳转</Text>
          <View className='function-right'>
            <AtIcon value='chevron-right' size='18' color='#999'></AtIcon>
          </View>
        </View>

        <View className='function-item' onClick={handleContactService}>
          <Text className='function-label'>客服</Text>
          <View className='function-right'>
            <Text className='function-value'>025-XXXX</Text>
            <AtIcon value='chevron-right' size='18' color='#999'></AtIcon>
          </View>
        </View>

        <View className='function-item'>
          <Text className='function-label'>版本号</Text>
          <View className='function-right'>
            <Text className='function-value'>V.1.1</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export default Profile;