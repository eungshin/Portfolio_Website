/**
 * main.js — 3D Vertical Wheel Portfolio Gallery
 * Eungshin Kim Portfolio
 *
 * Dependencies: GSAP 3.x (loaded via CDN in index.html)
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  const CARD_COUNT    = 12;
  const RADIUS        = 450;               // translateZ distance (px)
  const ANGLE_STEP    = 360 / CARD_COUNT;  // 30° per card
  const SPIN_DURATION = 0.8;              // seconds per card step
  const SPIN_EASE     = 'power3.out';     // GSAP ease — weighty feel

  // Thumbnail mapping: project name → image path (smallest available files)
  const THUMBNAILS = {
    '#1000POTS_Harvest Mouse': 'portfolio/화분+동물 시리즈/image_005.jpg',
    'Animals - a cat with flowerpots': 'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_003.jpg',
    'Art Brand poster_Rabbit&Snake': 'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/20210915_165534.jpg',
    'Brand shop poster: Snake and Gummy bear': 'portfolio/화분+동물 시리즈/Brand_shop_poster__Snake_and_Gummy_bear_-_Eungshin_Kim/image_004.jpg',
    'Character design GOBUGI_ look at me': 'portfolio/화분+동물 시리즈/image_003.jpg',
    "Children's book \"Camang and Friends\"": "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_002.jpg",
    'Elephant': 'portfolio/화분+동물 시리즈/Elephant_-_Eungshin_Kim/image_001.jpg',
    'Exchanging my talents for traveling in Ireland.': 'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_002.jpg',
    'Knitting Spider illustration': 'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_002.jpg',
    'Nature pattern rabbit': 'portfolio/Nature_pattern_rabbit_-_Eungshin_Kim/image_001.jpg',
    'pen drawing.': 'portfolio/pen_drawing._-_Eungshin_Kim/image_001.jpg',
    'Self-portrait 2019': 'portfolio/Self-portrait_2019_-_Eungshin_Kim/image_003.jpg',
  };

  // ALL images per project (for detail view)
  const PROJECT_IMAGES = {
    'Art Brand poster_Rabbit&Snake': [
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_001.jpg',
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_002.jpg',
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_003.jpg',
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_004.jpg',
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_005.jpg',
      'portfolio/Art_Brand_poster_Rabbit&Snake_-_Eungshin_Kim/image_006.jpg',
    ],
    "Children's book \"Camang and Friends\"": [
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_001.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_002.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_003.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_004.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_005.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_006.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_007.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_008.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_009.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_010.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_011.jpg",
      "portfolio/Children's_book__Camang_and_Friends__-_Eungshin_Kim/image_012.jpg",
    ],
    'Exchanging my talents for traveling in Ireland.': [
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_001.png',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_002.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_003.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_004.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_005.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_006.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_007.jpg',
      'portfolio/Exchanging_my_talents_for_traveling_in_Ireland._-_Eungshin_Kim/image_008.jpg',
    ],
    'Nature pattern rabbit': [
      'portfolio/Nature_pattern_rabbit_-_Eungshin_Kim/image_001.jpg',
    ],
    'Self-portrait 2019': [
      'portfolio/Self-portrait_2019_-_Eungshin_Kim/image_001.jpg',
      'portfolio/Self-portrait_2019_-_Eungshin_Kim/image_002.jpg',
      'portfolio/Self-portrait_2019_-_Eungshin_Kim/image_003.jpg',
      'portfolio/Self-portrait_2019_-_Eungshin_Kim/image_004.jpg',
    ],
    'pen drawing.': [
      'portfolio/pen_drawing._-_Eungshin_Kim/image_001.jpg',
      'portfolio/pen_drawing._-_Eungshin_Kim/image_002.jpg',
      'portfolio/pen_drawing._-_Eungshin_Kim/image_003.jpg',
      'portfolio/pen_drawing._-_Eungshin_Kim/image_004.jpg',
    ],
    'Animals - a cat with flowerpots': [
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_001.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_002.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_003.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_004.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_005.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_006.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_007.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_008.jpg',
      'portfolio/전시회/Animals_-_a_cat_with_flowerpots_-_Eungshin_Kim/image_009.jpg',
    ],
    'Knitting Spider illustration': [
      'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_001.jpg',
      'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_002.jpg',
      'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_003.jpg',
      'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_004.jpg',
      'portfolio/전시회/Knitting_Spider_illustration_-_Eungshin_Kim/image_005.jpg',
    ],
    'Brand shop poster: Snake and Gummy bear': [
      'portfolio/화분+동물 시리즈/Brand_shop_poster__Snake_and_Gummy_bear_-_Eungshin_Kim/image_001.jpg',
      'portfolio/화분+동물 시리즈/Brand_shop_poster__Snake_and_Gummy_bear_-_Eungshin_Kim/image_002.jpg',
      'portfolio/화분+동물 시리즈/Brand_shop_poster__Snake_and_Gummy_bear_-_Eungshin_Kim/image_003.jpg',
      'portfolio/화분+동물 시리즈/Brand_shop_poster__Snake_and_Gummy_bear_-_Eungshin_Kim/image_004.jpg',
    ],
    'Elephant': [
      'portfolio/화분+동물 시리즈/Elephant_-_Eungshin_Kim/image_001.jpg',
      'portfolio/화분+동물 시리즈/Elephant_-_Eungshin_Kim/image_002.jpg',
    ],
    '#1000POTS_Harvest Mouse': [
      'portfolio/화분+동물 시리즈/image_001.jpg',
      'portfolio/화분+동물 시리즈/image_002.jpg',
      'portfolio/화분+동물 시리즈/image_003.jpg',
      'portfolio/화분+동물 시리즈/image_004.jpg',
      'portfolio/화분+동물 시리즈/image_005.jpg',
      'portfolio/화분+동물 시리즈/image_006.jpg',
      'portfolio/화분+동물 시리즈/image_007.jpg',
      'portfolio/화분+동물 시리즈/image_008.jpg',
    ],
    'Character design GOBUGI_ look at me': [
      'portfolio/화분+동물 시리즈/image_003.jpg',
    ],
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  let projects       = [];
  let targetAngle    = 0;  // destination angle
  let spinTween      = null; // reference to the active GSAP tween
  let currentSection = 'gallery';

  // Proxy object that GSAP can tween a numeric property on
  const wheelState = { angle: 0 };

  // ─── Detail Section Creation ────────────────────────────────────────────────
  function createDetailSection() {
    const existing = document.getElementById('detail');
    if (existing) return existing;

    const detail = document.createElement('section');
    detail.id        = 'detail';
    detail.className = 'section section--detail hidden';
    detail.style.display = 'none';

    // Insert before the modal element if it exists, otherwise append to body
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
    wheelEl.innerHTML = ''; // clear before (re)build

    data.forEach((project, i) => {
      const card = document.createElement('div');
      card.className  = 'wheel-card';
      card.dataset.index = i;

      const thumbSrc = THUMBNAILS[project.name] || '';

      card.innerHTML = `
        <img class="wheel-card__img" src="${thumbSrc}" alt="${escapeHtml(project.name)}" loading="lazy" />
        <div class="wheel-card__overlay">
          <span class="wheel-card__style">${escapeHtml(project.artisticStyle)}</span>
          <span class="wheel-card__title">${escapeHtml(project.name)}</span>
        </div>
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

      // Vertical ferris-wheel: Y = sin, Z = cos
      const y = Math.sin(rad) * RADIUS;
      const z = Math.cos(rad) * RADIUS;

      // Depth-based scale & opacity  (front: z ≈ +RADIUS, back: z ≈ -RADIUS)
      const t       = (z + RADIUS) / (2 * RADIUS); // 0 → 1
      const scale   = 0.5 + t * 0.5;               // 0.5 → 1.0
      const opacity = 0.2 + t * 0.8;               // 0.2 → 1.0
      const zIndex  = Math.round(z + RADIUS);       // 0 → 900

      gsap.set(card, {
        y,
        z,
        scale,
        opacity,
        zIndex,
        transformOrigin: 'center center',
      });

      // Active = closest to front (z > 85% of RADIUS)
      if (z > RADIUS * 0.85) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // ─── Active Index ──────────────────────────────────────────────────────────
  function getActiveIndex() {
    // Negate currentAngle so forward scroll advances cards upward
    const normalised = ((-wheelState.angle % 360) + 360) % 360;
    return Math.round(normalised / ANGLE_STEP) % CARD_COUNT;
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

    // Kill the previous tween but keep its current progress in wheelState.angle
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
    // Only intercept wheel in gallery mode; let natural scroll work elsewhere
    if (currentSection !== 'gallery') return;
    e.preventDefault();

    const dir = e.deltaY > 0 ? 1 : -1;
    spinWheel(dir);

    // Hide scroll hint after first interaction
    const hint = document.querySelector('.scroll-hint');
    if (hint && hint.style.opacity !== '0') {
      gsap.to(hint, { opacity: 0, duration: 0.4, pointerEvents: 'none' });
    }
  }

  // ─── Touch Support (mobile swipe) ─────────────────────────────────────────
  let touchStartY = null;
  const SWIPE_THRESHOLD = 40; // px

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
    touchStartY = null; // one step per swipe gesture
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

    // Hide ALL sections first — clear any GSAP inline styles before adding .hidden
    allSections.forEach(sec => {
      if (sec.id !== target) {
        gsap.set(sec, { clearProps: 'all' });
        sec.classList.add('hidden');
        sec.style.display = '';
      }
    });

    // Show target
    targetEl.classList.remove('hidden');
    gsap.fromTo(
      targetEl,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );

    currentSection = target;

    // Restore body overflow when returning to gallery (may have been changed for detail)
    /* body overflow stays hidden */

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[href="#${target}"]`);
    if (activeLink) activeLink.classList.add('active');
  }

  function bindNavLinks() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.getAttribute('href').slice(1);
        // If in detail view, close it first then switch
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
    const images   = PROJECT_IMAGES[project.name] || [THUMBNAILS[project.name]].filter(Boolean);

    // Build the detail content
    detailEl.innerHTML = `
      <div class="detail-header">
        <button class="detail-back" id="detailBack">&#8592; Back</button>
        <div class="detail-meta">
          <h1 class="detail-title">${escapeHtml(project.name)}</h1>
          <p class="detail-style">${escapeHtml(project.artisticStyle)}</p>
          <p class="detail-medium">${escapeHtml(project.medium)}</p>
        </div>
      </div>
      <div class="detail-images">
        ${images.map(src => `
          <div class="detail-image-wrap">
            <img src="${src}" alt="${escapeHtml(project.name)}" loading="lazy" />
          </div>
        `).join('')}
      </div>
    `;

    // Allow detail section itself to scroll
    detailEl.style.overflowY = 'auto';
    detailEl.style.display   = 'block';
    detailEl.scrollTop       = 0;

    // Hide gallery — clear GSAP inline styles before adding .hidden
    const galleryEl = document.getElementById('gallery');
    gsap.set(galleryEl, { clearProps: 'all' });
    galleryEl.classList.add('hidden');

    // Body stays overflow:hidden — detail section handles its own scroll

    // Show detail
    detailEl.classList.remove('hidden');
    gsap.fromTo(detailEl, { opacity: 0 }, { opacity: 1, duration: 0.4 });

    currentSection = 'detail';

    // Remove active nav highlight (we're not in a nav section)
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    // Bind back button
    document.getElementById('detailBack').addEventListener('click', closeDetail);
  }

  function closeDetailThen(callback) {
    const detailEl = document.getElementById('detail');
    gsap.to(detailEl, {
      opacity: 0,
      duration: 0.3,
      onComplete() {
        gsap.set(detailEl, { clearProps: 'all' });
        detailEl.classList.add('hidden');
        detailEl.style.display   = 'none';
        detailEl.style.overflowY = '';
        /* body overflow stays hidden */
        if (callback) callback();
      },
    });
  }

  function closeDetail() {
    closeDetailThen(() => switchSection('gallery'));
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
    return Array.from({ length: CARD_COUNT }, (_, i) => ({
      name: `Project ${pad2(i + 1)}`,
      artisticStyle: 'Illustration',
      medium: 'Digital',
      url: '#',
      imageCount: 1,
    }));
  }

  // ─── Initialisation ────────────────────────────────────────────────────────
  async function init() {
    // Create the detail section element
    createDetailSection();

    // Fetch portfolio data
    try {
      const res  = await fetch('portfolio/index.json');
      const data = await res.json();
      projects   = Array.isArray(data.hasPart) ? data.hasPart : buildFallbackProjects();
    } catch (err) {
      console.error('[Portfolio] Failed to load portfolio/index.json:', err);
      projects = buildFallbackProjects();
    }

    // Build the wheel
    createWheel(projects);
    updateProjectInfo();

    // Bind nav
    bindNavLinks();

    // Wheel scroll — { passive: false } required to call preventDefault
    window.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true  });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    document.addEventListener('keydown',  onKeyDown);

    // Initial entrance animation
    const wheelEl = document.getElementById('wheel');
    gsap.from(wheelEl, { opacity: 0, duration: 0.8, ease: 'power2.out' });

    const infoEl = document.getElementById('projectInfo');
    gsap.from(infoEl, { opacity: 0, x: 40, duration: 0.8, delay: 0.3, ease: 'power2.out' });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
