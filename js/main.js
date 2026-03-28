/**
 * main.js — 3D Vertical Wheel Portfolio Gallery
 * Eungshin Kim Portfolio
 *
 * Dependencies: GSAP 3.x (loaded via CDN in index.html)
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  const RADIUS        = 450;               // translateZ distance (px)
  const SPIN_DURATION = 0.8;              // seconds per card step
  const SPIN_EASE     = 'power3.out';     // GSAP ease — weighty feel

  // Dynamic — set after data loads
  let cardCount  = 11;
  let ANGLE_STEP = 360 / cardCount;

  // ─── State ─────────────────────────────────────────────────────────────────
  let projects       = [];
  let targetAngle    = 0;
  let spinTween      = null;
  let currentSection = 'gallery';
  let hashNavigating = false;   // guard against hash ↔ openDetail loops

  const wheelState = { angle: 0 };

  // ─── Detail Section Creation ────────────────────────────────────────────────
  function createDetailSection() {
    const existing = document.getElementById('detail');
    if (existing) return existing;

    const detail = document.createElement('section');
    detail.id        = 'detail';
    detail.className = 'section section--detail hidden';
    detail.style.display = 'none';

    const modal = document.getElementById('modal');
    if (modal) {
      document.body.insertBefore(detail, modal);
    } else {
      document.body.appendChild(detail);
    }
    return detail;
  }

  // ─── Wheel Construction ────────────────────────────────────────────────────
  function createWheel(data) {
    const wheelEl = document.getElementById('wheel');
    wheelEl.innerHTML = '';

    data.forEach((project, i) => {
      const card = document.createElement('div');
      card.className  = 'wheel-card';
      card.dataset.index = i;

      const thumbSrc = project.thumbnail || '';

      card.innerHTML = `
        <img class="wheel-card__img" src="${thumbSrc}" alt="${escapeHtml(project.name)}" loading="lazy" />
      `;

      card.addEventListener('click', () => openDetail(project, i));
      wheelEl.appendChild(card);
    });

    positionCards();
  }

  // ─── Card Positioning ──────────────────────────────────────────────────────
  function positionCards() {
    const cards = document.querySelectorAll('.wheel-card');
    cards.forEach((card, i) => {
      const angleDeg = ANGLE_STEP * i + wheelState.angle;
      const rad      = (angleDeg * Math.PI) / 180;

      const y = Math.sin(rad) * RADIUS;
      const z = Math.cos(rad) * RADIUS;

      const t       = (z + RADIUS) / (2 * RADIUS);
      const scale   = 0.5 + t * 0.5;
      const opacity = 0.2 + t * 0.8;
      const zIndex  = Math.round(z + RADIUS);

      gsap.set(card, {
        y,
        z,
        scale,
        opacity,
        zIndex,
        transformOrigin: 'center center',
      });

      if (z > RADIUS * 0.85) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // ─── Active Index ──────────────────────────────────────────────────────────
  function getActiveIndex() {
    const normalised = ((-wheelState.angle % 360) + 360) % 360;
    return Math.round(normalised / ANGLE_STEP) % cardCount;
  }

  // ─── Project Info Panel ────────────────────────────────────────────────────
  function updateProjectInfo() {
    const idx     = getActiveIndex();
    const project = projects[idx];
    if (!project) return;

    const infoEl = document.getElementById('projectInfo');

    gsap.to(infoEl, {
      opacity: 0,
      duration: 0.15,
      ease: 'power1.in',
      onComplete() {
        infoEl.querySelector('.project-info__number').textContent =
          `${pad2(idx + 1)} / ${pad2(projects.length)}`;
        infoEl.querySelector('.project-info__date').textContent   = project.creationDate || '—';
        infoEl.querySelector('.project-info__title').textContent  = project.name;
        infoEl.querySelector('.project-info__style').textContent  = project.artisticStyle;
        infoEl.querySelector('.project-info__medium').textContent = project.medium;
        gsap.to(infoEl, { opacity: 1, duration: 0.25, ease: 'power1.out' });
      },
    });
  }

  // ─── Wheel Rotation ────────────────────────────────────────────────────────
  function spinWheel(direction) {
    targetAngle += direction * ANGLE_STEP;

    if (spinTween) spinTween.kill();

    spinTween = gsap.to(wheelState, {
      angle: targetAngle,
      duration: SPIN_DURATION,
      ease: SPIN_EASE,
      onUpdate: positionCards,
      onComplete: updateProjectInfo,
    });
  }

  // ─── Wheel Event (mouse scroll) ────────────────────────────────────────────
  function onWheel(e) {
    if (currentSection !== 'gallery') return;
    e.preventDefault();

    const dir = e.deltaY > 0 ? 1 : -1;
    spinWheel(dir);

    const hint = document.querySelector('.scroll-hint');
    if (hint && hint.style.opacity !== '0') {
      gsap.to(hint, { opacity: 0, duration: 0.4, pointerEvents: 'none' });
    }
  }

  // ─── Touch Support (mobile swipe) ─────────────────────────────────────────
  let touchStartY = null;
  const SWIPE_THRESHOLD = 40;

  function onTouchStart(e) {
    if (currentSection !== 'gallery') return;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (currentSection !== 'gallery' || touchStartY === null) return;
    e.preventDefault();
    const delta = touchStartY - e.touches[0].clientY;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    const dir = delta > 0 ? 1 : -1;
    spinWheel(dir);
    touchStartY = null;
  }

  function onTouchEnd() {
    touchStartY = null;
  }

  // ─── Keyboard Navigation ───────────────────────────────────────────────────
  function onKeyDown(e) {
    if (currentSection === 'detail') {
      if (e.key === 'Escape') closeDetail();
      return;
    }
    if (currentSection !== 'gallery') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      spinWheel(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      spinWheel(-1);
    }
  }

  // ─── Section Switching ─────────────────────────────────────────────────────
  function switchSection(target) {
    if (currentSection === target) return;

    const allSections = document.querySelectorAll('.section');
    const targetEl    = document.getElementById(target);
    if (!targetEl) return;

    allSections.forEach(sec => {
      if (sec.id !== target) {
        gsap.set(sec, { clearProps: 'all' });
        sec.classList.add('hidden');
        sec.style.display = '';
      }
    });

    targetEl.classList.remove('hidden');
    gsap.fromTo(
      targetEl,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );

    currentSection = target;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[href="#${target}"]`);
    if (activeLink) activeLink.classList.add('active');
  }

  function bindNavLinks() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.getAttribute('href').slice(1);
        if (currentSection === 'detail') {
          closeDetailThen(() => switchSection(target));
        } else {
          switchSection(target);
        }
      });
    });
  }

  // ─── Detail Page ───────────────────────────────────────────────────────────
  function openDetail(project, index) {
    const detailEl = document.getElementById('detail');
    const images   = project.images || [];

    const archiveNum   = pad2(index + 1);
    const creationDate = escapeHtml(project.creationDate || '—');
    const insight      = escapeHtml(project.insight || '');

    // Build media items — video or image
    const mediaHtml = images.map(img => {
      if (img.type === 'video') {
        return `
          <div class="detail-image-wrap">
            <video src="${img.path}" autoplay playsinline muted loop></video>
          </div>
        `;
      }
      return `
        <div class="detail-image-wrap">
          <img src="${img.path}" alt="${escapeHtml(project.name)}" loading="lazy" />
        </div>
      `;
    }).join('');

    detailEl.innerHTML = `
      <div class="detail-images-col" id="detailImagesCol">
        <div class="detail-mobile-header" id="detailMobileHeader">
          <button class="detail-mobile-header__back" id="detailMobileBack">&#8592;</button>
          <span class="detail-mobile-header__title">${escapeHtml(project.name)}</span>
        </div>
        ${mediaHtml}
      </div>
      <div class="detail-info-col">
        <button class="detail-exit" id="detailExit">&#8592; Exit Exhibition</button>

        <span class="detail-archive-num">ARCHIVE ENTRY ${archiveNum}</span>
        <h1 class="detail-title">${escapeHtml(project.name)}</h1>
        <p class="detail-artist">Eungshin Kim</p>

        <button class="detail-return-btn" id="detailReturn">Return to Gallery</button>

        <hr class="detail-divider" />

        <span class="detail-specs-label">Provenance &amp; Specs</span>
        <div class="detail-specs-grid">
          <div class="detail-spec-item">
            <span class="spec-label">Creation Date</span>
            <span class="spec-value">${creationDate}</span>
          </div>
          <div class="detail-spec-item">
            <span class="spec-label">Medium</span>
            <span class="spec-value">${escapeHtml(project.medium)}</span>
          </div>
          <div class="detail-spec-item detail-spec-item--full">
            <span class="spec-label">Artistic Style</span>
            <span class="spec-value">${escapeHtml(project.artisticStyle)}</span>
          </div>
        </div>

        ${insight ? `
        <hr class="detail-divider" />
        <span class="detail-insight-label">Curator's Insight</span>
        <p class="detail-insight-text">${insight}</p>
        ` : ''}
      </div>

      <div class="detail-mobile-footer" id="detailMobileFooter">
        <button class="detail-mobile-footer__exit" id="detailFooterExit">&#8592; Back</button>
        <span class="detail-mobile-footer__archive">ARCHIVE ENTRY ${archiveNum}</span>
        <h2 class="detail-mobile-footer__title">${escapeHtml(project.name)}</h2>
        <p class="detail-mobile-footer__artist">Eungshin Kim</p>

        <div class="detail-mobile-footer__specs">
          <div class="detail-mobile-footer__spec">
            <span class="spec-label">Creation Date</span>
            <span class="spec-value">${creationDate}</span>
          </div>
          <div class="detail-mobile-footer__spec">
            <span class="spec-label">Medium</span>
            <span class="spec-value">${escapeHtml(project.medium)}</span>
          </div>
          <div class="detail-mobile-footer__spec detail-mobile-footer__spec--full">
            <span class="spec-label">Artistic Style</span>
            <span class="spec-value">${escapeHtml(project.artisticStyle)}</span>
          </div>
        </div>

        ${insight ? `
        <div class="detail-mobile-footer__insight">
          <span class="detail-mobile-footer__insight-label">Curator's Insight</span>
          <p class="detail-mobile-footer__insight-text">${insight}</p>
        </div>
        ` : ''}

        <button class="detail-mobile-footer__btn" id="detailFooterReturn">Return to Gallery</button>
      </div>
    `;

    detailEl.style.display = '';
    detailEl.scrollTop     = 0;
    const imagesCol = document.getElementById('detailImagesCol');
    if (imagesCol) imagesCol.scrollTop = 0;

    // Autoplay all videos in the detail view
    detailEl.querySelectorAll('video').forEach(v => {
      v.play().catch(() => {}); // ignore autoplay rejection
    });

    const galleryEl = document.getElementById('gallery');
    gsap.set(galleryEl, { clearProps: 'all' });
    galleryEl.classList.add('hidden');

    detailEl.classList.remove('hidden');
    gsap.fromTo(detailEl, { opacity: 0 }, { opacity: 1, duration: 0.4 });

    currentSection = 'detail';
    document.body.classList.add('detail-open');
    window.scrollTo(0, 0);

    // Update URL hash — #/project/01
    if (!hashNavigating) {
      const projectNum = pad2(index + 1);
      history.pushState(null, '', `#/project/${projectNum}`);
    }

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    document.getElementById('detailExit').addEventListener('click', closeDetail);
    document.getElementById('detailReturn').addEventListener('click', closeDetail);
    const footerBtn = document.getElementById('detailFooterReturn');
    if (footerBtn) footerBtn.addEventListener('click', closeDetail);
    const footerExitBtn = document.getElementById('detailFooterExit');
    if (footerExitBtn) footerExitBtn.addEventListener('click', closeDetail);
    const mobileBackBtn = document.getElementById('detailMobileBack');
    if (mobileBackBtn) mobileBackBtn.addEventListener('click', closeDetail);
  }

  function closeDetailThen(callback) {
    const detailEl = document.getElementById('detail');
    document.body.classList.remove('detail-open');

    // Pause all videos when leaving detail view
    detailEl.querySelectorAll('video').forEach(v => {
      v.pause();
      v.currentTime = 0;
    });

    gsap.to(detailEl, {
      opacity: 0,
      duration: 0.3,
      onComplete() {
        gsap.set(detailEl, { clearProps: 'all' });
        detailEl.classList.add('hidden');
        detailEl.style.display = '';
        if (callback) callback();
      },
    });
  }

  function closeDetail() {
    if (!hashNavigating) {
      history.pushState(null, '', '#');
    }
    closeDetailThen(() => switchSection('gallery'));
  }

  // ─── Hash Routing ──────────────────────────────────────────────────────────
  /**
   * Parse current hash and open the matching project or return to gallery.
   * Hash format: #/project/01  (1-based, zero-padded)
   */
  function handleHash() {
    const hash = location.hash;
    const match = hash.match(/^#\/project\/(\d+)$/);

    if (match) {
      const num   = parseInt(match[1], 10);  // 1-based
      const index = num - 1;
      if (index >= 0 && index < projects.length) {
        hashNavigating = true;
        openDetail(projects[index], index);
        hashNavigating = false;
        return;
      }
    }

    // No valid project hash — if detail is open, close it
    if (currentSection === 'detail') {
      hashNavigating = true;
      closeDetailThen(() => {
        switchSection('gallery');
        hashNavigating = false;
      });
    }
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── Fallback Data ─────────────────────────────────────────────────────────
  function buildFallbackProjects() {
    return Array.from({ length: 11 }, (_, i) => ({
      name: `Project ${pad2(i + 1)}`,
      artisticStyle: 'Illustration',
      medium: 'Digital',
      url: '#',
      images: [],
      thumbnail: '',
    }));
  }

  // ─── Initialisation ────────────────────────────────────────────────────────
  async function init() {
    createDetailSection();

    try {
      const res  = await fetch('/api/projects');
      const data = await res.json();
      projects   = data.projects || [];
      cardCount  = data.cardCount || projects.length;
    } catch (err) {
      console.error('[Portfolio] Failed to load projects from API:', err);
      // Fallback: try index.json directly
      try {
        const res  = await fetch('portfolio/index.json');
        const data = await res.json();
        projects   = Array.isArray(data.hasPart) ? data.hasPart : buildFallbackProjects();
        cardCount  = projects.length;
      } catch {
        projects = buildFallbackProjects();
        cardCount = projects.length;
      }
    }

    // Limit to cardCount
    const displayProjects = projects.slice(0, cardCount);
    cardCount  = displayProjects.length;
    ANGLE_STEP = 360 / cardCount;

    createWheel(displayProjects);
    updateProjectInfo();

    bindNavLinks();

    window.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true  });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    document.addEventListener('keydown',  onKeyDown);

    const wheelEl = document.getElementById('wheel');
    gsap.from(wheelEl, { opacity: 0, duration: 0.8, ease: 'power2.out' });

    const infoEl = document.getElementById('projectInfo');
    gsap.from(infoEl, { opacity: 0, x: 40, duration: 0.8, delay: 0.3, ease: 'power2.out' });

    // Email popup
    const emailBtn   = document.getElementById('emailBtn');
    const emailPopup = document.getElementById('emailPopup');
    const emailCopy  = document.getElementById('emailCopy');
    const emailClose = document.getElementById('emailClose');

    if (emailBtn && emailPopup) {
      emailBtn.addEventListener('click', () => { emailPopup.hidden = false; });
      emailClose.addEventListener('click', () => { emailPopup.hidden = true; });
      emailPopup.addEventListener('click', (e) => {
        if (e.target === emailPopup) emailPopup.hidden = true;
      });
      emailCopy.addEventListener('click', () => {
        navigator.clipboard.writeText('eungshin.k@gmail.com').then(() => {
          emailCopy.textContent = 'Copied!';
          setTimeout(() => { emailCopy.textContent = 'Copy to clipboard'; }, 2000);
        });
      });
    }

    // Hash routing — back/forward button support
    window.addEventListener('popstate', handleHash);

    // Check for initial hash on page load (e.g. shared link)
    if (location.hash.match(/^#\/project\/\d+$/)) {
      handleHash();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
