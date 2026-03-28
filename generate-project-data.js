/**
 * generate-project-data.js
 * 
 * Generates a static portfolio-data.json snapshot for Vercel deployment.
 * Reads from local portfolio/ folder + cloudinary-mapping.json
 * and produces a file that the Vercel API route can serve directly.
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

const PORTFOLIO_DIR = path.join(__dirname, 'portfolio');
const MAPPING_FILE = path.join(__dirname, 'cloudinary-mapping.json');
const OUTPUT_FILE = path.join(__dirname, 'portfolio-data.json');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);
const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS]);
const EXCLUDED_FOLDERS = new Set(['.trash', '화분+동물 시리즈']);
const SKIP_FILES = new Set(['desktop.ini', 'readme.md', 'metadata.json', 'main - copy.jpg', 'image_order.json']);

let cloudinaryMapping = {};
try {
  cloudinaryMapping = fs.readJsonSync(MAPPING_FILE);
} catch { console.log('No cloudinary mapping — using local paths'); }

function resolveMediaUrl(localPath, variant = 'detail') {
  const entry = cloudinaryMapping[localPath];
  if (!entry) return localPath;
  return entry[variant] || entry.url || localPath;
}

async function readMetadata(folder) {
  const metaPath = path.join(PORTFOLIO_DIR, folder, 'metadata.json');
  try {
    const raw = await fs.readJson(metaPath);
    const ps = raw.provenanceAndSpecs || {};
    return {
      name: raw.name || folder,
      artisticStyle: ps.artisticStyle || raw.artisticStyle || '',
      medium: ps.medium || raw.medium || '',
      creationDate: ps.creationDate || raw.creationDate || '',
      insight: raw.curatorsInsight || raw.insight || '',
      url: raw.url || '',
      showThumbnailInGallery: raw.showThumbnailInGallery || false,
    };
  } catch {
    return { name: folder, artisticStyle: '', medium: '', creationDate: '', insight: '', url: '', showThumbnailInGallery: false };
  }
}

async function findThumbnail(folder) {
  const dir = path.join(PORTFOLIO_DIR, folder);
  const files = await fs.readdir(dir);
  const main = files.find(f => {
    const name = path.parse(f).name.toLowerCase();
    const ext = path.parse(f).ext.toLowerCase();
    return name === 'main' && (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext));
  });
  if (!main) return '';
  const localPath = `portfolio/${encodeURIComponent(folder)}/${main}`;
  return resolveMediaUrl(localPath, 'thumbnail');
}

async function listMedia(folder, includeMain = false) {
  const dir = path.join(PORTFOLIO_DIR, folder);
  const orderPath = path.join(dir, 'image_order.json');
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }

  const files = entries.filter(e => e.isFile()).map(e => e.name);
  let media = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    const name = f.toLowerCase();
    if (SKIP_FILES.has(name)) return false;
    if (!includeMain && path.parse(f).name.toLowerCase() === 'main') return false;
    if (f.endsWith('.tmp') || f.includes('.bak_')) return false;
    return MEDIA_EXTS.has(ext);
  });

  try {
    const order = await fs.readJson(orderPath);
    const ordered = [];
    for (const name of order) { if (media.includes(name)) ordered.push(name); }
    for (const name of media) { if (!ordered.includes(name)) ordered.push(name); }
    media = ordered;
  } catch {}

  return media.map(f => {
    const localPath = `portfolio/${encodeURIComponent(folder)}/${encodeURIComponent(f)}`;
    return {
      filename: f,
      path: resolveMediaUrl(localPath, 'detail'),
      type: VIDEO_EXTS.has(path.extname(f).toLowerCase()) ? 'video' : 'image',
    };
  });
}

async function main() {
  const orderFile = path.join(PORTFOLIO_DIR, 'order.json');
  let order = { cardCount: 11, order: [] };
  try { order = await fs.readJson(orderFile); } catch {}

  const entries = await fs.readdir(PORTFOLIO_DIR, { withFileTypes: true });
  const allFolders = entries
    .filter(e => e.isDirectory() && !EXCLUDED_FOLDERS.has(e.name) && !e.name.startsWith('.'))
    .map(e => e.name);

  const orderedFolders = [];
  for (const f of order.order) { if (allFolders.includes(f)) orderedFolders.push(f); }
  for (const f of allFolders) { if (!orderedFolders.includes(f)) orderedFolders.push(f); }

  const projects = [];
  for (const folder of orderedFolders) {
    const meta = await readMetadata(folder);
    const thumbnail = await findThumbnail(folder);
    const images = await listMedia(folder, meta.showThumbnailInGallery);
    projects.push({ folder, thumbnail, images, ...meta });
  }

  const data = { projects, cardCount: order.cardCount || projects.length };
  await fs.writeJson(OUTPUT_FILE, data, { spaces: 2 });
  console.log(`✅ Generated portfolio-data.json (${projects.length} projects, ${projects.reduce((s, p) => s + p.images.length, 0)} images)`);
}

main().catch(err => { console.error(err); process.exit(1); });
