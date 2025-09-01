// 云函数入口文件
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { latitude, longitude } = event

  if (!latitude || !longitude) {
    return {
      success: false,
      address: null,
      message: '缺少经纬度参数'
    }
  }

  try {
    // 简化版本：直接返回经纬度信息作为地址
    // 在实际部署时，可以配置真实的地图API密钥
    const address = `位置: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    
    return {
      success: true,
      address: address,
      message: '获取位置成功'
    }
  } catch (error) {
    console.error('获取地址失败:', error)
    return {
      success: true,
      address: `位置: ${latitude}, ${longitude}`,
      message: '使用坐标信息'
    }
  }
}