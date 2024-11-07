import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  keyName: 'gitlab',
  url: 'https://about.gitlab.com/blog/categories/engineering/',
  title: 'GitLab Engineering',
  description: 'The latest articles from GitLab Engineering',
  copyright: 'GitLab',
  getLinksMethod: async () => {
    const response = await fetch('https://about.gitlab.com/blog/categories/engineering/')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    htmlRewriter
      .on('.card > a', {
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
  linkConvertMethod: (link) => {
    return `https://about.gitlab.com${formatUrl(link)}`
  }
})
