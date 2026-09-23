#!/usr/bin/env node

/**
 * generate-version.js
 *
 * Gera o arquivo public/version.json com informações da versão atual do build.
 * Executado automaticamente antes do build do Vite (via npm run build).
 *
 * Campos gerados:
 *   - version: versão do package.json
 *   - build:   releaseBuild do package.json ou timestamp (YYYYMMDD-HHmm)
 *   - commit:  hash curto do commit git
 *   - date:    data/hora UTC do build (ISO 8601)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const rootDir = path.resolve(__dirname, '..');

async function main() {
  const { AGENDA_TIME_ZONE } = await import(pathToFileURL(path.join(rootDir, 'src/lib/date.js')).href);

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
  const timezone = AGENDA_TIME_ZONE;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  // A release pode manter seu identificador mesmo quando publicada em outro horário.
  // Ao criar uma nova release, atualizar releaseBuild junto com version.
  if (pkg.releaseBuild != null && !/^\d{8}-\d{4}$/.test(pkg.releaseBuild)) {
    throw new Error('releaseBuild deve estar no formato YYYYMMDD-HHmm');
  }
  const build = pkg.releaseBuild || `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;

  // Data ISO UTC
  const date = now.toISOString();

  const versionInfo = {
    version,
    build,
    commit,
    date,
    timezone,
  };

  // Salva em public/version.json
  const outputPath = path.join(rootDir, 'public', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2) + '\n', 'utf-8');

  console.log(`[generate-version] Versão gerada: v${version} | build ${build} | commit ${commit}`);
  console.log(`[generate-version] Salvo em: ${outputPath}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
