import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/fund': {
        target: 'https://fundgz.1234567.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fund/, '/js'),
      },
      '/api/stock': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stock/, '/list='),
      },
      '/api/eastmoney': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/eastmoney/, ''),
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/data': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 优化构建输出
    target: 'esnext',
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: () => {
          // 将第三方库拆分为单独的chunk
          return {
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'antd': ['antd'],
            'echarts': ['echarts', 'echarts-for-react'],
          };
        },
      },
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: true,
    },
  },
})
