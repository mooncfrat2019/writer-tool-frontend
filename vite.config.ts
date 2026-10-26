import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiMode = env.VITE_API_MODE ?? process.env.VITE_API_MODE ?? 'mock';
  const proxyTarget =
    env.VITE_API_PROXY_TARGET ?? process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy:
        apiMode === 'real'
          ? {
              '/api': {
                target: proxyTarget,
                changeOrigin: true,
              },
            }
          : undefined,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['e2e/**', 'e2e-real/**', 'node_modules/**', 'dist/**'],
    },
  };
});
