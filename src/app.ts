import { Component } from 'react'
import Taro from '@tarojs/taro'
import type { PropsWithChildren } from 'react'

import './app.scss'

class App extends Component<PropsWithChildren> {

  componentDidMount() {
    // 初始化云开发环境
    if (process.env.TARO_ENV === 'weapp') {
      try {
        // 确保使用正确的云环境ID
        // 注意：云环境ID必须与微信开发者工具中创建的云环境ID一致
        // 如果没有创建云环境，请先在微信开发者工具中创建
        const envId = 'cloud1-8gwb16pyf80af56b'
        
        console.log('正在初始化云环境:', envId)
        
        // 初始化云环境
        Taro.cloud.init({
          env: envId,
          traceUser: true
        })
        
        console.log('云开发环境初始化成功')
        
        // 检查云函数是否已部署
        // 注意：云函数必须先在微信开发者工具中上传部署后才能调用
        console.log('请确保已在微信开发者工具中部署云函数')
        
        // 延迟调用云函数，确保云环境初始化完成
        setTimeout(() => {
          console.log('尝试调用云函数...')
          
          // 调用云函数
          Taro.cloud.callFunction({
            name: 'getUserInfo', // 确保函数名称与cloudfunctions目录下的文件夹名称完全一致
            data: {},
            success: (res) => {
              console.log('云函数调用成功:', res)
              // 检查返回的数据结构
              if (res.result) {
                console.log('返回的用户数据:', res.result)
                if (res.result.success === false && res.result.error === 'User not found') {
                  console.log('用户未找到，这是正常的，首次使用需要授权获取用户信息')
                }
              }
            },
            fail: (err) => {
              console.error('云函数调用失败:', err)
              console.log('错误信息:', err.errMsg)
              
              // 提示用户可能的原因
              if (err.errMsg && err.errMsg.includes('FunctionName parameter could not be found')) {
                console.error('可能原因: 云函数未部署或函数名称错误')
                console.log('请在微信开发者工具中上传并部署云函数')
                console.log('确保cloudfunctions目录下有getUserInfo、updateUserInfo和getPhoneNumber三个云函数')
              } else if (err.errCode === -501000) {
                console.error('云函数调用失败，错误码: -501000')
                console.log('可能原因: 云环境ID错误或云函数未部署')
                console.log('请检查云环境ID是否正确，并确保已部署云函数')
              }
            },
            complete: () => {
              console.log('云函数调用完成')
            }
          })
        }, 3000) // 增加延迟时间到3秒，确保云环境完全初始化
      } catch (error) {
        console.error('云开发环境初始化失败:', error)
      }
    }
  }

  componentDidShow() { }

  componentDidHide() { }

  // this.props.children 是将要会渲染的页面
  render() {
    return this.props.children
  }
}


export default App
