// 生产环境使用相对路径（同源部署，无需跨域）
// 开发环境使用代理（vite.config.ts 会将 /api 代理到 localhost:3001）
export const API_BASE_URL = '';