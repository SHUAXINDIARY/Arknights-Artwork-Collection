/**
 * 构建配置脚本
 * 读取 .env 文件并生成 packages/UserDataCatch/config.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const configPath = path.join(rootDir, 'packages/UserDataCatch/config.js');

// 默认值
const DEFAULT_API_BASE_URL = 'https://akdb.nixideshuaxin.workers.dev';

// 读取 .env 文件
function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env 文件不存在，使用默认配置');
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

// 生成配置文件
function generateConfig() {
  const env = readEnvFile();
  const apiBaseUrl = env.AK_DB_DOMAIN || DEFAULT_API_BASE_URL;

  const configContent = `// 此文件由 scripts/build-config.js 自动生成，请勿手动修改
// 配置来源: .env 文件中的 AK_DB_DOMAIN
window.API_BASE_URL = '${apiBaseUrl}';
`;

  fs.writeFileSync(configPath, configContent, 'utf-8');
  console.log('✅ 配置文件已生成:', configPath);
  console.log('   API_BASE_URL:', apiBaseUrl);
}

generateConfig();
