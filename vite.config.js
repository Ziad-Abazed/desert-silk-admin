import { defineConfig } from 'vite';
import { motionStudio } from 'motion-studio';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  server: { proxy: { '/api': 'http://127.0.0.1:8787', '/uploads': 'http://127.0.0.1:8787' } },
  plugins: [motionStudio()],
  build: {
    rollupOptions: {
      input: {
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        product: fileURLToPath(new URL('./product.html', import.meta.url))
      }
    }
  }
});
