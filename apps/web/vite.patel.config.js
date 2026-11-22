export default {
  root: '.',
  server: {
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/openapi.yaml': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/swagger': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/scalar': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://127.0.0.1:4002',
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
};
