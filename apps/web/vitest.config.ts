import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wba/engine': path.resolve(__dirname, '../../packages/engine/src/index.ts'),
      '@wba/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
