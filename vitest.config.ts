import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  plugins: [swc.vite()],
  test: {
    fileParallelism: false,
    coverage: {
      exclude: [
        'src/__generated__/**',
        'src/**/*.module.ts',
        'src/infrastructure/database/**',
        'src/main.ts',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    include: ['test/**/*.test.ts'],
  },
});
