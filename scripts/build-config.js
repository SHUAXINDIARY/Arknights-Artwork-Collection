/**
 * 构建配置脚本
 * 读取 .env 文件并生成:
 * - packages/UserDataCatch/config.js
 * - packages/UserDataCatch/manifest.json
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const extensionDir = path.join(rootDir, 'packages/UserDataCatch');
const configPath = path.join(extensionDir, 'config.js');
const manifestTemplatePath = path.join(extensionDir, 'manifest.template.json');
const manifestPath = path.join(extensionDir, 'manifest.json');

// 默认值
const DEFAULT_API_BASE_URL = '';

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

// 生成 config.js
function generateConfigJs(apiBaseUrl) {
  const configContent = `// 此文件由 scripts/build-config.js 自动生成，请勿手动修改
// 配置来源: .env 文件中的 AK_DB_DOMAIN
window.API_BASE_URL = '${apiBaseUrl}';
`;

  fs.writeFileSync(configPath, configContent, 'utf-8');
  console.log('✅ config.js 已生成');
}

// 生成 manifest.json
function generateManifest(apiBaseUrl) {
  if (!fs.existsSync(manifestTemplatePath)) {
    console.log('⚠️  manifest.template.json 不存在，跳过生成 manifest.json');
    return;
  }

  const template = fs.readFileSync(manifestTemplatePath, 'utf-8');
  const manifest = template.replace(/\{\{AK_DB_DOMAIN\}\}/g, apiBaseUrl);

  fs.writeFileSync(manifestPath, manifest, 'utf-8');
  console.log('✅ manifest.json 已生成');
}

// 主函数
function build() {
  const env = readEnvFile();
  const apiBaseUrl = env.AK_DB_DOMAIN || DEFAULT_API_BASE_URL;

  console.log('📦 开始构建扩展配置...');
  console.log('   AK_DB_DOMAIN:', apiBaseUrl);
  console.log('');

  generateConfigJs(apiBaseUrl);
  generateManifest(apiBaseUrl);

  console.log('');
  console.log('🎉 构建完成!');
}

build();
