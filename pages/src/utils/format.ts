export function formatUrl(url: string) {
  if (url.startsWith('/')) return url
  return `/${url}`
}
