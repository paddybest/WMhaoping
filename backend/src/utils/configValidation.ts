import dotenv from 'dotenv';

dotenv.config();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 验证OSS配置
export function validateOSSConfig(): ValidationResult {
  const errors: string[] = [];
  const requiredVars = [
    'OSS_ACCESS_KEY_ID',
    'OSS_ACCESS_KEY_SECRET'
  ];

  const optionalVars = [
    { name: 'OSS_REGION', default: 'oss-cn-hangzhou' },
    { name: 'OSS_BUCKET', default: 'haopingbao-images' }
  ];

  // 检查必需的环境变量
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // 检查可选的环境变量，使用默认值
  for (const { name, default: defaultValue } of optionalVars) {
    if (!process.env[name]) {
      console.warn(`⚠️  ${name} not set, using default: ${defaultValue}`);
      process.env[name] = defaultValue;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证数据库配置
export function validateDatabaseConfig(): ValidationResult {
  const errors: string[] = [];
  const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // 检查可选的数据库端口
  if (!process.env.DB_PORT) {
    console.warn('⚠️  DB_PORT not set, using default: 3306');
    process.env.DB_PORT = '3306';
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证JWT配置
export function validateJWTConfig(): ValidationResult {
  const errors: string[] = [];

  if (!process.env.JWT_SECRET) {
    errors.push('Missing required environment variable: JWT_SECRET');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 验证所有配置
export function validateAllConfigs(): ValidationResult {
  console.log('🔍 Validating application configuration...\n');

  const results = {
    database: validateDatabaseConfig(),
    jwt: validateJWTConfig(),
    oss: validateOSSConfig()
  };

  const allErrors: string[] = [];

  // 显示验证结果
  console.log('📊 Configuration Validation Results:');
  console.log('=====================================');

  if (results.database.isValid) {
    console.log('✅ Database Configuration: Valid');
  } else {
    console.log('❌ Database Configuration: Invalid');
    allErrors.push(...results.database.errors);
  }

  if (results.jwt.isValid) {
    console.log('✅ JWT Configuration: Valid');
  } else {
    console.log('❌ JWT Configuration: Invalid');
    allErrors.push(...results.jwt.errors);
  }

  if (results.oss.isValid) {
    console.log('✅ OSS Configuration: Valid');
  } else {
    console.log('❌ OSS Configuration: Invalid');
    allErrors.push(...results.oss.errors);
  }

  console.log('=====================================\n');

  if (allErrors.length > 0) {
    console.error('❌ Configuration Errors:');
    allErrors.forEach(error => console.error(`   - ${error}`));
    console.error('');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}
