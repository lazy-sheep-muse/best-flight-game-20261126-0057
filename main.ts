// Sunset Ridge Courier — entrypoint for make.fun.
// Copies game/ and screenshots/ from this repository into the output
// directory, then writes dossier.json with the official buildDossier
// from vendor/makefun-game.ts. Node 22 standard library only, no network,
// fully deterministic: the same repository always writes the same bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's own caps for this bounty: the text budget, the screenshot
// budget (at most 4 images, each at most 256 KiB) and the game tree caps.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in ${repoRoot}`);
  cpSync(src, join(outDir, name), { recursive: true });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');
// buildDossier reads the copied trees, so the dossier always describes
// exactly the bytes that were handed in — nothing is computed twice.
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
console.log(`Sunset Ridge Courier written to ${outDir}`);
