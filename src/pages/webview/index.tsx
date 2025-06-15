import { WebView } from '@tarojs/components';
import Taro, { useLoad, useRouter } from '@tarojs/taro';
import { View } from '@tarojs/components';
import './index.scss';

const WebViewPage = () => {
  const router = useRouter();
  const { url } = router.params;
  
  useLoad(() => {
    console.log('WebView页面加载，URL:', url);
    if (!url) {
      Taro.showToast({
        title: 'URL参数缺失',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        Taro.navigateBack();
      }, 2000);
    }
  });

  return (
    <View className='webview-container'>
      {url && <WebView src={decodeURIComponent(url)} />}
    </View>
  );
};

export default WebViewPage;