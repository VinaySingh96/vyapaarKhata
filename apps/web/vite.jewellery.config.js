export default {
  root: '.',
  server: {
    port: 3003,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/openapi.yaml': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/swagger': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/scalar': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
};
