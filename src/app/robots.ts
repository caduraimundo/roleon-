import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/produtor',
        '/api',
        '/perfil',
        '/checkout',
        '/pagamento',
        '/ingresso',
        '/ingressos',
        '/salvos',
        '/interesses',
      ],
    },
    sitemap: 'https://www.roleon.com.br/sitemap.xml',
  }
}
