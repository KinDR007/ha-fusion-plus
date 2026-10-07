#!/usr/bin/env node
/**
 * Converts a dashboard.yaml of KinDR007/ha-fusion (Svelte 4) to ha-fusion-plus.
 * The app also does this in memory on load; this script writes the result.
 *
 *   node scripts/migrate/fusion-plus.mjs data/dashboard.yaml [--dry-run]
 *
 * Writes a timestamped backup next to the file before changing it.
 * Needs Node 22.18+ (TypeScript type stripping) and the project dependencies.
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import * as yaml from 'js-yaml';
import { migrateDashboard } from '../../src/lib/Plus/migrate.ts';

const [file, ...flags] = process.argv.slice(2);
if (!file) {
	console.error('usage: node scripts/migrate/fusion-plus.mjs <dashboard.yaml> [--dry-run]');
	process.exit(2);
}

const source = await readFile(file, 'utf8');
const { dashboard, changes } = migrateDashboard(yaml.load(source) ?? {});

if (!changes.length) {
	console.log('nothing to migrate');
	process.exit(0);
}

changes.forEach((change) => console.log(`  ${change}`));

if (flags.includes('--dry-run')) {
	console.log(`${changes.length} items would change (dry run)`);
	process.exit(0);
}

const backup = `${file}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
await copyFile(file, backup);
await writeFile(file, yaml.dump(dashboard));
console.log(`${changes.length} items migrated, backup: ${backup}`);
