import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE_PATH || '/';
  const preview = env.VITE_PREVIEW === 'true';
  const publicUrl = new URL(base, env.VITE_SITE_ORIGIN || 'https://gitsbee.github.io');
  return {
    base,
    plugins: [react(), {
      name: 'muleumsaem-page-metadata',
      transformIndexHtml(html) {
        return {
          html: html.replaceAll('%APP_PREVIEW%', String(preview)),
          tags: [
            { tag: 'meta', attrs: { property: 'og:url', content: publicUrl.href } },
            { tag: 'meta', attrs: { property: 'og:image', content: new URL('og.png', publicUrl).href } },
            ...(preview ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }] : []),
          ],
        };
      },
    }],
  };
});
