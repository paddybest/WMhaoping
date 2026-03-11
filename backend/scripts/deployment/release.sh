#!/bin/bash

# 发布脚本
set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置变量
PROJECT_NAME="haopingbao-backend"
PROJECT_DIR="/opt/project/${PROJECT_NAME}"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_DIR="/var/log/${PROJECT_NAME}"
DEPLOY_LOG="${LOG_DIR}/deploy.log"

# 创建必要的目录
mkdir -p "${BACKUP_DIR}" "${LOG_DIR}"

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."

    # 检查是否在正确的目录
    if [[ ! -f "package.json" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi

    # 检查 Node.js 版本
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，正在安装..."
        npm install -g pm2
    fi

    log_success "前置条件检查通过"
}

# 备份当前版本
backup_current_version() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "备份当前版本到 ${backup_path}"

    mkdir -p "${backup_path}"

    # 备份代码
    cp -r . "${backup_path}/"

    # 备份数据库（如果存在）
    if [[ -f ".env" ]]; then
        source .env
        if [[ ! -z "$DB_NAME" ]]; then
            log_info "备份数据库 ${DB_NAME}"
            mysqldump -h "${DB_HOST:-localhost}" -u "${DB_USER:-root}" -p"${DB_PASSWORD}" "${DB_NAME}" > "${backup_path}/database_backup.sql"
        fi
    fi

    # 保留最近5个备份
    cd "${BACKUP_DIR}"
    ls -t | tail -n +6 | xargs rm -rf

    log_success "备份完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    npm ci --only=production --ignore-scripts
    log_success "依赖安装完成"
}

# 构建应用
build_application() {
    log_info "构建应用..."
    npm run build

    # 检查构建结果
    if [[ ! -d "dist" ]]; then
        log_error "构建失败，dist 目录不存在"
        exit 1
    fi

    log_success "应用构建完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    if npm test; then
        log_success "测试通过"
    else
        log_error "测试失败"
        exit 1
    fi
}

# 健康检查
health_check() {
    local max_attempts=10
    local attempt=1

    log_info "执行健康检查..."

    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:${PORT:-5000}/health &>/dev/null; then
            log_success "健康检查通过"
            return 0
        fi

        log_warning "健康检查失败 (尝试 ${attempt}/${max_attempts})"
        sleep 5
        ((attempt++))
    done

    log_error "健康检查失败"
    return 1
}

# 部署应用
deploy_application() {
    log_info "部署应用..."

    # 停止旧版本
    pm2 stop ${PROJECT_NAME} || true

    # 启动新版本
    pm2 start ecosystem.config.js --name ${PROJECT_NAME} --env production

    # 保存 PM2 配置
    pm2 save

    log_success "应用部署完成"
}

# 灰度发布
gradual_rollout() {
    local step_size=${1:-10}
    local max_percentage=100
    local current_percentage=0

    log_info "开始灰度发布..."

    while [[ $current_percentage -lt $max_percentage ]]; do
        current_percentage=$((current_percentage + step_size))

        if [[ $current_percentage -gt $max_percentage ]]; then
            current_percentage=$max_percentage
        fi

        log_info "部署 ${current_percentage}% 流量..."

        # 这里可以根据需要实现流量控制逻辑
        # 例如：Nginx 配置、负载均衡配置等

        sleep 30

        # 健康检查
        if ! health_check; then
            log_error "健康检查失败，正在回滚..."
            rollback
            exit 1
        fi

        log_success "${current_percentage}% 流量部署完成"
    done

    log_success "灰度发布完成"
}

# 回滚
rollback() {
    log_info "开始回滚..."

    # 获取最新备份
    local latest_backup=$(ls -t "${BACKUP_DIR}" | head -n 1)
    if [[ -z "$latest_backup" ]]; then
        log_error "没有找到备份"
        exit 1
    fi

    local backup_path="${BACKUP_DIR}/${latest_backup}"
    log_info "使用备份 ${latest_backup}"

    # 停止当前服务
    pm2 stop ${PROJECT_NAME} || true

    # 恢复备份
    cp -r "${backup_path}"/* ./

    # 重新安装依赖
    npm install --production

    # 重新构建
    npm run build

    # 启动旧版本
    pm2 start ecosystem.config.js --name ${PROJECT_NAME} --env production

    log_success "回滚完成"
}

# 主函数
main() {
    echo "=========================================="
    echo "  好评宝项目发布脚本"
    echo "=========================================="

    # 解析命令行参数
    case "${1:-}" in
        "prerelease")
            check_prerequisites
            backup_current_version
            install_dependencies
            build_application
            run_tests
            ;;
        "deploy")
            deploy_application
            health_check
            ;;
        "gradual")
            check_prerequisites
            backup_current_version
            install_dependencies
            build_application
            run_tests
            deploy_application
            gradual_rollout
            ;;
        "rollback")
            rollback
            ;;
        *)
            echo "用法: $0 {prerelease|deploy|gradual|rollback}"
            echo "  prerelease  - 预发布检查（不实际部署）"
            echo "  deploy      - 直接部署"
            echo "  gradual     - 灰度发布"
            echo "  rollback    - 回滚"
            exit 1
            ;;
    esac

    log_success "部署流程完成"
}

# 执行主函数
main "$@"