export default {
  pages: [
    "pages/index/index", 
    "pages/profile/index", 
    "pages/profile/edit", 
    "pages/webview/index",
    "pages/device/manage"
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
