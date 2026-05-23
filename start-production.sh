#!/bin/bash

# GEO 项目生产环境启动脚本
# 用于快速启动已构建的生产服务

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  GEO 生产环境启动"
echo "=========================================="
echo ""

# 检查构建文件是否存在
if [ ! -d "backend/dist" ]; then
    echo -e "${RED}错误: 后端未构建，请先运行 ./deploy.sh${NC}"
    exit 1
fi

if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}错误: 前端未构建，请先运行 ./deploy.sh${NC}"
    exit 1
fi

# 检查端口占用
BACKEND_PID=$(lsof -ti:3001 || true)
FRONTEND_PID=$(lsof -ti:4173 || true)

if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}警告: 端口 3001 已被占用 (PID: $BACKEND_PID)${NC}"
    read -p "是否停止现有后端服务？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $BACKEND_PID
        echo "已停止现有后端服务"
        sleep 1
    fi
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}警告: 端口 4173 已被占用 (PID: $FRONTEND_PID)${NC}"
    read -p "是否停止现有前端服务？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $FRONTEND_PID
        echo "已停止现有前端服务"
        sleep 1
    fi
fi

echo ""
echo -e "${BLUE}正在启动服务...${NC}"
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端服务（后台运行）
echo -e "${BLUE}[1/2] 启动后端服务 (端口 3001)...${NC}"
cd backend
NODE_ENV=production nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_NEW_PID=$!
cd ..
echo -e "${GREEN}✓ 后端服务已启动 (PID: $BACKEND_NEW_PID)${NC}"
echo "  日志文件: logs/backend.log"
echo ""

# 等待后端启动
sleep 2

# 启动前端服务（后台运行）
echo -e "${BLUE}[2/2] 启动前端服务 (端口 4173)...${NC}"
cd frontend
nohup npm run preview > ../logs/frontend.log 2>&1 &
FRONTEND_NEW_PID=$!
cd ..
echo -e "${GREEN}✓ 前端服务已启动 (PID: $FRONTEND_NEW_PID)${NC}"
echo "  日志文件: logs/frontend.log"
echo ""

# 等待服务完全启动
echo "等待服务启动..."
sleep 3

echo ""
echo "=========================================="
echo -e "${GREEN}  服务启动成功！${NC}"
echo "=========================================="
echo ""
echo "访问地址："
echo -e "${YELLOW}  前端: http://localhost:4173${NC}"
echo -e "${YELLOW}  后端: http://localhost:3001${NC}"
echo ""
echo "进程信息："
echo "  后端 PID: $BACKEND_NEW_PID"
echo "  前端 PID: $FRONTEND_NEW_PID"
echo ""
echo "日志查看："
echo "  tail -f logs/backend.log   # 查看后端日志"
echo "  tail -f logs/frontend.log  # 查看前端日志"
echo ""
echo "停止服务："
echo "  ./stop-production.sh       # 停止所有服务"
echo "  kill $BACKEND_NEW_PID      # 仅停止后端"
echo "  kill $FRONTEND_NEW_PID     # 仅停止前端"
echo ""
