#!/bin/bash

# 外卖好评宝 - 服务器自动部署脚本
# 注意：环境变量需要在服务器上单独配置，不要在此文件中硬编码

echo "===== 开始部署 ====="

# 1. 安装必要软件
echo "[1/6] 检查并安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 2. 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 3. 克隆或更新代码
echo "[2/6] 获取代码..."
if [ -d "/opt/haopingbao/.git" ]; then
    cd /opt/haopingbao
    git pull origin master
else
    rm -rf /opt/haopingbao
    git clone https://github.com/paddybest/WMhaoping.git /opt/haopingbao
    cd /opt/haopingbao
fi

# 4. 创建 .env 文件（从环境变量或提示输入）
echo "[3/6] 配置环境变量..."
read -p "请在服务器上创建 .env 文件，或按回车继续..."

# 5. 创建数据库
echo "[4/6] 创建数据库..."
# PostgreSQL 连接信息需要在 .env 中配置
# PGPASSWORD=你的密码 psql -h 你的RDS地址 -U 你的用户名 -c "CREATE DATABASE haopingbao;"

# 6. 启动服务
echo "[5/6] 启动 Docker 容器..."
cd /opt/haopingbao

# 停止旧容器
docker-compose down 2>/dev/null

# 构建并启动
docker-compose build --no-cache
docker-compose up -d

# 7. 运行数据库迁移
echo "[6/6] 运行数据库迁移..."
sleep 10
docker exec haopingbao-backend npm run migrate 2>/dev/null || echo "迁移可能已运行或无需迁移"

echo "===== 部署完成 ====="
echo "检查服务状态: docker ps"
echo "查看日志: docker-compose logs -f"
