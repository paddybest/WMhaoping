# 数据库迁移执行指南

**创建日期**: 2026-02-16
**适用于**: Docker环境部署

---

## 📋 问题分析

### 当前配置

**`.env` 文件配置**:
- `DB_HOST=localhost`, `DB_PORT=3306` - 本地占位符
- `DB_PASSWORD=rootpassword` - 占位符，实际密码在Docker环境变量中

**Docker配置** (`docker-compose.yml`):
- `MYSQL_ROOT_PASSWORD: rootpassword` - 这是实际的数据库root密码
- 数据库容器名为 `mysql`
- 应用容器通过 `env_file: .env` 加载配置

### 识别的问题

❌ **问题**: `.env`中的密码配置不适用于Docker环境
- 本地连接MySQL会失败（如刚才的错误所示）
- 需要进入Docker容器执行命令

---

## 🎯 方案选择

### 方案A：在Docker容器中执行迁移（推荐）

**优点**:
- ✅ 环境一致
- ✅ 数据库连接正常
- ✅ 可以直接执行迁移
- ✅ 有备份和回滚机制

**执行步骤**:

#### 1. 启动Docker服务（如果没有运行）
```bash
cd g:/haopingbaov4/backend
docker-compose up -d

# 验证服务是否运行
docker-compose ps
```

#### 2. 备份数据库
```bash
# 进入MySQL容器
docker exec -i haopingbao-mysql-1 bash

# 备份数据库
mysqldump -u root -prootpassword haopingbao > /tmp/backup_before_migration.sql

# 退出容器
exit

# 复制备份文件到主机
docker cp haopingbao-mysql-1:/tmp/backup_before_migration.sql ./
```

#### 3. 执行数据库迁移
```bash
# 重新进入容器
docker exec -i haopingbao-mysql-1 bash

# 执行迁移命令（在backend目录下）
cd /app
npm run migrate

# 验证迁移结果
mysql -u root -prootpassword haopingbao -e "DESC prizes"
mysql -u root -prootpassword haopingbao -e "SHOW INDEX FROM prizes"

# 退出容器
exit
```

#### 4. 验证迁移成功
检查以下内容：
- [ ] `merchants`表包含 `qr_code_url` 和 `customer_service_qr_url` 字段
- [ ] `prizes`表包含 `merchant_id` 字段且NOT NULL
- [ ] `prizes`表有外键约束和索引
- [ ] `lottery_codes`表包含 `merchant_id` 字段且NOT NULL
- [ ] `lottery_codes`表有外键约束和索引
- [ ] `qr_code_scans` 表已创建
- [ ] `qr_scan_statistics` 表已创建

---

### 方案B：修改.env为真实密码（不推荐）

**警告**: ⚠️ 此方案仅适用于开发环境，不适用于生产环境

**步骤**:

#### 1. 确认Docker中的MySQL root密码

```bash
# 查看docker-compose.yml中的密码
cat g:/haopingbaov4/backend/docker-compose.yml | grep MYSQL_ROOT_PASSWORD

# 输出应该显示：MYSQL_ROOT_PASSWORD: rootpassword
```

#### 2. 更新.env中的数据库密码

```bash
# 备份当前.env
cp g:/haopingbaov4/backend/.env g:/haopingbaov4/backend/.env.backup

# 修改密码
# 使用文本编辑器或sed命令
# 将 DB_PASSWORD=rootpassword 改为正确的密码
# 将 DB_HOST= localhost 改为 mysql（因为Docker中主机名是mysql）
```

#### 3. 测试连接

```bash
cd g:/haopingbaov4/backend
npm run dev

# 检查后端日志，确认数据库连接成功
```

#### 4. 备份数据库（本地执行）

```bash
# 现在本地可以连接数据库了
mysqldump -u root -p正确密码 haopingbao > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

#### 5. 执行迁移

```bash
cd g:/haopingbaov4/backend
npm run migrate
```

#### 6. 验证迁移结果

```bash
# 连接到数据库
mysql -u root -p正确密码 haopingbao

# 验证表结构
DESC prizes;
DESC lottery_codes;
DESC merchants;

# 验证外键和索引
SHOW INDEX FROM prizes;
SHOW INDEX FROM lottery_codes;
```

---

### 方案C：仅执行安全中间件（快速方案）

**适用场景**: 无法直接访问数据库，只想快速修复安全问题

**修改的文件**:
- `backend/src/routes/product.ts` - PUT/DELETE商品操作
- `backend/src/routes/productCategory.ts` - PUT/DELETE分类操作
- `backend/src/routes/merchantPrize.ts` - PUT/DELETE奖品操作

**修改内容**: 在PUT和DELETE路由添加 `validateMerchantAccess` 中间件

**优点**:
- ✅ 不需要数据库访问
- ✅ 立即解决安全问题
- ✅ 风险低，只修改路由配置

**缺点**:
- ⚠️ 没有执行数据库迁移，多租户功能仍无法使用

---

## 📊 迁移验证SQL命令

### 在MySQL容器中执行

```sql
-- 检查merchants表
DESC merchants;

-- 验证新字段
SHOW COLUMNS FROM merchants LIKE '%qr%';

-- 检查prizes表
DESC prizes;

-- 验证merchant_id
SHOW COLUMNS FROM prizes LIKE 'merchant_id';

-- 检查外键
SHOW CREATE TABLE prizes;

-- 检查lottery_codes表
DESC lottery_codes;

-- 验证新字段
SHOW COLUMNS FROM lottery_codes LIKE 'merchant_id';

-- 检查外键
SHOW CREATE TABLE lottery_codes;

-- 检查扫码统计表（应该已创建）
DESC qr_code_scans;
DESC qr_scan_statistics;

-- 验证现有数据的merchant_id分配
SELECT COUNT(*) FROM prizes WHERE merchant_id = 1;
SELECT COUNT(*) FROM lottery_codes WHERE merchant_id = 1;

-- 查看所有商家
SELECT id, username, shop_name FROM merchants;
```

---

## 🚨 回滚计划

如果迁移出现问题，使用以下回滚步骤：

### 在Docker容器中执行回滚

```bash
# 进入容器
docker exec -i haopingbao-mysql-1 bash

# 恢复备份
mysql -u root -prootpassword haopingbao < /tmp/backup_before_migration.sql

# 退出容器
exit
```

### 或手动执行回滚

```bash
# 启动Docker服务（如果没有运行）
cd g:/haopingbaov4/backend
docker-compose up -d

# 进入容器
docker exec -i haopingbao-mysql-1 bash

# 删除迁移记录（可选）
mysql -u root -prootpassword haopingbao -e "DELETE FROM migrations WHERE name IN ('006-add-multi-tenant-support', '007-add-scan-statistics-table')"

# 退出容器
exit
```

---

## 📋 执行检查清单

### 执行前检查
- [ ] Docker服务已启动
- [ ] 数据库连接正常
- [ ] 备份文件已创建

### 迁移执行
- [ ] 备份数据库
- [ ] 执行迁移命令 `npm run migrate`
- [ ] 检查迁移日志
- [ ] 验证无错误

### 迁移验证
- [ ] merchants表包含qr_code_url和customer_service_qr_url
- [ ] prizes表包含merchant_id字段且NOT NULL
- [ ] prizes表有外键约束
- [ ] prizes表有merchant_id索引
- [ ] lottery_codes表包含merchant_id字段且NOT NULL
- [ ] lottery_codes表有外键约束
- [ ] lottery_codes表有merchant_id索引
- [ ] qr_code_scans表已创建
- [ ] qr_scan_statistics表已创建

### 安全检查
- [ ] validateMerchantAccess中间件已添加到product.ts
- [ ] validateMerchantAccess中间件已添加到productCategory.ts
- [ ] validateMerchantAccess中间件已添加到merchantPrize.ts

### 回滚准备
- [ ] 备份文件已保存
- [ ] 回滚步骤已理解
- [ ] docker-compose命令已掌握

---

## 💡 推荐执行顺序

**建议按以下顺序执行**:

1. **立即**: 启动Docker服务并执行迁移
2. **之后**: 验证迁移结果
3. **然后**: 修改安全中间件（可在迁移后并行修改）
4. **最后**: 完整的端到端测试

**总预估时间**:
- 数据库迁移: 30-60分钟
- 安全中间件: 15分钟
- 验证: 10分钟
- 测试: 60分钟
- **总计**: 2-2.5小时

---

## 📝 注意事项

### ⚠️ 重要
- **Docker中的密码是 `rootpassword`** - 这只是一个示例密码
- 生产环境必须使用强密码
- 确保备份文件安全保存
- 迁移前务必备份数据库
- 验证每一步的输出

### 🔐 故障排查

**如果无法连接到MySQL容器**:
```bash
# 检查Docker服务状态
cd g:/haopingbaov4/backend
docker-compose ps

# 查看容器日志
docker-compose logs mysql

# 查看容器详情
docker exec -i haopingbao-mysql-1 mysql -u root -p'rootpassword' -e "SELECT 1"

# 重启Docker服务
docker-compose restart mysql
```

**如果迁移命令失败**:
```bash
# 检查backend容器日志
docker-compose logs app

# 查看具体错误
# 根据错误信息修复问题后重试
```

---

## ✅ 成功标准

迁移成功后，您应该能够：

1. ✅ 注册新商家时自动生成二维码
2. ✅ 商品、奖品数据正确关联到商家
3. ✅ 跨商家访问被阻止
4. ✅ 小程序能根据merchant_id获取正确数据
5. ✅ 二维码防伪造正常工作

---

## 📄 相关文档

- [多租户架构设计文档](../plans/2026-02-16-multi-tenant-architecture-design.md)
- [实施计划](../plans/implementation-plan-priority-tasks.md)
- [全面审查报告](../review/multi-tenant-comprehensive-audit-20260216.md)
- [数据库迁移说明](../docs/migrations/006-usage-guide.md) - 已有文档

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
**维护者**: Haopingbao Team
