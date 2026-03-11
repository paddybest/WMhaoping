-- 创建数据库用户
CREATE USER IF NOT EXISTS 'haopingbao_user'@'%' IDENTIFIED BY 'haopingbao_password';

-- 授权用户访问数据库
GRANT ALL PRIVILEGES ON haopingbao.* TO 'haopingbao_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;