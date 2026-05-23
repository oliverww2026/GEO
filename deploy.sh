#!/bin/bash

# GEO 项目部署脚本
# 用于构建和启动生产环境

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  GEO 项目生产环境部署"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查 Node.js 和 npm
echo -e "${BLUE}[1/6] 检查环境...${NC}"
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm -v)${NC}"
echo ""

# 2. 安装后端依赖
echo -e "${BLUE}[2/6] 安装后端依赖...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "后端依赖已存在，跳过安装"
fi
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
echo ""

# 3. 构建后端
echo -e "${BLUE}[3/6] 构建后端项目...${NC}"
npm run build
echo -e "${GREEN}✓ 后端构建完成${NC}"
echo ""

# 4. 安装前端依赖
echo -e "${BLUE}[4/6] 安装前端依赖...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "前端依赖已存在，跳过安装"
fi
echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
echo ""

# 5. 构建前端
echo -e "${BLUE}[5/6] 构建前端项目...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 6. 启动服务
echo -e "${BLUE}[6/6] 启动生产服务...${NC}"
cd ..

# 检查是否已有后端服务在运行
BACKEND_PID=$(lsof -ti:3001 || true)
if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}检测到端口 3001 已被占用 (PID: $BACKEND_PID)${NC}"
    read -p "是否要停止现有服务并重启？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $BACKEND_PID
        echo "已停止现有服务"
        sleep 2
    else
        echo "取消部署"
        exit 0
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo "启动命令："
echo -e "${YELLOW}  后端服务: cd backend && NODE_ENV=production npm start${NC}"
echo -e "${YELLOW}  前端预览: cd frontend && npm run preview${NC}"
echo ""
echo "或使用快速启动脚本："
echo -e "${YELLOW}  ./start-production.sh${NC}"
echo ""
