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

如果你只是想抓取以内容为主的网站，比如某些公司的技术分享，那你可以使用 EdgeFeeds。  
但如果你需要更复杂的抓取，比如使用无头浏览器对结果进行特定处理，那你还是应该使用 RSSHub。

## 部署

EdgeFeeds 需要部署一个 Cloudflare Workers(用于定时更新) 和 Cloudflare Pages 站点(用于生成 RSS)。

> [!NOTE]  
> 为什么要拆成两个服务？
> 因为 Worker 不支持自调用，Pages 不支持 cron 定时任务。😂

### 1. 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ray-d-song/EdgeFeeds) 

### 2. 更新环境变量

在你的 Cloudflare `Workers 和 Pages` 的概述面板中，会显示 `readable-scrape` 和 `edge-feeds` 两个新部署上去的服务。

![image](./static/worker-and-pages.png)

接下来需要为 `edge-feeds` 增加环境变量`READABLE_SCRAPE_HOST`, 值为 `readable-scrape` 服务部署上去的 URL。
还要为 `readable-scrape` 增加环境变量 `FEED_HOST`, 值为 `edge-feeds` 部署上去的 URL。

![image](./static/var.png)

### 3. 触发更新

在一键部署的过程中会将仓库 fork 到你的名下。
在更新完环境变量后，需要手动触发你 fork 的仓库的`Github Actions`，重新部署 Workers 和 Pages，使配置生效。
在`EdgeFeeds`的`Actions`标签中，找到`Deploy`一栏，点击`Run workflow`。

![image](./static/re-actions.png)

## 依赖
- linkedom: 解析 HTML
- @mozilla/readability: 提取正文
- feed: 生成 RSS
