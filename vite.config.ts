import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/NoveDecimi/',
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        parole: resolve(import.meta.dirname, 'parole/index.html'),
        storico: resolve(import.meta.dirname, 'storico/index.html'),
        account: resolve(import.meta.dirname, 'account/index.html'),
        resoconto: resolve(import.meta.dirname, 'resoconto/index.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
