#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOY_LOG = path.join(__dirname, 'deploy.log');
const BACKUP_DIR = path.join(__dirname, 'backups');

// 创建备份目录
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(DEPLOY_LOG, logMessage);
}

// 执行命令并返回 Promise
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Command failed: ${command}`);
        log(`Error: ${stderr}`);
        reject(error);
      } else {
        log(`✅ Command succeeded: ${command}`);
        log(`Output: ${stdout}`);
        resolve(stdout);
      }
    });
  });
}

// 部署步骤
async function deploy() {
  try {
    log('🚀 Starting deployment...');

    // 1. 创建备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
    log(`📦 Creating backup at ${backupPath}`);
    await runCommand(`mkdir -p ${backupPath}`);
    await runCommand('cp -r node_modules package*.json dist scripts .env* config', backupPath);

    // 2. 安装依赖
    log('📦 Installing dependencies...');
    await runCommand('npm ci --only=production');

    // 3. 构建应用
    log('🔨 Building application...');
    await runCommand('npm run build');

    // 4. 运行数据库迁移
    log('🗄️ Running database migrations...');
    await runCommand('node scripts/migrate-data.js');

    // 5. 验证环境变量
    log('🔍 Validating environment variables...');
    const { validateEnv } = require('../config/env-validator');
    validateEnv();

    // 6. 停止服务（PM2）
    log('🛑 Stopping existing services...');
    await runCommand('pm2 stop haopingbao-api || true');

    // 7. 启动服务
    log('🚀 Starting new service...');
    await runCommand('pm2 start dist/server.js --name "haopingbao-api" --max-memory-restart 1G');

    // 8. 验证服务
    log('✅ Verifying service...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待服务启动
    await runCommand('curl -f http://localhost:5000/health || exit 1');

    log('🎉 Deployment completed successfully!');

    // 发送通知（可选）
    // sendNotification('Deployment completed successfully');

  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`);

    // 回滚
    log('🔄 Rolling back...');
    try {
      await runCommand('pm2 start backup/latest/dist/server.js --name "haopingbao-api" || true');
    } catch (rollbackError) {
      log(`⚠️ Rollback also failed: ${rollbackError.message}`);
    }

    process.exit(1);
  }
}

// 回滚函数
async function rollback() {
  log('🔄 Starting rollback...');

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(dir => dir.startsWith('backup-'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    log('❌ No backup found for rollback');
    process.exit(1);
  }

  const latestBackup = backups[0];
  const backupPath = path.join(BACKUP_DIR, latestBackup);

  log(`📦 Restoring from backup: ${latestBackup}`);

  // 停止当前服务
  await runCommand('pm2 stop haopingbao-api || true');

  // 恢复文件
  await runCommand(`cp -r ${backupPath}/* .`);

  // 启动服务
  await runCommand('pm2 start dist/server.js --name "haopingbao-api"');

  log('✅ Rollback completed successfully!');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'rollback') {
    await rollback();
  } else {
    await deploy();
  }
}

if (require.main === module) {
  main();
}

module.exports = { deploy, rollback };