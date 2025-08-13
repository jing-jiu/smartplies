// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

async function ensureCollectionExists(collectionName) {
  try {
    // 尝试获取集合信息
    await db.collection(collectionName).limit(1).get()
  } catch (error) {
    if (error.errCode === -502005) {
      // 集合不存在，创建集合
      await db.createCollection(collectionName)
      console.log(`集合 ${collectionName} 已创建`)
    } else {
      throw error
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  // 确保必要的集合存在
  await ensureCollectionExists('devices')
  await ensureCollectionExists('user_device_mapping')
  
  const wxContext = cloud.getWXContext()
  
  try {
    // 1. 获取用户-设备映射关系
    const mappingRecords = await db.collection('user_device_mapping').where({
      openid: wxContext.OPENID
    }).get()
    
    if (mappingRecords.data.length === 0) {
      // 用户没有绑定设备
      return {
        success: true,
        data: []
      }
    }
    
    // 2. 获取所有设备ID
    const deviceIds = mappingRecords.data.map(record => record.deviceId)
    
    // 3. 查询设备详细信息
    // 注意：由于小程序云开发限制，一次最多查询20条记录
    // 如果设备数量可能超过20，需要分批查询
    const batchSize = 20
    let allDevices = []
    
    for (let i = 0; i < deviceIds.length; i += batchSize) {
      const batchIds = deviceIds.slice(i, i + batchSize)
      const deviceRecords = await db.collection('devices').where({
        deviceId: _.in(batchIds)
      }).get()
      
      allDevices = allDevices.concat(deviceRecords.data)
    }
    
    return {
      success: true,
      data: allDevices
    }
  } catch (error) {
    console.error('获取用户设备信息失败', error)
    return {
      success: false,
      error: error
    }
  }
}