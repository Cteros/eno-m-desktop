import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const appVuePath = path.join(rootDir, 'src/App.vue');

// 1. 读取当前版本号
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = pkg.version;

// 2. 增加版本号 (默认为 patch 更新)
const versionParts = currentVersion.split('.').map(Number);
versionParts[2] += 1;
const newVersion = versionParts.join('.');

console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

// 3. 更新 package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// 4. 更新 src/App.vue
let appVueContent = fs.readFileSync(appVuePath, 'utf-8');
// 替换 console.log('App version: ...')
const appVersionRegex = /console\.log\('App version: .*?'\)/;
if (appVersionRegex.test(appVueContent)) {
  appVueContent = appVueContent.replace(
    appVersionRegex,
    `console.log('App version: ${newVersion}')`
  );
  fs.writeFileSync(appVuePath, appVueContent);
} else {
  console.warn('Warning: Could not find "App version" log in src/App.vue');
}

// 5. 执行 git 命令
try {
  console.log('Executing git commands...');

  // 添加文件
  execSync(`git add "${packageJsonPath}" "${appVuePath}"`, { stdio: 'inherit', cwd: rootDir });

  // 提交
  execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit', cwd: rootDir });

  // 打标签
  execSync(`git tag v${newVersion}`, { stdio: 'inherit', cwd: rootDir });

  // 推送分支
  execSync(`git push origin main`, { stdio: 'inherit', cwd: rootDir });

  // 推送标签
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit', cwd: rootDir });

  console.log(`\n✅ Successfully released v${newVersion}`);
} catch (error) {
  console.error('\n❌ Failed to release:', error.message);
  process.exit(1);
}
