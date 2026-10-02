// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://heliadiascabeleireiros.pt',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Atrás do proxy do Coolify o Origin do browser é https://<domínio>; sem isto o checkOrigin recusa os POST.
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'heliadiascabeleireiros.pt' },
      { protocol: 'https', hostname: 'www.heliadiascabeleireiros.pt' },
      { protocol: 'https', hostname: 'heliadiascabeleleiro.ersolutions.tech' },
      { protocol: 'https', hostname: 'www.heliadiascabeleleiro.ersolutions.tech' },
    ],
  },
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()],
});
