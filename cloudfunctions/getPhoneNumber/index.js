// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取微信上下文
  const wxContext = cloud.getWXContext()
  
  try {
    // 解析手机号码
    const { cloudID } = event
    const res = await cloud.getOpenData({
      list: [cloudID]
    })
    
    // 返回手机号信息
    return {
      success: true,
      phoneInfo: res.list[0].data,
      openid: wxContext.OPENID
    }
  } catch (error) {
    console.error('获取手机号失败', error)
    return {
      success: false,
      error: error,
      openid: wxContext.OPENID
    }
  }
}