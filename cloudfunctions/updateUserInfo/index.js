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
  await ensureCollectionExists('users')
  const wxContext = cloud.getWXContext()
  
  console.log('updateUserInfo 接收到的数据:', JSON.stringify(event))
  console.log('用户 openid:', wxContext.OPENID)
  
  try {
    // 检查用户是否已存在
    const userRecord = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    
    console.log('查询到的用户记录数量:', userRecord.data.length)

    if (userRecord.data.length > 0) {
      // 获取现有用户信息
      const existingUserInfo = userRecord.data[0].userInfo || {}
      console.log('现有用户信息:', JSON.stringify(existingUserInfo))
      
      // 合并现有用户信息和新提供的信息
      const updatedUserInfo = {
        ...existingUserInfo,
        ...event
      }
      console.log('合并后的用户信息:', JSON.stringify(updatedUserInfo))
      
      // 更新已有用户信息
      const updateResult = await db.collection('users').where({
        openid: wxContext.OPENID
      }).update({
        data: {
          userInfo: updatedUserInfo,
          updatedAt: db.serverDate()
        }
      })
      console.log('用户信息更新结果:', JSON.stringify(updateResult))
      return updateResult
    } else {
      // 创建新用户记录
      console.log('创建新用户，用户信息:', JSON.stringify(event))
      const createResult = await db.collection('users').add({
        data: {
          openid: wxContext.OPENID,
          appid: wxContext.APPID,
          unionid: wxContext.UNIONID,
          userInfo: event,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      console.log('新用户创建结果:', JSON.stringify(createResult))
      return createResult
    }
  } catch (error) {
    console.error('更新用户信息失败', error)
    return {
      success: false,
      error: error
    }
  }
}