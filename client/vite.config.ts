import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default the dev proxy to the local Express server. If you want to point
  // dev at a remote backend instead, set DEV_PROXY_TARGET (not VITE_API_URL).
  const proxyTarget = env.DEV_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Forward /api/* straight to the backend without stripping the prefix —
        // Express now mounts routes under /api/* on both dev and prod.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
