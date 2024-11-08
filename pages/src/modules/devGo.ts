import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  keyName: 'dev-go',
  url: 'https://dev.to/t/go',
  title: 'Dev.to Go',
  description: 'The latest articles from Dev.to Go',
  copyright: 'Dev.to',
  getLinksMethod: async () => {
    const response = await fetch('https://dev.to/t/go')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    await htmlRewriter
      .on('.crayons-story__title > a', {
        element: (element) => {
          console.log('devGo_element', element)
          const href = element.getAttribute('href')
          console.log('devGo_href', href)
          if (href && links.indexOf(href) === -1) {
            links.push(href)
          }
        }
      })
      .transform(new Response(html))
      .text()
    console.log('devGo_links', links)
    return links.map(link => `https://dev.to${formatUrl(link)}`)
  },
})
