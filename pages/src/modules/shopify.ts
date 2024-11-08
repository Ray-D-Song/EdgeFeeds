import createFeedModule from '../core';
import htmlRewriter from '../utils/htmlrewriter';
import { formatUrl } from '../utils/format';

export default createFeedModule({
  keyName: 'shopify',
  url: 'https://shopify.engineering/authors/shopify-engineering',
  title: 'Shopify Engineering',
  description: 'The latest articles from Shopify Engineering',
  copyright: 'Shopify',
  getLinksMethod: async () => {
    const response = await fetch('https://shopify.engineering/authors/shopify-engineering')
    if (!response.ok) return []
    const html = await response.text()
    const links: string[] = []
    htmlRewriter
      .on('.article--index > a', {
        element: (element) => {
          const href = element.getAttribute('href')
          if (href && links.indexOf(href) === -1) {
            links.push(href)
          }
        }
      })
      .transform(new Response(html))
    return links.map(link => `https://shopify.engineering${formatUrl(link)}`)
  }
})
