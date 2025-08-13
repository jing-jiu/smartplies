import { View, Text, Image, Button, Input } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { userStore } from '../../stores/userStore';
import { AtIcon, AtButton } from 'taro-ui';
import './edit.scss';

const ProfileEdit = observer(() => {
  const [avatarUrl, setAvatarUrl] = useState<string>(userStore.avatarUrl || 'https://joeschmoe.io/api/v1/random');
  const [nickname, setNickname] = useState<string>('');
  const [avatarFileID, setAvatarFileID] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // 页面加载
  useLoad(() => {
    console.log('个人信息编辑页面加载');
    // 尝试获取用户当前信息
    if (Taro.cloud) {
      Taro.cloud.callFunction({
        name: 'getUserInfo',
        success: (res) => {
          const { result } = res;
          if (result && result.data) {
            // 如果有昵称，设置昵称
            if (result.data.nickName) {
              setNickname(result.data.nickName);
            }
          }
        },
        fail: (err) => {
          console.error('获取用户信息失败', err);
        }
      });
    }
  });

  // 处理头像选择
  const onChooseAvatar = (e) => {
    const { avatarUrl: tempAvatarUrl } = e.detail;
    console.log('选择的头像临时路径:', tempAvatarUrl);
    
    // 先显示选择的头像
    setAvatarUrl(tempAvatarUrl);
    setIsUploading(true);
    
    // 显示加载中
    Taro.showLoading({
      title: '上传中...'
    });

    // 上传到云存储
    const extension = tempAvatarUrl.match(/\.[^.]+?$/);
    const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}${extension ? extension[0] : '.jpg'}`;

    if (Taro.cloud) {
      Taro.cloud.uploadFile({
        cloudPath,
        filePath: tempAvatarUrl,
        success: (uploadRes) => {
          const fileID = uploadRes.fileID;
          console.log('头像上传成功，fileID:', fileID);
          
          // 保存fileID用于后续提交
          setAvatarFileID(fileID);

          // 获取临时URL用于显示
          Taro.cloud.getTempFileURL({
            fileList: [fileID],
            success: (res) => {
              if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                // 更新本地状态用于显示
                setAvatarUrl(res.fileList[0].tempFileURL);
                
                Taro.hideLoading();
                setIsUploading(false);
                Taro.showToast({
                  title: '头像已上传',
                  icon: 'success',
                  duration: 2000
                });
              }
            },
            fail: (err) => {
              console.error('获取临时URL失败', err);
              // 即使获取临时URL失败，我们仍然有fileID
              Taro.hideLoading();
              setIsUploading(false);
              Taro.showToast({
                title: '头像已上传，但预览失败',
                icon: 'none',
                duration: 2000
              });
            }
          });
        },
        fail: (err) => {
          console.error('上传头像失败', err);
          Taro.hideLoading();
          setIsUploading(false);
          Taro.showToast({
            title: '上传头像失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
    } else {
      console.error('云环境未初始化');
      Taro.hideLoading();
      setIsUploading(false);
      Taro.showToast({
        title: '系统错误',
        icon: 'none',
        duration: 2000
      });
    }
  };

  // 处理昵称输入
  const onNicknameInput = (e) => {
    const value = e.detail.value;
    console.log('输入的昵称:', value);
    setNickname(value);
  };

  // 处理表单提交
  const handleSubmit = () => {
    if (!nickname) {
      Taro.showToast({
        title: '请输入昵称',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (isUploading) {
      Taro.showToast({
        title: '头像正在上传中，请稍候',
        icon: 'none',
        duration: 2000
      });
      return;
    }

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

    // 显示加载中
    Taro.showLoading({
      title: '保存中...'
    });

    // 准备用户信息数据
    const userInfoData = {
      nickName: nickname,
    };
    
    // 如果有上传新头像，使用fileID
    if (avatarFileID) {
      userInfoData.avatarUrl = avatarFileID;
    } else if (avatarUrl && !avatarUrl.includes('joeschmoe.io')) {
      // 如果没有上传新头像但有现有头像（非默认头像），保留现有头像
      userInfoData.avatarUrl = avatarUrl;
    }

    // 调用云函数更新用户信息
    Taro.cloud.callFunction({
      name: 'updateUserInfo',
      data: userInfoData,
      success: () => {
        console.log('用户信息更新成功');
        // 设置登录状态和头像URL
        userStore.setLoggedIn(true);
        if (avatarUrl) {
          userStore.setAvatarUrl(avatarUrl);
        }
        
        // 如果有新上传的头像fileID，需要获取临时URL用于显示
        if (avatarFileID) {
          Taro.cloud.getTempFileURL({
            fileList: [avatarFileID],
            success: (res) => {
              if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
                userStore.setAvatarUrl(res.fileList[0].tempFileURL);
              }
            },
            fail: (err) => {
              console.error('获取头像临时URL失败:', err);
            }
          });
        }
        
        Taro.hideLoading();
        Taro.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 2000
        });
        
        // 返回上一页
        setTimeout(() => {
          Taro.navigateBack();
        }, 2000);
      },
      fail: (err) => {
        console.error('更新用户信息失败', err);
        console.log('错误信息:', err.errMsg);
        
        // 检查是否是因为云函数未部署
        if (err.errMsg && err.errMsg.includes('FunctionName parameter could not be found')) {
          console.error('可能原因: 云函数未部署或函数名称错误');
          console.log('请在微信开发者工具中上传并部署云函数');
          
          Taro.hideLoading();
          Taro.showModal({
            title: '提示',
            content: '云函数未部署，请联系管理员部署云函数后再试',
            showCancel: false
          });
          return;
        }
        
        Taro.hideLoading();
        Taro.showToast({
          title: '保存失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  };

  return (
    <View className='profile-edit-page'>
      <View className='edit-header'>
        <Text className='edit-title'>完善个人信息</Text>
        <Text className='edit-subtitle'>设置您的头像和昵称</Text>
      </View>

      <View className='edit-form'>
        <View className='form-item'>
          <Text className='form-label'>头像</Text>
          <Button 
            className='avatar-wrapper' 
            openType='chooseAvatar' 
            onChooseAvatar={onChooseAvatar}
          >
            <Image 
              className='avatar' 
              src={avatarUrl} 
              mode='aspectFill'
            />
            {isUploading && (
              <View className='avatar-uploading'>
                <AtIcon value='loading-2' size='30' color='#fff' className='loading-icon' />
              </View>
            )}
          </Button>
          <Text className='form-tip'>点击头像进行修改</Text>
        </View>

        <View className='form-item'>
          <Text className='form-label'>昵称</Text>
          <Input 
            type='nickname' 
            className='nickname-input' 
            placeholder='请输入昵称' 
            onBlur={onNicknameInput}
          />
          <Text className='form-tip'>设置您喜欢的昵称</Text>
        </View>

        <AtButton className='submit-btn' type='primary' onClick={handleSubmit}>
          保存
        </AtButton>
      </View>
    </View>
  );
});

export default ProfileEdit;