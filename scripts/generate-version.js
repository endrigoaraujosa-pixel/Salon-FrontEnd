#!/usr/bin/env node

/**
 * generate-version.js
 *
 * Gera o arquivo public/version.json com informações da versão atual do build.
 * Executado automaticamente antes do build do Vite (via npm run build).
 *
 * Campos gerados:
 *   - version: versão do package.json
 *   - build:   timestamp do build (YYYYMMDD-HHmm)
 *   - commit:  hash curto do commit git
 *   - date:    data/hora UTC do build (ISO 8601)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

// Lê a versão do package.json
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '0.0.0';

// Obtém o hash curto do commit git
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
} catch {
  console.warn('[generate-version] Aviso: não foi possível obter o commit git. Usando "unknown".');
}

// Gera o timestamp do build (YYYYMMDD-HHmm)
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const build = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

// Data ISO UTC
const date = now.toISOString();

const versionInfo = {
  version,
  build,
  commit,
  date,
};

// Salva em public/version.json
const outputPath = path.join(rootDir, 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf-8');

console.log(`[generate-version] Versão gerada: v${version} | build ${build} | commit ${commit}`);
console.log(`[generate-version] Salvo em: ${outputPath}`);
