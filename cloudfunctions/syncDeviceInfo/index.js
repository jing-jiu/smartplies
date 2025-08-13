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
  await ensureCollectionExists('users')
  await ensureCollectionExists('devices')
  await ensureCollectionExists('user_device_mapping')
  
  const wxContext = cloud.getWXContext()
  const { deviceInfo } = event
  
  if (!deviceInfo || !deviceInfo.id) {
    return {
      success: false,
      error: '设备信息不完整'
    }
  }
  
  try {
    console.log('开始同步设备信息:', deviceInfo)
    
    // 1. 更新或创建设备信息
    const deviceRecord = await db.collection('devices').where({
      deviceId: deviceInfo.deviceId
    }).get()
    
    console.log('查询到的设备记录:', deviceRecord.data)
    
    let deviceDbId
    
    if (deviceRecord.data.length > 0) {
      // 更新已有设备信息
      console.log('更新已有设备，设备ID:', deviceRecord.data[0]._id)
      
      // 排除_id字段，避免更新错误
      const { _id, ...updateData } = deviceInfo
      
      const updateResult = await db.collection('devices').doc(deviceRecord.data[0]._id).update({
        data: {
          ...updateData,
          updatedAt: db.serverDate()
        }
      })
      console.log('设备更新结果:', updateResult)
      deviceDbId = deviceRecord.data[0]._id
    } else {
      // 创建新设备记录
      console.log('创建新设备记录')
      
      // 排除_id字段，避免创建错误
      const { _id, ...createData } = deviceInfo
      
      const result = await db.collection('devices').add({
        data: {
          ...createData,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      console.log('设备创建结果:', result)
      deviceDbId = result._id
    }
    
    // 2. 更新用户-设备映射关系
    console.log('查询用户设备映射关系, openid:', wxContext.OPENID, 'deviceId:', deviceInfo.deviceId)
    const mappingRecord = await db.collection('user_device_mapping').where({
      openid: wxContext.OPENID,
      deviceId: deviceInfo.deviceId
    }).get()
    
    console.log('查询到的映射记录:', mappingRecord.data)
    
    if (mappingRecord.data.length > 0) {
      // 更新已有映射
      console.log('更新已有映射关系')
      const mappingUpdateResult = await db.collection('user_device_mapping').doc(mappingRecord.data[0]._id).update({
        data: {
          updatedAt: db.serverDate()
        }
      })
      console.log('映射关系更新结果:', mappingUpdateResult)
    } else {
      // 创建新映射
      console.log('创建新映射关系')
      const mappingCreateResult = await db.collection('user_device_mapping').add({
        data: {
          openid: wxContext.OPENID,
          deviceId: deviceInfo.deviceId,
          deviceDbId: deviceDbId,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      console.log('映射关系创建结果:', mappingCreateResult)
    }
    
    console.log('设备信息同步完成')
    return {
      success: true,
      message: '设备信息同步成功'
    }
  } catch (error) {
    console.error('同步设备信息失败', error)
    return {
      success: false,
      error: error
    }
  }
}