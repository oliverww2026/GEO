#!/bin/bash

# GEO 项目生产环境停止脚本
# 用于停止所有运行中的生产服务

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  GEO 生产环境停止"
echo "=========================================="
echo ""

# 查找并停止后端服务
BACKEND_PID=$(lsof -ti:3001 || true)
if [ ! -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}正在停止后端服务 (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID
    sleep 1
    # 检查是否成功停止
    if lsof -ti:3001 > /dev/null 2>&1; then
        echo -e "${RED}强制停止后端服务...${NC}"
        kill -9 $BACKEND_PID
    fi
    echo -e "${GREEN}✓ 后端服务已停止${NC}"
else
    echo "后端服务未运行"
fi

# 查找并停止前端服务
FRONTEND_PID=$(lsof -ti:4173 || true)
if [ ! -z "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}正在停止前端服务 (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID
    sleep 1
    # 检查是否成功停止
    if lsof -ti:4173 > /dev/null 2>&1; then
        echo -e "${RED}强制停止前端服务...${NC}"
        kill -9 $FRONTEND_PID
    fi
    echo -e "${GREEN}✓ 前端服务已停止${NC}"
else
    echo "前端服务未运行"
fi

echo ""
echo -e "${GREEN}所有服务已停止${NC}"
echo ""
