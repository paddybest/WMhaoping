# Migration 006 Usage Guide: Add Multi-Tenant Support

**Migration File**: `backend/src/database/migrations/006-add-multi-tenant-support.ts`
**Created**: 2026-02-16
**Type**: Schema Migration + Data Migration

---

## What This Migration Does

Transforms the single-tenant Haopingbao system into a multi-tenant architecture by:

1. **Extends `merchants` table**:
   - Adds `customer_service_qr_url` (VARCHAR(500)) - For storing customer service QR code image URLs
   - Adds `qr_code_url` (VARCHAR(500)) - For storing merchant-specific QR code URLs

2. **Updates `prizes` table**:
   - Adds `merchant_id` (INT, NOT NULL) - Links each prize to a merchant
   - Adds foreign key constraint: `fk_prizes_merchant` → `merchants(id)` with CASCADE delete
   - Adds index: `idx_prizes_merchant_id` for query performance
   - Migrates existing prize records to `merchant_id = 1`

3. **Updates `lottery_codes` table**:
   - Adds `merchant_id` (INT, NOT NULL) - Links each lottery code to a merchant
   - Adds foreign key constraint: `fk_lottery_codes_merchant` → `merchants(id)` with CASCADE delete
   - Adds index: `idx_lottery_codes_merchant_id` for query performance
   - Migrates existing lottery code records to `merchant_id = 1`

---

## Prerequisites

⚠️ **IMPORTANT**: Before running this migration, ensure:

1. **Merchant with ID=1 exists**:
   ```sql
   SELECT id FROM merchants WHERE id = 1;
   ```
   If this returns no results, create a default merchant:
   ```sql
   INSERT INTO merchants (username, password, shop_name, name, description, is_active)
   VALUES ('default_merchant', '<hashed_password>', 'Default Shop', 'Default Merchant', 'Default merchant for data migration', 1);
   ```

2. **Database backup** (recommended for production):
   ```bash
   mysqldump -u root -p haopingbao > backup_before_multi_tenant_$(date +%Y%m%d).sql
   ```

3. **Development environment ready**:
   - Backend dependencies installed
   - Database connection configured in `.env`
   - Migration runner available

---

## Running the Migration

### Option 1: Using the Migration Runner (Recommended)

From the backend directory:

```bash
cd backend

# Run all pending migrations
npm run migrate

# Or run specific migration
npm run migrate:006
```

### Option 2: Manual Execution (For Testing)

```bash
cd backend

# Start Node.js REPL
node

# Import and run migration
const { up } = require('./src/database/migrations/006-add-multi-tenant-support.ts');
await up();
```

---

## Expected Output

When migration runs successfully, you'll see:

```
🚀 Starting migration: Add multi-tenant support...
📋 Step 1: Verifying default merchant exists...
✅ Default merchant (id=1) verified
📋 Step 2: Extending merchants table with QR code URLs...
  ✓ Added customer_service_qr_url column
  ✓ Added qr_code_url column
📋 Step 3: Adding merchant_id to prizes table...
  ✓ Added merchant_id column to prizes
  ✓ Migrated 15 existing prize records to merchant_id=1
  ✓ Set merchant_id to NOT NULL
  ✓ Added foreign key constraint
  ✓ Created index on merchant_id
📋 Step 4: Adding merchant_id to lottery_codes table...
  ✓ Added merchant_id column to lottery_codes
  ✓ Migrated 42 existing lottery code records to merchant_id=1
  ✓ Set merchant_id to NOT NULL
  ✓ Added foreign key constraint
  ✓ Created index on merchant_id

✅ Multi-tenant support migration completed successfully!

📊 Summary:
  - Merchants table: Extended with 2 QR code URL columns
  - Prizes table: 15 records migrated to merchant_id=1
  - Lottery codes table: 42 records migrated to merchant_id=1

🔐 Foreign key constraints and indexes added for data integrity
```

---

## Verifying the Migration

### 1. Check Table Structure

```sql
-- Merchants table
DESCRIBE merchants;
-- Should show: customer_service_qr_url, qr_code_url

-- Prizes table
DESCRIBE prizes;
-- Should show: merchant_id (NOT NULL)

-- Lottery codes table
DESCRIBE lottery_codes;
-- Should show: merchant_id (NOT NULL)
```

### 2. Verify Foreign Keys

```sql
-- Check prizes foreign key
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'haopingbao'
  AND TABLE_NAME = 'prizes'
  AND CONSTRAINT_NAME = 'fk_prizes_merchant';

-- Check lottery_codes foreign key
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'haopingbao'
  AND TABLE_NAME = 'lottery_codes'
  AND CONSTRAINT_NAME = 'fk_lottery_codes_merchant';
```

### 3. Verify Indexes

```sql
-- Check prizes index
SHOW INDEX FROM prizes WHERE Key_name = 'idx_prizes_merchant_id';

-- Check lottery_codes index
SHOW INDEX FROM lottery_codes WHERE Key_name = 'idx_lottery_codes_merchant_id';
```

### 4. Verify Data Migration

```sql
-- Check prizes have merchant_id
SELECT COUNT(*) as prizes_without_merchant FROM prizes WHERE merchant_id IS NULL;
-- Should return 0

-- Check lottery_codes have merchant_id
SELECT COUNT(*) as codes_without_merchant FROM lottery_codes WHERE merchant_id IS NULL;
-- Should return 0

-- Check merchant_id values
SELECT merchant_id, COUNT(*) as count
FROM prizes
GROUP BY merchant_id;
-- Should show all prizes with merchant_id=1 (or other valid merchant IDs)
```

---

## Rolling Back the Migration

⚠️ **WARNING**: Rollback will permanently delete all merchant_id associations and QR code URL data. Only use in development/testing!

### Using Migration Runner

```bash
cd backend

# Rollback last migration
npm run migrate:rollback

# Or rollback specific migration
npm run migrate:rollback:006
```

### Manual Rollback

```bash
node
const { down } = require('./src/database/migrations/006-add-multi-tenant-support.ts');
await down();
```

**Expected Rollback Output**:
```
🔄 Rolling back migration: Remove multi-tenant support...
📋 Step 1: Removing lottery_codes merchant_id...
  ✓ Dropped foreign key constraint
  ✓ Dropped index
  ✓ Dropped merchant_id column
📋 Step 2: Removing prizes merchant_id...
  ✓ Dropped foreign key constraint
  ✓ Dropped index
  ✓ Dropped merchant_id column
📋 Step 3: Removing merchants table extensions...
  ✓ Dropped customer_service_qr_url column
  ✓ Dropped qr_code_url column

✅ Rollback completed successfully!

⚠️  Warning: Data associated with merchant_id has been permanently lost
```

---

## Troubleshooting

### Error: "Migration failed: Default merchant (id=1) does not exist"

**Solution**: Create a default merchant with id=1:
```sql
INSERT INTO merchants (id, username, password, shop_name, name, description, is_active)
VALUES (1, 'default_merchant', '<hashed_password>', 'Default Shop', 'Default Merchant', 'Default merchant for data migration', 1);
```

### Error: "Can't create table errno: 150 'Foreign key constraint is incorrectly formed'"

**Solution**: This usually means:
1. The `merchants` table doesn't exist
2. The `id` column in `merchants` is not INT or is not PRIMARY KEY
3. Existing data has invalid merchant_id values

Check:
```sql
SHOW CREATE TABLE merchants;
-- Verify id column is INT PRIMARY KEY
```

### Error: "Duplicate column name" during migration

**Solution**: The migration already ran partially. Rollback first, then retry:
```bash
# Rollback
npm run migrate:rollback:006
# Retry
npm run migrate:006
```

### Error: "Data truncation" or similar

**Solution**: Check for existing invalid data:
```sql
-- Check for NULL merchant_id that should have been migrated
SELECT COUNT(*) FROM prizes WHERE merchant_id IS NULL;
SELECT COUNT(*) FROM lottery_codes WHERE merchant_id IS NULL;
```

---

## Post-Migration Tasks

After running this migration successfully:

1. ✅ **Update Model Files**: Update TypeScript models to include new fields
   - [ ] `Merchant.ts`: Add `customerServiceQrUrl`, `qrCodeUrl` to interface
   - [ ] `Prize.ts`: Add `merchantId` to interface
   - [ ] `LotteryCode.ts`: Add `merchantId` to interface

2. ✅ **Update API Controllers**: Add merchant_id filtering to queries
   - [ ] Ensure all queries filter by merchant_id
   - [ ] Add merchant_id to INSERT operations

3. ✅ **Test Data Isolation**: Verify merchants can't see each other's data
   - [ ] Create test merchant B
   - [ ] Add data for merchant B
   - [ ] Verify merchant A can't see merchant B's data

4. ✅ **Update Documentation**
   - [ ] Document new merchant_id requirements
   - [ ] Update API documentation with merchant_id parameters

---

## Impact on Existing Code

### Breaking Changes
- **Prize queries** must now include `merchant_id` in WHERE clauses
- **LotteryCode queries** must now include `merchant_id` in WHERE clauses
- **INSERT operations** for prizes and lottery_codes must provide `merchant_id`

### Non-Breaking Changes
- Merchants table new columns are optional (NULL allowed)
- Existing data automatically migrated to merchant_id=1
- Foreign keys with CASCADE prevent orphaned data

---

## Next Steps

After this migration is complete, proceed with:

1. **Task #2**: Update TypeScript models to reflect new schema
2. **Task #3**: Modify API controllers to use merchant_id filtering
3. **Task #4**: Implement QR code generation service
4. **Task #5**: Update mini-program to pass merchant_id in API calls

See: [Multi-Tenant Architecture Design](../plans/2026-02-16-multi-tenant-architecture-design.md)

---

**Questions?** Refer to the main migration file or architectural design document.

**Last Updated**: 2026-02-16
