#!/bin/bash

# 启动前后端服务的脚本

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "==================================="
echo "基金和股票管理系统启动脚本"
echo "==================================="
echo ""
echo "正在启动后端服务..."
cd "$SCRIPT_DIR/Fund-zw/backend" && npm run dev &

# 等待2秒确保后端服务有足够时间启动
sleep 2

echo "正在启动前端服务..."
cd "$SCRIPT_DIR/Fund-zw/fund-app" && HOST=0.0.0.0 PORT=5173 npm run dev -- --host 0.0.0.0 --port 5173 &
echo ""
echo "==================================="
echo "服务启动完成！"
echo "==================================="
echo "前端服务：http://localhost:5173"
echo "后端服务：http://localhost:3000（默认端口）"
echo ""
echo "按 Ctrl+C 退出..."

# 等待用户输入
read -r
