// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云环境
})

const db = cloud.database()

// 过滤设备信息，只保留业务字段
function filterDeviceInfo(deviceInfo) {
  // 定义需要排除的数据库内部字段
  const excludeFields = ['_id', '_openid', 'createdAt', 'updatedAt', 'deletedAt', 'reactivatedAt']

  const filteredInfo = {}
  for (const [key, value] of Object.entries(deviceInfo)) {
    if (!excludeFields.includes(key)) {
      filteredInfo[key] = value
    }
  }

  return filteredInfo
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { deviceInfo, operation } = event

  try {
    console.log('收到设备同步请求:', { deviceInfo, operation })

    // 获取用户openid
    const { OPENID } = cloud.getWXContext()

    // 过滤设备信息，只保留业务字段
    const filteredDeviceInfo = filterDeviceInfo(deviceInfo)

    if (operation === 'delete') {
      // 删除操作：标记所有相同deviceId的设备为已删除
      const result = await db.collection('devices').where({
        _openid: OPENID,
        deviceId: deviceInfo.deviceId
      }).update({
        data: {
          deleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      })

      console.log('设备删除标记成功:', result)

      return {
        success: true,
        message: '设备删除成功',
        data: result
      }
    } else {
      // 同步操作：更新或创建设备信息
      const existingDevice = await db.collection('devices').where({
        _openid: OPENID,
        deviceId: deviceInfo.deviceId
      }).get()

      if (existingDevice.data.length > 0) {
        // 检查现有设备是否被标记为删除
        const existingDeviceData = existingDevice.data[0]

        if (existingDeviceData.deleted) {
          console.log('发现已删除的设备，重新激活:', deviceInfo.deviceId)
          // 如果设备之前被删除，重新激活它
          const result = await db.collection('devices').where({
            _openid: OPENID,
            deviceId: deviceInfo.deviceId
          }).update({
            data: {
              ...filteredDeviceInfo,
              deleted: false, // 重新激活设备
              deletedAt: null, // 清除删除时间
              reactivatedAt: new Date(), // 记录重新激活时间
              updatedAt: new Date()
            }
          })

          console.log('设备重新激活成功:', result)

          return {
            success: true,
            message: '设备重新激活成功',
            data: result
          }
        } else {
          // 更新现有设备
          const result = await db.collection('devices').where({
            _openid: OPENID,
            deviceId: deviceInfo.deviceId
          }).update({
            data: {
              ...filteredDeviceInfo,
              deleted: false, // 确保不是删除状态
              updatedAt: new Date()
            }
          })

          console.log('设备信息更新成功:', result)

          return {
            success: true,
            message: '设备信息更新成功',
            data: result
          }
        }
      } else {
        // 创建新设备
        const result = await db.collection('devices').add({
          data: {
            ...filteredDeviceInfo,
            _openid: OPENID,
            deleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        console.log('设备信息创建成功:', result)

        return {
          success: true,
          message: '设备信息创建成功',
          data: result
        }
      }
    }
  } catch (error) {
    console.error('设备同步失败:', error)

    return {
      success: false,
      message: '设备同步失败',
      error: error.message
    }
  }
}