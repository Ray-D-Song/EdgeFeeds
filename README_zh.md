## Edge Feeds

用 Cloudflare Workers 生成你喜欢的网站的 RSS 订阅源。

## 为什么会有这个项目

起因是我想订阅科技公司和开源组织的博客，但它们没有提供 RSS 订阅源。  
所以我写了这个项目，目前已经支持的模块有：

- GitLab (modules/gitlab/feed)
- Shopify (modules/shopify/feed)
- Notion (modules/notion/feed)
- React Native (modules/reactNative/feed)

你可以使用我的部署 [https://edge-feeds.pages.dev](https://edge-feeds.pages.dev) 来订阅这些网站。

## 使用
比如你想订阅 React Native 的博客, 就在 `pages/src/modules` 文件夹中添加一个 `reactNative.ts` 文件。  

```ts
import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

// 使用 createFeedModule 创建一个新模块并导出
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
    // 抓取目录页
    const response = await fetch('https://reactnative.dev/blog')
    if (!response.ok) return []
    // 读取响应内容
    const html = await response.text()
    const links: string[] = []
    // 使用 htmlRewriter 解析 HTML, 并获取文章链接列表
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
    // 返回链接列表
    return links
  },
  // 链接转换方法，将上一步获取的链接转换为完整的 URL
  linkConvertMethod: (link) => {
    return `https://reactnative.dev${formatUrl(link)}`
  }
})
```
程序会读取`linkConvertMethod`返回的链接，然后抓取这些链接的内容，自动提取正文，生成 RSS 订阅源。
保存文件后，重新部署 Cloudflare Pages 即可。

## 对比

### RSSHub
我很喜欢 RSSHub，它是一个非常强大的项目，但目前不支持部署到 Cloudflare 这样的边缘平台。  
而且 RSSHub 为了支持各种灵活的解析，增加新的路由变得很复杂。  

如果你只是想抓取以内容为主的网站，比如某些公司的科技分享，那你可以使用 EdgeFeeds。  
但如果你需要更复杂的抓取，比如使用无头浏览器对结果进行特定处理，那你还是应该使用 RSSHub。

## 部署

EdgeFeeds 需要部署一个 Cloudflare Workers(用于定时更新) 和 Cloudflare Pages 站点(用于生成 RSS)。
首先下载

> [!NOTE]  
> 为什么要拆成两个服务？
> 因为 Worker 不支持自调用，Pages 不支持 cron 定时任务。😂

### 1. 部署 Pages

### 2. 部署 Workers

### 3. 刷新

## 依赖
- linkedom: 解析 HTML
- @mozilla/readability: 提取正文
- feed: 生成 RSS
