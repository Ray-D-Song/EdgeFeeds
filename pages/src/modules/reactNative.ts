import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  // 模块名称
  keyName: 'react-native',
  // 源地址
  url: 'https://reactnative.dev/blog',
  // 订阅源标题
  title: 'React Native Team Blog',
  // 订阅源描述
  description: 'The latest articles from React Native Team Blog',
  // 版权信息
  copyright: 'React Native',
  // 获取链接方法
  getLinksMethod: async () => {
    const response = await fetch('https://reactnative.dev/blog')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    htmlRewriter
      .on('.sidebarItem_lnhn > a', {
        element: (element) => {
          const href = element.getAttribute('href')
          if (href && links.indexOf(href) === -1) {
            links.push(href)
          }
        }
      })
      .transform(new Response(html))
    return links
  },
  // 链接转换方法
  linkConvertMethod: (link) => {
    return `https://reactnative.dev${formatUrl(link)}`
  }
})
