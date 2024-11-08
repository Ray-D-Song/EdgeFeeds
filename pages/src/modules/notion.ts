import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  keyName: 'notion',
  url: 'https://www.notion.com/blog/topic/tech',
  title: 'Notion Tech Blog',
  description: 'The latest articles from Notion Tech Blog',
  copyright: 'Notion',
  getLinksMethod: async () => {
    const response = await fetch('https://www.notion.com/blog/topic/tech')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    await htmlRewriter
      .on('.post-preview > a', {
        element: (element) => {
          const href = element.getAttribute('href')
          if (href && links.indexOf(href) === -1) {
            links.push(href)
          }
        }
      })
      .transform(new Response(html))
      .text()
    return links.map(link => `https://www.notion.com${formatUrl(link)}`)
  }
})
