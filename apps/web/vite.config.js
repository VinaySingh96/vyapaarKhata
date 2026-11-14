export default {
  root: '.',
  server: {
    port: 3000,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/openapi.yaml': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/swagger': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/scalar': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
};
