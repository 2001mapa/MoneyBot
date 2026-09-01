import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Panel Financiero',
    short_name: 'Panel Financiero',
    description: 'Asistente financiero personal',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#3B82F6',
    icons: [
      {
        src: '/icon',
        sizes: '192x192 512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
