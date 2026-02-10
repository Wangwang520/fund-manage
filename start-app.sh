#!/bin/bash

# 基金和股票管理系统启动脚本

# 定义颜色
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# 定义日志文件路径（方便排查问题）
LOG_DIR="$SCRIPT_DIR/start_logs"
mkdir -p "$LOG_DIR"  # 确保日志目录存在
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
PID_FILE="$LOG_DIR/pids.txt"

# 后端和前端目录
BACKEND_DIR="$SCRIPT_DIR/Fund-zw/backend"
FRONTEND_DIR="$SCRIPT_DIR/Fund-zw/fund-app"

# 检查端口是否被占用
check_port() {
  local port=$1
  local service=$2
  if lsof -i:$port > /dev/null 2>&1; then
    echo -e "${RED}错误：$service 端口 $port 已被占用${NC}"
    return 1
  fi
  return 0
}

# 检查依赖是否已安装
check_deps() {
  local dir=$1
  local service=$2
  cd "$dir"
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}警告：$service 依赖未安装，正在安装...${NC}"
    npm install > "$LOG_DIR/${service}_install.log" 2>&1
    if [ $? -ne 0 ]; then
      echo -e "${RED}错误：$service 依赖安装失败，请查看日志：$LOG_DIR/${service}_install.log${NC}"
      return 1
    fi
    echo -e "${GREEN}$service 依赖安装成功${NC}"
  fi
  return 0
}

# 启动后端服务
start_backend() {
  echo -e "${BLUE}正在启动后端服务... 日志：$BACKEND_LOG${NC}"
  
  # 检查后端端口
  if ! check_port 3001 "后端服务"; then
    return 1
  fi
  
  # 检查后端依赖
  if ! check_deps "$BACKEND_DIR" "后端服务"; then
    return 1
  fi
  
  # 启动后端服务
  cd "$BACKEND_DIR" && nohup npm run dev > "$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
  
  # 脱离当前shell的进程组，避免父进程终止影响子进程
  disown $BACKEND_PID
  
  # 等待5秒确保后端服务有足够时间启动
  sleep 5
  
  # 尝试获取实际运行的后端服务PID
  ACTUAL_BACKEND_PID=$(lsof -t -i:3001 2>/dev/null)
  
  if [ ! -z "$ACTUAL_BACKEND_PID" ]; then
    echo -e "${GREEN}后端服务启动成功！PID：$ACTUAL_BACKEND_PID${NC}"
    echo "BACKEND_PID=$ACTUAL_BACKEND_PID" > "$PID_FILE"
    return 0
  else
    # 即使端口检查失败，也继续执行，因为服务可能已经在后台启动
    echo -e "${YELLOW}后端服务已启动（可能在后台运行），请查看日志：$BACKEND_LOG${NC}"
    echo "BACKEND_PID=$BACKEND_PID" > "$PID_FILE"
    return 0
  fi
}

# 启动前端服务
start_frontend() {
  echo -e "${BLUE}正在启动前端服务... 日志：$FRONTEND_LOG${NC}"
  
  # 检查前端端口
  if ! check_port 5173 "前端服务"; then
    return 1
  fi
  
  # 检查前端依赖
  if ! check_deps "$FRONTEND_DIR" "前端服务"; then
    return 1
  fi
  
  # 启动前端服务
  cd "$FRONTEND_DIR" && HOST=0.0.0.0 PORT=5173 nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!
  
  # 脱离当前shell的进程组，避免父进程终止影响子进程
  disown $FRONTEND_PID
  
  # 等待5秒确保前端服务有足够时间启动
  sleep 5
  
  # 尝试获取实际运行的前端服务PID
  ACTUAL_FRONTEND_PID=$(lsof -t -i:5173 2>/dev/null)
  
  if [ ! -z "$ACTUAL_FRONTEND_PID" ]; then
    echo -e "${GREEN}前端服务启动成功！PID：$ACTUAL_FRONTEND_PID${NC}"
    echo "FRONTEND_PID=$ACTUAL_FRONTEND_PID" >> "$PID_FILE"
    return 0
  else
    # 即使端口检查失败，也继续执行，因为服务可能已经在后台启动
    echo -e "${YELLOW}前端服务已启动（可能在后台运行），请查看日志：$FRONTEND_LOG${NC}"
    echo "FRONTEND_PID=$FRONTEND_PID" >> "$PID_FILE"
    return 0
  fi
}

# 停止服务
stop_services() {
  echo -e "${BLUE}正在停止服务...${NC}"
  
  # 停止后端服务
  local backend_pid
  if [ -f "$PID_FILE" ]; then
    # 读取PID文件
    source "$PID_FILE"
    backend_pid="$BACKEND_PID"
  fi
  
  # 尝试通过PID停止后端服务
  if [ ! -z "$backend_pid" ] && ps -p $backend_pid > /dev/null 2>&1; then
    echo -e "${YELLOW}正在停止后端服务（PID：$backend_pid）...${NC}"
    kill $backend_pid
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}后端服务停止成功${NC}"
    else
      echo -e "${RED}后端服务停止失败${NC}"
    fi
  else
    echo -e "${YELLOW}后端服务未运行或PID无效${NC}"
  fi
  
  # 检查后端端口是否被占用，如果是，尝试停止占用端口的进程
  if lsof -i:3001 > /dev/null 2>&1; then
    local port_pid=$(lsof -t -i:3001)
    echo -e "${YELLOW}发现后端端口3001被占用（PID：$port_pid），尝试停止该进程...${NC}"
    kill $port_pid
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}成功停止占用后端端口的进程${NC}"
    else
      echo -e "${RED}停止占用后端端口的进程失败${NC}"
    fi
  fi
  
  # 停止前端服务
  local frontend_pid
  if [ -f "$PID_FILE" ]; then
    source "$PID_FILE"
    frontend_pid="$FRONTEND_PID"
  fi
  
  # 尝试通过PID停止前端服务
  if [ ! -z "$frontend_pid" ] && ps -p $frontend_pid > /dev/null 2>&1; then
    echo -e "${YELLOW}正在停止前端服务（PID：$frontend_pid）...${NC}"
    kill $frontend_pid
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}前端服务停止成功${NC}"
    else
      echo -e "${RED}前端服务停止失败${NC}"
    fi
  else
    echo -e "${YELLOW}前端服务未运行或PID无效${NC}"
  fi
  
  # 检查前端端口是否被占用，如果是，尝试停止占用端口的进程
  if lsof -i:5173 > /dev/null 2>&1; then
    local port_pid=$(lsof -t -i:5173)
    echo -e "${YELLOW}发现前端端口5173被占用（PID：$port_pid），尝试停止该进程...${NC}"
    kill $port_pid
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}成功停止占用前端端口的进程${NC}"
    else
      echo -e "${RED}停止占用前端端口的进程失败${NC}"
    fi
  fi
  
  # 删除PID文件
  rm -f "$PID_FILE"
  
  echo -e "${BLUE}服务停止操作完成${NC}"
}

# 重启服务
restart_services() {
  stop_services
  echo -e "${YELLOW}等待2秒后重启服务...${NC}"
  sleep 2
  start_services
}

# 启动所有服务
start_services() {
  echo -e "${GREEN}===================================${NC}"
  echo -e "${GREEN}基金和股票管理系统启动脚本${NC}"
  echo -e "${GREEN}===================================${NC}"
  echo ""
  
  # 启动后端服务
  if ! start_backend; then
    echo -e "${RED}启动失败：后端服务无法启动${NC}"
    return 1
  fi
  
  # 启动前端服务
  if ! start_frontend; then
    echo -e "${RED}启动失败：前端服务无法启动${NC}"
    return 1
  fi
  
  echo ""
  echo -e "${GREEN}===================================${NC}"
  echo -e "${GREEN}服务启动完成！${NC}"
  echo -e "${GREEN}===================================${NC}"
  echo -e "${BLUE}前端服务：http://localhost:5173${NC}"
  echo -e "${BLUE}后端服务：http://localhost:3001${NC}"
  echo ""
  echo -e "${YELLOW}日志目录：$LOG_DIR${NC}"
  echo -e "${YELLOW}PID文件：$PID_FILE${NC}"
  
  return 0
}

# 显示帮助信息
show_help() {
  echo "基金和股票管理系统启动脚本"
  echo "用法：$0 [选项]"
  echo ""
  echo "选项："
  echo "  start    启动所有服务（默认）"
  echo "  stop     停止所有服务"
  echo "  restart  重启所有服务"
  echo "  help     显示帮助信息"
  echo ""
  echo "示例："
  echo "  $0 start    # 启动所有服务"
  echo "  $0 stop     # 停止所有服务"
  echo "  $0 restart  # 重启所有服务"
}

# 主函数
main() {
  case "$1" in
    start)
      start_services
      ;;
    stop)
      stop_services
      ;;
    restart)
      restart_services
      ;;
    help)
      show_help
      ;;
    *)
      # 默认启动服务
      start_services
      ;;
  esac
}

# 执行主函数
main "$@"