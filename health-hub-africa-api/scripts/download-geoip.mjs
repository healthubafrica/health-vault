#!/usr/bin/env node
/**
 * Download the MaxMind GeoLite2 City + ASN databases into GEOIP_DB_DIR
 * (default: ./geoip). Run at deploy time — the .mmdb files are gitignored
 * because MaxMind's GeoLite2 EULA disallows redistribution.
 *
 *   MAXMIND_LICENSE_KEY=xxxx node scripts/download-geoip.mjs
 *
 * Needs `tar` on PATH (bundled with Windows 10+, macOS, and Linux). If the
 * licence key is missing the script exits 0 with a warning so a deploy
 * without GeoIP still succeeds — GeoResolverService just stays disabled and
 * analytics falls back to edge-header geo.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, rm, readdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';

const execFileP = promisify(execFile);

const LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;
const DEST_DIR = process.env.GEOIP_DB_DIR || join(process.cwd(), 'geoip');
const EDITIONS = ['GeoLite2-City', 'GeoLite2-ASN'];

if (!LICENSE_KEY) {
  console.warn('[geoip] MAXMIND_LICENSE_KEY not set — skipping download. GeoIP resolution will be disabled.');
  process.exit(0);
}

async function downloadEdition(edition) {
  const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${LICENSE_KEY}&suffix=tar.gz`;
  const work = join(tmpdir(), `geoip-${edition}-${Date.now()}`);
  await mkdir(work, { recursive: true });
  const tarball = join(work, `${edition}.tar.gz`);

  console.log(`[geoip] downloading ${edition}…`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${edition}: HTTP ${res.status} ${res.statusText} (check MAXMIND_LICENSE_KEY)`);
  }
  await pipeline(res.body, createWriteStream(tarball));

  // Extract; the .mmdb sits inside a dated directory like GeoLite2-City_20260910/.
  await execFileP('tar', ['-xzf', tarball, '-C', work]);
  const entries = await readdir(work, { withFileTypes: true });
  const extracted = entries.find((e) => e.isDirectory() && e.name.startsWith(edition));
  if (!extracted) throw new Error(`${edition}: no extracted directory found`);

  const mmdbName = `${edition}.mmdb`;
  await rename(join(work, extracted.name, mmdbName), join(DEST_DIR, mmdbName));
  await rm(work, { recursive: true, force: true });

  const { size } = await stat(join(DEST_DIR, mmdbName));
  console.log(`[geoip] ${mmdbName} → ${DEST_DIR} (${(size / 1e6).toFixed(1)} MB)`);
}

try {
  await mkdir(DEST_DIR, { recursive: true });
  for (const edition of EDITIONS) {
    await downloadEdition(edition);
  }
  console.log('[geoip] done.');
} catch (err) {
  console.error(`[geoip] failed: ${err.message}`);
  process.exit(1);
}
