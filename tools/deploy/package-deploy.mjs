import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = resolve(import.meta.dirname, '../..');
const DIST_DIR = join(ROOT_DIR, 'apps/web/dist');
const BUNDLE_DIR = join(ROOT_DIR, 'deploy-bundle/public_html');
const ZIP_PATH = join(ROOT_DIR, 'deploy-bundle/hafalanku-entry-public_html.zip');

const FORBIDDEN_ENTRIES = new Set([
  'node_modules',
  '.env',
  '.env.local',
  '.git',
  '.agents',
  '.agent',
  'package.json',
]);

function walkSizeAndVerify(dir) {
  let totalBytes = 0;
  let fileCount = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (FORBIDDEN_ENTRIES.has(entry.name)) {
      throw new Error(`Artefak terlarang ditemukan di dist: ${entry.name}`);
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walkSizeAndVerify(fullPath);
      totalBytes += sub.totalBytes;
      fileCount += sub.fileCount;
    } else {
      totalBytes += statSync(fullPath).size;
      fileCount++;
    }
  }

  return { totalBytes, fileCount };
}

function main() {
  if (!existsSync(DIST_DIR)) {
    console.error('Folder apps/web/dist belum ada. Jalankan "npm run build:web" terlebih dahulu.');
    process.exit(1);
  }

  const { totalBytes, fileCount } = walkSizeAndVerify(DIST_DIR);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
  const maxEntryMb = 900;

  if (totalBytes / (1024 * 1024) > maxEntryMb) {
    console.error(`Ukuran build (${totalMb} MB) mendekati/melebihi batas 1 GB Rumahweb Entry.`);
    process.exit(1);
  }

  if (existsSync(BUNDLE_DIR)) {
    rmSync(BUNDLE_DIR, { recursive: true, force: true });
  }
  mkdirSync(BUNDLE_DIR, { recursive: true });
  cpSync(DIST_DIR, BUNDLE_DIR, { recursive: true });

  if (existsSync(ZIP_PATH)) {
    rmSync(ZIP_PATH, { force: true });
  }

  if (process.platform === 'win32') {
    execFileSync(
      'tar',
      ['-a', '-c', '-f', ZIP_PATH, '-C', BUNDLE_DIR, '.'],
      { stdio: 'inherit' }
    );
  } else {
    execFileSync('zip', ['-r', ZIP_PATH, '.'], { cwd: BUNDLE_DIR, stdio: 'inherit' });
  }

  console.log('Paket deploy Rumahweb Entry berhasil dibuat:');
  console.log(` - Folder siap upload : ${BUNDLE_DIR}`);
  console.log(` - Arsip ZIP cPanel   : ${ZIP_PATH}`);
  console.log(` - Total file         : ${fileCount}`);
  console.log(` - Total ukuran       : ${totalMb} MB (aman di bawah batas 1 GB Entry)`);
}

main();
