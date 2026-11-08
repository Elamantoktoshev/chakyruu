import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { isTemplateKey, type OpeningAnimation } from '@chakyruu/shared';

/** The part of Vite's dist/.vite/manifest.json we use. */
interface ManifestChunk {
  file: string;
  imports?: string[];
  css?: string[];
  isEntry?: boolean;
}
type Manifest = Readonly<Record<string, ManifestChunk>>;

export interface Preloads {
  scripts: string[];
  styles: string[];
}

const NONE: Preloads = { scripts: [], styles: [] };

/** Lazy chunks an invitation needs before its first paint: its template and the opening scenes. */
export function invitationModules(componentKey: string, opening: OpeningAnimation): string[] {
  const template = `src/templates/${isTemplateKey(componentKey) ? componentKey : 'classic'}/index.tsx`;
  if (opening === 'NONE') return [template];
  if (opening === 'TEMPLATE') return [template, 'src/openings/layered/LayeredScene.tsx', 'src/openings/scenes.tsx'];
  return [template, 'src/openings/scenes.tsx'];
}

/** Lazy chunks (with their static imports and CSS), minus what index.html already loads. */
export function collectPreloads(manifest: Manifest, modules: readonly string[]): Preloads {
  const seen = new Set<string>();
  const scripts: string[] = [];
  const styles: string[] = [];
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (!chunk || chunk.isEntry || seen.has(key)) return;
    seen.add(key);
    scripts.push(`/${chunk.file}`);
    styles.push(...(chunk.css ?? []).map((file) => `/${file}`));
    (chunk.imports ?? []).forEach(visit);
  };
  modules.forEach(visit);
  return { scripts, styles: [...new Set(styles)] };
}

/** Reads the manifest of the current build (re-read after a rebuild); no manifest → no preloads. */
export function manifestPreloader(clientDir: string): (modules: readonly string[]) => Preloads {
  const file = path.join(clientDir, '.vite', 'manifest.json');
  let cached: { mtimeMs: number; manifest: Manifest } | null = null;
  return (modules) => {
    try {
      const { mtimeMs } = statSync(file);
      if (cached?.mtimeMs !== mtimeMs) cached = { mtimeMs, manifest: JSON.parse(readFileSync(file, 'utf8')) as Manifest };
      return collectPreloads(cached.manifest, modules);
    } catch {
      return NONE;
    }
  };
}

export function renderPreloadTags({ scripts, styles }: Preloads): string {
  return [
    ...styles.map((href) => `<link rel="preload" as="style" href="${href}" />`),
    ...scripts.map((href) => `<link rel="modulepreload" crossorigin href="${href}" />`),
  ].join('\n    ');
}
