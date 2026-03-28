/**
 * server.js — Portfolio Website Backend
 * Serves static files + REST API for project/image management
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs-extra');
const multer  = require('multer');
const sharp   = require('sharp');

// Cloudinary URL mapping (loaded at startup, empty if no mapping file)
let cloudinaryMapping = {};
const MAPPING_FILE = path.join(__dirname, 'cloudinary-mapping.json');
try {
  if (fs.pathExistsSync(MAPPING_FILE)) {
    cloudinaryMapping = fs.readJsonSync(MAPPING_FILE);
    console.log(`Cloudinary mapping loaded: ${Object.keys(cloudinaryMapping).length} entries`);
  }
} catch { /* no mapping file — serve locally */ }

const app  = express();
const PORT = 3000;

const PORTFOLIO_DIR = path.join(__dirname, 'portfolio');
const TRASH_DIR     = path.join(PORTFOLIO_DIR, '.trash');
const ORDER_FILE    = path.join(PORTFOLIO_DIR, 'order.json');
const INDEX_FILE    = path.join(PORTFOLIO_DIR, 'index.json');

// Folders to exclude from project scanning
const EXCLUDED_FOLDERS = new Set([
  '.trash',
  '화분+동물 시리즈',
]);

// Allowed media extensions
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);
const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS]);

// Files to skip when listing media
const SKIP_FILES = new Set(['desktop.ini', 'readme.md', 'metadata.json', 'main - copy.jpg']);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());

// Serve portfolio files with no caching & immediate fd release
// This prevents Windows EBUSY when replacing files that are being served
app.use('/portfolio', express.static(PORTFOLIO_DIR, {
  etag: false,
  lastModified: false,
  maxAge: 0,
  cacheControl: false,
  immutable: false,
}));

// Serve other static files normally
app.use(express.static(__dirname, {
  index: 'index.html',
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read order.json or return defaults */
async function readOrder() {
  try {
    return await fs.readJson(ORDER_FILE);
  } catch {
    return { cardCount: 11, order: [] };
  }
}

/** Write order.json */
async function writeOrder(data) {
  await fs.writeJson(ORDER_FILE, data, { spaces: 2 });
}

/** Read a project's metadata.json, return defaults if missing */
async function readMetadata(folder) {
  const metaPath = path.join(PORTFOLIO_DIR, folder, 'metadata.json');
  try {
    const raw = await fs.readJson(metaPath);
    const ps = raw.provenanceAndSpecs || {};
    return {
      name:          raw.name || folder,
      artisticStyle: ps.artisticStyle || raw.artisticStyle || '',
      medium:        ps.medium || raw.medium || '',
      creationDate:  ps.creationDate || raw.creationDate || '',
      insight:       raw.curatorsInsight || raw.insight || '',
      url:           raw.url || '',
      showThumbnailInGallery: raw.showThumbnailInGallery || false,
    };
  } catch {
    // Generate sensible defaults for folders without metadata
    const defaults = getDefaultMeta(folder);
    return defaults;
  }
}

/** Default metadata for folders without metadata.json */
function getDefaultMeta(folder) {
  const map = {
    '2025_animated': {
      name: 'Animated Nature Series',
      artisticStyle: 'Animation / Nature Art',
      medium: 'Digital Animation',
      creationDate: '2025',
      insight: 'An animated series bringing natural scenes to life through motion and color.',
    },
    '2025_flower': {
      name: 'Flower Illustration',
      artisticStyle: 'Botanical Illustration',
      medium: 'Digital Illustration',
      creationDate: '2025',
      insight: 'A collection of flower illustrations exploring form, color, and natural beauty.',
    },
    'random_pots': {
      name: 'Random Pots',
      artisticStyle: 'Product Illustration',
      medium: 'Digital Illustration',
      creationDate: '2021',
      insight: 'A playful exploration of ceramic pot designs with character and personality.',
    },
    '파란개': {
      name: 'Blue Dog',
      artisticStyle: 'Character Illustration',
      medium: 'Digital Illustration',
      creationDate: '2021',
      insight: 'A character study of a blue dog, exploring form and expression through a series of illustrations.',
    },
  };
  return map[folder] || {
    name: folder,
    artisticStyle: '',
    medium: '',
    creationDate: '',
    insight: '',
  };
}

/** Write metadata.json for a project */
async function writeMetadata(folder, meta) {
  const metaPath = path.join(PORTFOLIO_DIR, folder, 'metadata.json');
  let existing = {};
  try {
    existing = await fs.readJson(metaPath);
  } catch { /* new file */ }

  // Merge into Schema.org structure
  existing.name = meta.name;
  if (!existing.provenanceAndSpecs) existing.provenanceAndSpecs = {};
  existing.provenanceAndSpecs.artisticStyle = meta.artisticStyle;
  existing.provenanceAndSpecs.medium        = meta.medium;
  existing.provenanceAndSpecs.creationDate  = meta.creationDate;
  existing.curatorsInsight                  = meta.insight;
  if (meta.url) existing.url = meta.url;
  if (meta.showThumbnailInGallery !== undefined) {
    existing.showThumbnailInGallery = meta.showThumbnailInGallery;
  }

  await fs.writeJson(metaPath, existing, { spaces: 2 });
}

/**
/**
 * Safely replace a destination file with a source file.
 *
 * Windows problem: Express static / sharp / OS thumbnail cache hold file
 * descriptors open. All of fs.unlink, fs.rename(src,dest-that-is-open),
 * fs.copy(...overwrite), and fs-extra.move throw EBUSY on Windows.
 *
 * Strategy:
 * 1. If dest doesn't exist → simple rename.
 * 2. If dest exists → try native rename first (works on some Windows configs).
 * 3. If that fails with EBUSY → use `cmd /c move /Y` which calls MoveFileEx
 *    with MOVEFILE_REPLACE_EXISTING at the Win32 level.
 * 4. If even that fails → write to a unique sibling name as last resort.
 */
async function safeReplace(src, dest) {
  const nfs = require('fs').promises;
  const { execSync } = require('child_process');

  const destExists = await fs.pathExists(dest);
  if (!destExists) {
    try {
      await nfs.rename(src, dest);
      return;
    } catch (err) {
      if (err.code === 'EXDEV') {
        await nfs.copyFile(src, dest);
        await nfs.unlink(src).catch(() => {});
        return;
      }
      throw err;
    }
  }

  // Dest exists — try native rename first
  try {
    await nfs.rename(src, dest);
    return;
  } catch (err) {
    if (err.code !== 'EBUSY' && err.code !== 'EPERM' && err.code !== 'EXDEV') {
      throw err;
    }
  }

  // Native rename failed — try Windows cmd move /Y
  if (process.platform === 'win32') {
    try {
      const srcWin = path.resolve(src).replace(/\//g, '\\');
      const destWin = path.resolve(dest).replace(/\//g, '\\');
      execSync(`cmd /c move /Y "${srcWin}" "${destWin}"`, {
        timeout: 5000,
        windowsHide: true,
        stdio: 'pipe',
      });
      return;
    } catch (cmdErr) {
      console.warn('safeReplace: cmd move /Y failed:', cmdErr.message);
    }
  }

  // Cross-device or cmd failed — copy then remove source
  try {
    await nfs.copyFile(src, dest);
    await nfs.unlink(src).catch(() => {});
    return;
  } catch (copyErr) {
    if (copyErr.code !== 'EBUSY' && copyErr.code !== 'EPERM') {
      throw copyErr;
    }
  }

  // Absolute last resort: write alongside with a unique name
  const parsed = path.parse(dest);
  const altDest = path.join(parsed.dir, parsed.name + '_' + Date.now() + parsed.ext);
  await nfs.rename(src, altDest);
  console.warn(`safeReplace: couldn't replace ${path.basename(dest)}, saved as ${path.basename(altDest)}`);
}
/**
 * Resolve a local media path to a Cloudinary URL if mapping exists.
 * @param {string} localPath - e.g. "portfolio/Exhibition/image_001.jpg"
 * @param {'thumbnail'|'gallery'|'detail'|'original'} variant - which size variant
 * @returns {string} Cloudinary URL or original local path
 */
function resolveMediaUrl(localPath, variant = 'detail') {
  if (!Object.keys(cloudinaryMapping).length) return localPath;
  const entry = cloudinaryMapping[localPath];
  if (!entry) return localPath;
  return entry[variant] || entry.url || localPath;
}

/** Find the main.* thumbnail for a folder */
async function findThumbnail(folder) {
  const dir = path.join(PORTFOLIO_DIR, folder);
  const files = await fs.readdir(dir);
  const main = files.find(f => {
    const name = path.parse(f).name.toLowerCase();
    const ext  = path.parse(f).ext.toLowerCase();
    return name === 'main' && (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext));
  });
  if (!main) return '';
  const localPath = `portfolio/${encodeURIComponent(folder)}/${main}`;
  return resolveMediaUrl(localPath, 'thumbnail');
}

/** List all media files in a project folder (optionally including main.*) */
async function listMedia(folder, includeMain = false) {
  const dir = path.join(PORTFOLIO_DIR, folder);
  const orderPath = path.join(dir, 'image_order.json');
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  // Only consider files (skip directories like 'text/')
  const files = entries.filter(e => e.isFile()).map(e => e.name);

  // Filter to media files, exclude system files
  let media = files.filter(f => {
    const ext  = path.extname(f).toLowerCase();
    const name = f.toLowerCase();
    if (SKIP_FILES.has(name)) return false;
    // Skip main.* unless includeMain is true
    if (!includeMain && path.parse(f).name.toLowerCase() === 'main') return false;
    if (name === 'image_order.json') return false;
    if (f.endsWith('.tmp')) return false;
    if (f.includes('.bak_')) return false;
    return MEDIA_EXTS.has(ext);
  });

  // Apply custom order if exists
  try {
    const order = await fs.readJson(orderPath);
    const ordered = [];
    for (const name of order) {
      if (media.includes(name)) {
        ordered.push(name);
      }
    }
    // Add any files not in the order list
    for (const name of media) {
      if (!ordered.includes(name)) {
        ordered.push(name);
      }
    }
    media = ordered;
  } catch { /* no custom order, use filesystem order */ }

  return media.map(f => {
    const localPath = `portfolio/${encodeURIComponent(folder)}/${encodeURIComponent(f)}`;
    return {
      filename: f,
      path: resolveMediaUrl(localPath, 'detail'),
      type: VIDEO_EXTS.has(path.extname(f).toLowerCase()) ? 'video' : 'image',
    };
  });
}

/** Scan all project folders and build full project list */
async function scanProjects() {
  const order = await readOrder();
  const entries = await fs.readdir(PORTFOLIO_DIR, { withFileTypes: true });
  const allFolders = entries
    .filter(e => e.isDirectory() && !EXCLUDED_FOLDERS.has(e.name) && !e.name.startsWith('.'))
    .map(e => e.name);

  // Order: use order.json, then append any new folders not in the list
  const orderedFolders = [];
  for (const f of order.order) {
    if (allFolders.includes(f)) orderedFolders.push(f);
  }
  for (const f of allFolders) {
    if (!orderedFolders.includes(f)) orderedFolders.push(f);
  }

  const projects = [];
  for (const folder of orderedFolders) {
    const meta      = await readMetadata(folder);
    const thumbnail = await findThumbnail(folder);
    const images    = await listMedia(folder, meta.showThumbnailInGallery);

    projects.push({
      folder,
      thumbnail,
      images,
      ...meta,
    });
  }

  return { projects, cardCount: order.cardCount || projects.length };
}

/** Regenerate portfolio/index.json from current state */
async function regenerateIndex() {
  const { projects, cardCount } = await scanProjects();

  const indexData = {
    '@context': {
      '@vocab': 'https://schema.org/',
      'art': 'https://schema.org/VisualArtwork',
    },
    '@type': 'CollectionPage',
    name: 'Eungshin Kim - Complete Portfolio Collection',
    description: 'Portfolio archive',
    url: 'https://www.behance.net/eungshin',
    creator: {
      '@type': 'Person',
      name: 'Eungshin Kim',
      jobTitle: 'Illustrator, Content Designer',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Seoul',
        addressCountry: 'KR',
      },
    },
    numberOfItems: projects.length,
    cardCount,
    hasPart: projects.map(p => ({
      '@type': 'VisualArtwork',
      name: p.name,
      folder: p.folder,
      url: p.url || '',
      artisticStyle: p.artisticStyle,
      medium: p.medium,
      creationDate: p.creationDate,
      insight: p.insight,
      imageCount: p.images.length,
    })),
    dateExtracted: new Date().toISOString(),
  };

  await fs.writeJson(INDEX_FILE, indexData, { spaces: 2 });
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const data = await scanProjects();
    res.json(data);
  } catch (err) {
    console.error('Error scanning projects:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const order = await readOrder();
    res.json({ cardCount: order.cardCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT settings (cardCount)
app.put('/api/settings', async (req, res) => {
  try {
    const order = await readOrder();
    order.cardCount = parseInt(req.body.cardCount, 10) || order.cardCount;
    await writeOrder(order);
    await regenerateIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reorder projects
app.put('/api/projects/reorder', async (req, res) => {
  try {
    const order = await readOrder();
    order.order = req.body.order;
    await writeOrder(order);
    await regenerateIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update project metadata
app.put('/api/projects/:folder', async (req, res) => {
  try {
    const folder = decodeURIComponent(req.params.folder);
    const folderPath = path.join(PORTFOLIO_DIR, folder);
    if (!await fs.pathExists(folderPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await writeMetadata(folder, req.body);
    await regenerateIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new project
app.post('/api/projects', async (req, res) => {
  try {
    const folder = req.body.folder;
    if (!folder) return res.status(400).json({ error: 'Folder name required' });

    const folderPath = path.join(PORTFOLIO_DIR, folder);
    await fs.ensureDir(folderPath);

    const meta = {
      name:          req.body.name || folder,
      artisticStyle: req.body.artisticStyle || '',
      medium:        req.body.medium || '',
      creationDate:  req.body.creationDate || '',
      insight:       req.body.insight || '',
    };
    await writeMetadata(folder, meta);

    // Add to order
    const order = await readOrder();
    if (!order.order.includes(folder)) {
      order.order.push(folder);
    }
    await writeOrder(order);
    await regenerateIndex();

    res.json({ ok: true, folder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE soft-delete project
app.delete('/api/projects/:folder', async (req, res) => {
  try {
    const folder = decodeURIComponent(req.params.folder);
    const src = path.join(PORTFOLIO_DIR, folder);
    if (!await fs.pathExists(src)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const dest = path.join(TRASH_DIR, folder);
    await fs.ensureDir(path.dirname(dest));
    // Use retry to handle Windows file locks
    await safeReplace(src, dest);

    // Remove from order
    const order = await readOrder();
    order.order = order.order.filter(f => f !== folder);
    await writeOrder(order);
    await regenerateIndex();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Image Endpoints ─────────────────────────────────────────────────────────

// Multer setup for uploads
const upload = multer({
  dest: path.join(__dirname, '.uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (MEDIA_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// POST upload images to a project
app.post('/api/projects/:folder/images', upload.array('files', 20), async (req, res) => {
  try {
    const folder = decodeURIComponent(req.params.folder);
    const folderPath = path.join(PORTFOLIO_DIR, folder);
    if (!await fs.pathExists(folderPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const results = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const destName = file.originalname;
      const destPath = path.join(folderPath, destName);

      if (IMAGE_EXTS.has(ext) && file.size > 1_000_000) {
        // Compress large images — keep original format (JPEG stays JPEG)
        const isJpeg = ext === '.jpg' || ext === '.jpeg';
        const outputName = isJpeg ? path.parse(destName).name + '.jpg' : path.parse(destName).name + '.png';
        const outputPath = path.join(folderPath, outputName);
        // Write to a temp file first, then rename — avoids EBUSY on Windows
        // when overwriting a file the static server may hold open
        const tmpOutput = outputPath + '.tmp';
        const pipeline = sharp(file.path);
        if (isJpeg) {
          pipeline.jpeg({ quality: 85, mozjpeg: true });
        } else {
          pipeline.png({ compressionLevel: 8 });
        }
        await pipeline.toFile(tmpOutput);
        // Clean up multer temp file
        await fs.remove(file.path).catch(() => {});
        // Replace destination: remove old first (with retry for Windows locks)
        await safeReplace(tmpOutput, outputPath);
        results.push(outputName);
      } else {
        // Small files or videos — move directly with retry
        await safeReplace(file.path, destPath);
        results.push(destName);
      }
    }

    await regenerateIndex();
    res.json({ ok: true, files: results });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE soft-delete an image
app.delete('/api/projects/:folder/images/:filename', async (req, res) => {
  try {
    const folder   = decodeURIComponent(req.params.folder);
    const filename = decodeURIComponent(req.params.filename);
    const src  = path.join(PORTFOLIO_DIR, folder, filename);
    const dest = path.join(TRASH_DIR, folder, filename);

    if (!await fs.pathExists(src)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.ensureDir(path.join(TRASH_DIR, folder));
    // Use retry to handle Windows file locks from static server
    await safeReplace(src, dest);

    // Remove from image_order.json if exists
    const orderPath = path.join(PORTFOLIO_DIR, folder, 'image_order.json');
    try {
      const order = await fs.readJson(orderPath);
      const newOrder = order.filter(f => f !== filename);
      await fs.writeJson(orderPath, newOrder, { spaces: 2 });
    } catch { /* no order file */ }

    await regenerateIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reorder images within a project
app.put('/api/projects/:folder/images/reorder', async (req, res) => {
  try {
    const folder = decodeURIComponent(req.params.folder);
    const orderPath = path.join(PORTFOLIO_DIR, folder, 'image_order.json');
    await fs.writeJson(orderPath, req.body.order, { spaces: 2 });
    await regenerateIndex();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  await fs.ensureDir(TRASH_DIR);

  // Clean up orphaned temp files from previous crashes
  const uploadsDir = path.join(__dirname, '.uploads');
  try {
    const tempFiles = await fs.readdir(uploadsDir);
    for (const f of tempFiles) {
      if (f === 'desktop.ini' || f.startsWith('.')) continue;
      await fs.remove(path.join(uploadsDir, f)).catch(() => {});
    }
  } catch { /* .uploads may not exist */ }

  // Clean up leftover .bak_ and .tmp files from previous safeReplace operations
  try {
    const entries = await fs.readdir(PORTFOLIO_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const dirPath = path.join(PORTFOLIO_DIR, entry.name);
      const files = await fs.readdir(dirPath);
      for (const f of files) {
        if (f.includes('.bak_') || (f.endsWith('.tmp') && !f.endsWith('.git.tmp'))) {
          await fs.remove(path.join(dirPath, f)).catch(() => {});
        }
      }
    }
  } catch { /* non-critical cleanup */ }

  await regenerateIndex();
  app.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
  });
}

start().catch(console.error);
