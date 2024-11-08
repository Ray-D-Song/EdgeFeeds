type ModuleCache = {
  path: string
  contentKey: string
}[]

type LastUpdate = string

type Links = string[]

type RawContent = {
  // 标题
  title: string
  // 副标题
  byline: string
  // 内容
  content: string
  // 摘要
  excerpt: string
  // 站点名称
  siteName: string
  // 抓取时间
  date: Date
}

type Content = {
  id: string
  // 链接
  link: string
  // 内容 （处理后的纯净 HTML）
  content: string
  // 标题
  title: string
  // 描述
  description: string
  // 抓取时间
  date: Date
}
