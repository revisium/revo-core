import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  plugins: [swc.vite()],
  test: {
    coverage: {
      exclude: ['src/main.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    include: ['test/**/*.test.ts'],
  },
});
