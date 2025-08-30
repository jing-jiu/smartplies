import { makeAutoObservable, action } from "mobx";
import Taro from '@tarojs/taro';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
  updateTime: number;
}

export class UserStore {
  avatarUrl: string = "";
  hasLoggedIn: boolean = false;
  userLocation: UserLocation | null = null;
  openid: string = "";
  userInfo: any = null;

  constructor() {
    makeAutoObservable(this);
    this.loadUserInfo();
  }

  @action
  setAvatarUrl(url: string) {
    this.avatarUrl = url;
  }

  @action
  setLoggedIn(status: boolean) {
    this.hasLoggedIn = status;
  }

  @action
  setOpenId(openid: string) {
    this.openid = openid;
  }

  @action
  setUserInfo(userInfo: any) {
    this.userInfo = userInfo;
    this.saveUserInfo();
  }

  @action
  setUserLocation(location: UserLocation) {
    this.userLocation = location;
  }

  // 检查用户登录状态
  @action
  async checkLoginStatus() {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'getUserInfo',
        data: {}
      });
      
      if (res.result && (res.result as any).success !== false) {
        this.setLoggedIn(true);
        this.setUserInfo(res.result);
        if ((res.result as any).openid) {
          this.setOpenId((res.result as any).openid);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  }

  // 获取用户定位
  @action
  async getUserLocation() {
    try {
      // 检查模糊定位权限
      const setting = await Taro.getSetting();
      if (!setting.authSetting['scope.userFuzzyLocation']) {
        try {
          await Taro.authorize({
            scope: 'scope.userFuzzyLocation'
          });
        } catch (authError) {
          console.error('用户拒绝授权模糊定位权限:', authError);
          // 引导用户前往设置页面
          Taro.showModal({
            title: '提示',
            content: '需要获取您的大致地理位置以提供更好的服务，请前往设置开启模糊定位权限',
            showCancel: true,
            confirmText: '前往设置',
            cancelText: '取消'
          }).then((res) => {
            if (res.confirm) {
              Taro.openSetting();
            }
          });
          return null;
        }
      }

      const res = await Taro.getFuzzyLocation({
        type: 'wgs84',
      });
      
      const location: UserLocation = {
        latitude: res.latitude,
        longitude: res.longitude,
        updateTime: Date.now()
      };

      // 获取地址信息
      try {
        const addressRes = await Taro.cloud.callFunction({
          name: 'getAddress',
          data: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
        
        if (addressRes.result && (addressRes.result as any).address) {
          location.address = (addressRes.result as any).address;
        }
      } catch (addressError) {
        console.error('获取地址失败:', addressError);
      }

      this.setUserLocation(location);
      
      // 上传到云数据库
      if (this.hasLoggedIn && this.openid) {
        await Taro.cloud.callFunction({
          name: 'updateUserInfo',
          data: {
            location: location
          }
        });
      }
      
      return location;
    } catch (error: any) {
      console.error('获取定位失败:', error);
      
      // 处理隐私协议相关错误
      if (error.errMsg && error.errMsg.includes('privacy agreement')) {
        Taro.showModal({
          title: '提示',
          content: '定位权限未在隐私协议中声明，请联系客服处理',
          showCancel: false
        });
      } else if (error.errMsg && error.errMsg.includes('auth deny')) {
        Taro.showModal({
          title: '提示',
          content: '模糊定位权限已被拒绝，请前往设置开启权限',
          showCancel: true,
          confirmText: '前往设置',
          cancelText: '取消'
        }).then((res) => {
          if (res.confirm) {
            Taro.openSetting();
          }
        });
      }
      
      return null;
    }
  }

  // 保存用户信息到本地存储
  private saveUserInfo() {
    Taro.setStorageSync('userInfo', {
      hasLoggedIn: this.hasLoggedIn,
      userInfo: this.userInfo,
      openid: this.openid,
      userLocation: this.userLocation
    });
  }

  // 从本地存储加载用户信息
  private loadUserInfo() {
    try {
      const saved = Taro.getStorageSync('userInfo');
      if (saved) {
        this.hasLoggedIn = saved.hasLoggedIn || false;
        this.userInfo = saved.userInfo || null;
        this.openid = saved.openid || "";
        this.userLocation = saved.userLocation || null;
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  }

  // 引导用户登录
  @action
  async guideUserLogin() {
    try {
      const res = await Taro.getUserProfile({
        desc: '用于完善用户信息'
      });
      
      if (res.userInfo) {
        const updateRes = await Taro.cloud.callFunction({
          name: 'updateUserInfo',
          data: {
            userInfo: res.userInfo
          }
        });
        
        if (updateRes.result && (updateRes.result as any).success) {
          this.setLoggedIn(true);
          this.setUserInfo(res.userInfo);
          if ((updateRes.result as any).openid) {
            this.setOpenId((updateRes.result as any).openid);
          }
          
          // 登录成功后获取定位
          try {
            await this.getUserLocation();
          } catch (locationError) {
            console.error('登录后获取定位失败:', locationError);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('用户登录失败:', error);
      return false;
    }
  }
}

// 创建并导出UserStore实例
export const userStore = new UserStore();
