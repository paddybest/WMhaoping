module.exports = {
  apps: [
    {
      name: 'haopingbao-api',
      script: 'dist/server.js',
      instances: 'max', // 根据CPU核心数自动设置
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_type: 'date',
      time: true,

      // 监控配置
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      max_restart_delay: 10000,

      // 健康检查
      watch: false, // 生产环境不建议 watch
      ignore_watch: [
        'node_modules',
        'logs',
        'coverage',
        'dist'
      ],

      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'node',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/haopingbao.git',
      path: '/path/to/deploy',
      'post-setup': 'npm install',
      'post-deploy': 'npm run build && pm2 startOrRestart ecosystem.config.js --env production',
      'post-start': 'pm2 logs haopingbao-api'
    }
  }
};