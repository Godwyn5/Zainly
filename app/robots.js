export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: 'https://zainly.app/sitemap.xml',
    host: 'https://zainly.app',
  };
}
