#!/bin/bash

# 启动前后端服务的脚本

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 定义日志文件路径（方便排查问题）
LOG_DIR="$SCRIPT_DIR/start_logs"
mkdir -p "$LOG_DIR"  # 确保日志目录存在
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

echo "==================================="
echo "基金和股票管理系统启动脚本"
echo "==================================="
echo ""
echo "正在启动后端服务... 日志：$BACKEND_LOG"
# 核心修改1：用nohup启动后端，脱离终端，重定向日志
nohup npm run dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
# 脱离当前shell的进程组，避免父进程终止影响子进程
disown $BACKEND_PID

# 等待2秒确保后端服务有足够时间启动
sleep 2

echo "正在启动前端服务... 日志：$FRONTEND_LOG"
# 核心修改2：用nohup启动前端，脱离终端，重定向日志
cd "$SCRIPT_DIR/Fund-zw/fund-app" && nohup HOST=0.0.0.0 PORT=5173 npm run dev -- --host 0.0.0.0 --port 5173 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
disown $FRONTEND_PID

echo ""
echo "==================================="
echo "服务启动完成！"
echo "==================================="
echo "前端服务：http://服务器IP:5173"
echo "后端服务：http://服务器IP:3000（默认端口）"
echo ""
echo "后端PID：$BACKEND_PID | 前端PID：$FRONTEND_PID"
echo "日志目录：$LOG_DIR"

# 核心修改3：删除read -r，让脚本执行完直接退出，不阻塞
# 原read -r 已移除
