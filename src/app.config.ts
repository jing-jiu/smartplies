export default {
  pages: [
    "pages/index/index", 
    "pages/profile/index", 
    "pages/profile/edit", 
    "pages/webview/index",
    "pages/device/manage"
  ],
  requiredBackgroundModes: ["audio", "location"],
  requiredPrivateInfos: ["getFuzzyLocation"],
  permission: {
    "scope.userFuzzyLocation": {
      "desc": "需要获取您的大致地理位置信息以提供设备连接和位置服务"
    }
  },
  __usePrivacyCheck__: true,
  privacyApiInfos: [
    {
      apiName: "getFuzzyLocation",
      desc: "用于获取用户大致位置，提供基于位置的服务功能"
    },
    {
      apiName: "scope.userFuzzyLocation",
      desc: "获取用户模糊地理位置权限，用于提供基于位置的服务"
    }
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "WeChat",
    navigationBarTextStyle: "black",
  },
  tabBar: {
    color: "#999",
    selectedColor: "#6190E8",
    backgroundColor: "#fff",
    borderStyle: "black",
    list: [
      {
        pagePath: "pages/index/index",
        text: "首页",
        iconPath: "assets/icons/home.jpg",
        selectedIconPath: "assets/icons/home.jpg"
      },
      {
        pagePath: "pages/profile/index",
        text: "我的",
        iconPath: "assets/icons/user.jpg",
        selectedIconPath: "assets/icons/user.jpg"
      }
    ]
  }
};
