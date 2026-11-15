const BACKEND_TARGET = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:4002';

export default {
  root: '.',
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/openapi.yaml': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/docs': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/swagger': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/scalar': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/ready': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
};
