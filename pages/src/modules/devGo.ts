import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  // 模块名称
  keyName: 'dev-go',
  // 源地址
  url: 'https://dev.to/t/go',
  // 订阅源标题
  title: 'Dev.to Go',
  // 订阅源描述
  description: 'The latest articles from Dev.to Go',
  // 版权信息
  copyright: 'Dev.to',
  // 获取链接方法
  getLinksMethod: async () => {
    const response = await fetch('https://dev.to/t/go')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    await htmlRewriter
      .on('.crayons-story__title > a', {
        element: (element) => {
          const href = element.getAttribute('href')
          if (href && links.indexOf(href) === -1) {
            links.push(href)
          }
        }
      })
      .transform(new Response(html))
      .text()
    return links.map(link => `https://dev.to${formatUrl(link)}`)
  },
})
