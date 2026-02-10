# 基金和股票管理系统服务管理指南

## 项目简介

本项目是一个基金和股票管理系统，包含前端和后端两个服务：
- **前端服务**：基于React + TypeScript + Vite开发的Web应用
- **后端服务**：基于Express + Node.js开发的API服务

## 系统要求

- Node.js 18.0 或更高版本
- npm 9.0 或更高版本

## 目录结构

```
fund-manage-master/
├── Fund-zw/
│   ├── backend/         # 后端服务代码
│   └── fund-app/        # 前端服务代码
├── start-app.sh         # 服务管理脚本
└── start_logs/          # 日志目录
```

## 服务管理脚本

`start-app.sh` 是一个功能强大的服务管理脚本，用于启动、停止和重启前后端服务。

### 脚本功能

- ✅ 自动检查并安装依赖
- ✅ 检查端口是否被占用
- ✅ 启动前后端服务
- ✅ 停止所有运行的服务
- ✅ 重启所有服务
- ✅ 详细的日志记录
- ✅ 美观的彩色输出

### 使用方法

#### 1. 启动服务

```bash
./start-app.sh start
```

或直接运行脚本（默认执行start命令）：

```bash
./start-app.sh
```

#### 2. 停止服务

```bash
./start-app.sh stop
```

#### 3. 重启服务

```bash
./start-app.sh restart
```

#### 4. 查看帮助信息

```bash
./start-app.sh help
```

## 服务访问地址

- **前端服务**：http://localhost:5173
- **后端服务**：http://localhost:3001

## 日志管理

所有服务的日志都保存在 `start_logs/` 目录下：

- `backend.log`：后端服务日志
- `frontend.log`：前端服务日志
- `后端服务_install.log`：后端依赖安装日志
- `前端服务_install.log`：前端依赖安装日志
- `pids.txt`：服务进程ID记录

## 常见问题排查

### 1. 端口被占用

如果遇到端口被占用的错误，可以使用以下命令查看并终止占用端口的进程：

```bash
# 查看占用端口3001的进程
lsof -i:3001

# 终止占用端口的进程
kill -9 $(lsof -t -i:3001)

# 查看占用端口5173的进程
lsof -i:5173

# 终止占用端口的进程
kill -9 $(lsof -t -i:5173)
```

### 2. 依赖安装失败

如果依赖安装失败，可以查看安装日志：

```bash
cat start_logs/后端服务_install.log
cat start_logs/前端服务_install.log
```

### 3. 服务启动失败

如果服务启动失败，可以查看服务日志：

```bash
cat start_logs/backend.log
cat start_logs/frontend.log
```

## 注意事项

1. **首次运行**：首次运行脚本时，会自动安装前后端依赖，可能需要较长时间，请耐心等待。

2. **MongoDB连接**：后端服务默认尝试连接本地MongoDB数据库（mongodb://localhost:27017/fund-app）。如果MongoDB未运行，会自动切换到内存存储模式。

3. **端口配置**：
   - 后端服务默认使用端口3001
   - 前端服务默认使用端口5173

4. **服务状态**：脚本会在启动服务后检查服务状态，并在PID文件中记录进程ID，以便后续停止服务时使用。

5. **日志管理**：所有日志文件都会保存在`start_logs/`目录下，建议定期清理以避免占用过多磁盘空间。

## 示例

### 启动服务示例

```bash
$ ./start-app.sh start
===================================
基金和股票管理系统启动脚本
===================================

正在启动后端服务... 日志：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/backend.log
后端服务启动成功！PID：12345
正在启动前端服务... 日志：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/frontend.log
前端服务启动成功！PID：12346

===================================
服务启动完成！
===================================
前端服务：http://localhost:5173
后端服务：http://localhost:3001

日志目录：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs
PID文件：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/pids.txt
```

### 停止服务示例

```bash
$ ./start-app.sh stop
正在停止服务...
正在停止后端服务（PID：12345）...
后端服务停止成功
正在停止前端服务（PID：12346）...
前端服务停止成功
服务停止操作完成
```

### 重启服务示例

```bash
$ ./start-app.sh restart
正在停止服务...
正在停止后端服务（PID：12345）...
后端服务停止成功
正在停止前端服务（PID：12346）...
前端服务停止成功
服务停止操作完成
等待2秒后重启服务...
===================================
基金和股票管理系统启动脚本
===================================

正在启动后端服务... 日志：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/backend.log
后端服务启动成功！PID：12347
正在启动前端服务... 日志：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/frontend.log
前端服务启动成功！PID：12348

===================================
服务启动完成！
===================================
前端服务：http://localhost:5173
后端服务：http://localhost:3001

日志目录：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs
PID文件：/Users/kaeya.zhang/Desktop/zw/fund-manage-master/start_logs/pids.txt
```

## 总结

`start-app.sh` 脚本提供了一种简单、高效的方式来管理基金和股票管理系统的前后端服务。通过这个脚本，你可以轻松地启动、停止和重启服务，而不需要手动执行复杂的命令。

如果在使用过程中遇到任何问题，请参考常见问题排查部分，或查看相关日志文件以获取更多信息。