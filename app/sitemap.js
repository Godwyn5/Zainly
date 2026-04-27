export default function sitemap() {
  const base = 'https://zainly.app';
  const now = new Date();
  return [
    { url: base,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/login`,               lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/register`,            lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/premium`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/installer-zainly`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
