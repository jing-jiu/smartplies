// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

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
    // 根据openid查询用户信息
    const userRecord = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()

    if (userRecord.data.length > 0) {
      // 返回用户信息
      return {
        success: true,
        data: userRecord.data[0]
      }
    } else {
      // 用户不存在
      return {
        success: false,
        error: 'User not found',
        openid: wxContext.OPENID
      }
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
    return {
      success: false,
      error: error
    }
  }
}