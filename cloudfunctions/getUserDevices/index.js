// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('获取用户设备列表')
    
    // 获取用户openid
    const { OPENID } = cloud.getWXContext()
    
    // 查询用户的设备，排除已删除的设备
    const result = await db.collection('devices').where({
      _openid: OPENID,
      deleted: false // 只获取未删除的设备
    }).orderBy('createdAt', 'desc').get()
    
    console.log('获取设备列表成功:', result.data.length, '个设备')
    
    return {
      success: true,
      message: '获取设备列表成功',
      data: result.data
    }
  } catch (error) {
    console.error('获取设备列表失败:', error)
    
    return {
      success: false,
      message: '获取设备列表失败',
      error: error.message,
      data: []
    }
  }
}