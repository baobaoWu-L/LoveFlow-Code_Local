/**
 * LoveFlowCode 模型服务器设置脚本
 * 自动下载 llama.cpp CUDA server binary 并配置
 *
 * 使用: node scripts/setup-server.cjs
 */
const { execSync } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, createWriteStream } = require('fs');
const { join } = require('path');
const https = require('https');
const http = require('http');
const { createInterface } = require('readline');

const MODEL_PATH = 'D:\\LLM\\Qwen\\Negentropy-claude-opus-4.7-9B-Q8_0.gguf';
const VENDOR_DIR = join(__dirname, '..', 'vendor', 'llama');
const SERVER_PORT = 8002;

function log(msg) {
  console.log(`[LoveFlowCode] ${msg}`);
}

function checkModelExists() {
  if (!existsSync(MODEL_PATH)) {
    log(`警告: 模型文件不存在: ${MODEL_PATH}`);
    log('请确保 GGUF 模型文件已下载到正确位置');
    return false;
  }
  const size = require('fs').statSync(MODEL_PATH).size;
  log(`模型文件已找到: ${(size / 1e9).toFixed(1)}GB`);
  return true;
}

async function downloadFile(url, dest) {
  log(`正在下载: ${url}`);
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        require('fs').unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'], 10);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = (downloaded / total * 100).toFixed(1);
          process.stdout.write(`\r  下载进度: ${pct}% (${(downloaded/1e6).toFixed(0)}MB / ${(total/1e6).toFixed(0)}MB)`);
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    }).on('error', reject);
  });
}

async function downloadLlamaCpp() {
  if (!existsSync(VENDOR_DIR)) mkdirSync(VENDOR_DIR, { recursive: true });

  // 尝试多个版本的 llama.cpp (从新到旧)
  const versions = ['b9873', 'b9500', 'b9000', 'b8500', 'b8000'];

  for (const ver of versions) {
    const url = `https://github.com/ggml-org/llama.cpp/releases/download/${ver}/llama-${ver}-bin-win-cuda-x64.zip`;
    const dest = join(VENDOR_DIR, `llama-${ver}.zip`);

    try {
      await downloadFile(url, dest);
      log(`下载成功: llama.cpp ${ver}`);

      // 解压
      log('正在解压...');
      execSync(`powershell -Command "Expand-Archive -Path '${dest}' -DestinationPath '${VENDOR_DIR}' -Force"`, { stdio: 'pipe' });

      // 检查 server.exe
      if (existsSync(join(VENDOR_DIR, 'server.exe'))) {
        log('server.exe 已就绪');
        return true;
      }

      // 尝试查找
      const files = require('fs').readdirSync(VENDOR_DIR);
      const serverExe = files.find(f => f.includes('server') && f.endsWith('.exe'));
      if (serverExe) {
        log(`找到 server: ${serverExe}`);
        return true;
      }
    } catch (e) {
      log(`版本 ${ver} 下载失败: ${e.message}`);
    }
  }

  log('无法自动下载 llama.cpp。请手动下载:');
  log('https://github.com/ggml-org/llama.cpp/releases');
  return false;
}

async function main() {
  log('LoveFlowCode 模型服务器设置');
  log('================================');

  checkModelExists();

  log('\n检查 llama.cpp 二进制文件...');
  const servers = ['llama-server.exe', 'server.exe'];
  const found = servers.find(f => existsSync(join(VENDOR_DIR, f)));

  if (found) {
    log(`找到已有服务端: ${found}`);
  } else {
    log('未找到服务端二进制，尝试下载...');
    const ok = await downloadLlamaCpp();
    if (!ok) {
      log('\n========================================');
      log('请手动下载 llama.cpp CUDA 版本:');
      log('1. 访问 https://github.com/ggml-org/llama.cpp/releases');
      log('2. 下载 llama-b*-bin-win-cuda-x64.zip');
      log('3. 解压到 vendor/llama/ 目录');
      log('========================================');
    }
  }

  log('\n设置完成！');
  log(`运行 "loveflowcode" 即可启动`);
}

main().catch(console.error);
