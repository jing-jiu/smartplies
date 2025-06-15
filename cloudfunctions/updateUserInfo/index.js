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
  
  try {
    // 检查用户是否已存在
    const userRecord = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()

    if (userRecord.data.length > 0) {
      // 获取现有用户信息
      const existingUserInfo = userRecord.data[0].userInfo || {}
      
      // 合并现有用户信息和新提供的信息
      const updatedUserInfo = {
        ...existingUserInfo,
        ...event
      }
      
      // 更新已有用户信息
      return await db.collection('users').where({
        openid: wxContext.OPENID
      }).update({
        data: {
          userInfo: updatedUserInfo,
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 创建新用户记录
      return await db.collection('users').add({
        data: {
          openid: wxContext.OPENID,
          appid: wxContext.APPID,
          unionid: wxContext.UNIONID,
          userInfo: event,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }
  } catch (error) {
    console.error('更新用户信息失败', error)
    return {
      success: false,
      error: error
    }
  }
}