import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'LearnOS Admin',
    short_name:       'LearnOS Admin',
    description:      'Administration portal for the LearnOS learning platform.',
    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    orientation:      'landscape-primary',
    background_color: '#0D0F1A',
    theme_color:      '#0D0F1A',
    categories:       ['business', 'education', 'productivity'],
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name:        'Courses',
        short_name:  'Courses',
        description: 'Manage course catalogue',
        url:         '/courses',
      },
      {
        name:        'Users',
        short_name:  'Users',
        description: 'Manage platform users',
        url:         '/users',
      },
      {
        name:        'Analytics',
        short_name:  'Analytics',
        description: 'View platform metrics',
        url:         '/analytics',
      },
    ],
  }
}
