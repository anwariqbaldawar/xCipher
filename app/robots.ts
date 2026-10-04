import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/search', '/preview', '/_next/', '/*?_rsc=*'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
