/**
 * dashboard.js — Portfolio Dashboard
 * Admin interface for managing projects, images, and settings
 */

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────
  let projects  = [];
  let cardCount = 11;
  let isDirty   = false;
  let editingProject = null;  // folder name of project being edited
  let pendingDelete  = null;  // { type: 'project'|'image', folder, filename? }

  // Track which projects have been modified
  const dirtyProjects = new Set();

  // ─── DOM References ────────────────────────────────────────────────────────
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    cardCount:     () => $('#cardCountInput'),
    projectList:   () => $('#projectList'),
    dirtyBadge:    () => $('#dirtyBadge'),
    saveBtn:       () => $('#saveBtn'),
    previewBtn:    () => $('#previewBtn'),
    addProjectBtn: () => $('#addProjectBtn'),
    editorSection: () => $('#editorSection'),
    editorTitle:   () => $('#editorTitle'),
    imageGrid:     () => $('#imageGrid'),
    thumbImg:      () => $('#thumbImg'),
    thumbPreview:  () => $('#thumbPreview'),
    toast:         () => $('#toast'),
    // Modals
    newProjectModal: () => $('#newProjectModal'),
    deleteModal:     () => $('#deleteModal'),
    deleteModalText: () => $('#deleteModalText'),
  };

  // ─── API Helpers ───────────────────────────────────────────────────────────
  async function api(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'API Error');
    }
    return res.json();
  }

  async function uploadFiles(url, files) {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file);
    }
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────
  async function loadProjects() {
    try {
      const data = await api('/api/projects');
      projects  = data.projects;
      cardCount = data.cardCount;
      renderAll();
    } catch (err) {
      showToast('Failed to load projects: ' + err.message, 'error');
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────
  function renderAll() {
    renderSettings();
    renderProjectList();
    if (editingProject) {
      const project = projects.find(p => p.folder === editingProject);
      if (project) renderEditor(project);
      else closeEditor();
    }
  }

  function renderSettings() {
    dom.cardCount().value = cardCount;
  }

  function renderProjectList() {
    const list = dom.projectList();
    list.innerHTML = '';

    projects.forEach((project, idx) => {
      const item = document.createElement('div');
      item.className = 'dash-project-item';
      item.draggable = true;
      item.dataset.folder = project.folder;
      item.dataset.index  = idx;

      item.innerHTML = `
        <span class="dash-project-drag">&#9776;</span>
        <img class="dash-project-thumb" src="${project.thumbnail}" alt="" />
        <span class="dash-project-name">${escapeHtml(project.name)}</span>
        <span class="dash-project-folder">${escapeHtml(project.folder)}</span>
        <div class="dash-project-actions">
          <button class="dash-btn dash-btn--secondary dash-btn--sm" data-action="edit" data-folder="${escapeAttr(project.folder)}">Edit</button>
          <button class="dash-btn dash-btn--danger dash-btn--sm" data-action="delete-project" data-folder="${escapeAttr(project.folder)}">Delete</button>
        </div>
      `;

      // Drag events for project reordering
      item.addEventListener('dragstart', onProjectDragStart);
      item.addEventListener('dragover',  onProjectDragOver);
      item.addEventListener('dragleave', onProjectDragLeave);
      item.addEventListener('drop',      onProjectDrop);
      item.addEventListener('dragend',   onProjectDragEnd);

      list.appendChild(item);
    });
  }

  function renderEditor(project) {
    const section = dom.editorSection();
    section.hidden = false;
    dom.editorTitle().textContent = `Edit: ${project.name}`;

    // Fill fields
    $('#editName').value    = project.name || '';
    $('#editStyle').value   = project.artisticStyle || '';
    $('#editMedium').value  = project.medium || '';
    $('#editDate').value    = project.creationDate || '';
    $('#editFolder').value  = project.folder;
    $('#editInsight').value = project.insight || '';

    // Thumbnail
    const thumbImg = dom.thumbImg();
    thumbImg.src = project.thumbnail || '';
    thumbImg.style.display = project.thumbnail ? 'block' : 'none';

    // Image grid
    renderImageGrid(project);

    // Scroll editor into view
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderImageGrid(project) {
    const grid = dom.imageGrid();
    grid.innerHTML = '';

    (project.images || []).forEach((img, idx) => {
      const card = document.createElement('div');
      card.className = 'dash-image-card';
      card.dataset.index = idx;
      card.dataset.filename = img.filename;

      if (img.type === 'video') {
        card.innerHTML = `
          <span class="dash-image-card__drag-handle">&#9776;</span>
          <video src="${img.path}" muted></video>
          <div class="dash-image-card__info">${escapeHtml(img.filename)}</div>
          <button class="dash-image-card__delete" data-filename="${escapeAttr(img.filename)}">&times;</button>
        `;
      } else {
        card.innerHTML = `
          <span class="dash-image-card__drag-handle">&#9776;</span>
          <img src="${img.path}" alt="${escapeHtml(img.filename)}" draggable="false" />
          <div class="dash-image-card__info">${escapeHtml(img.filename)}</div>
          <button class="dash-image-card__delete" data-filename="${escapeAttr(img.filename)}">&times;</button>
        `;
      }

      grid.appendChild(card);
    });

    // Attach pointer-based sortable to the grid
    initImageSortable(grid);
  }

  // ─── Dirty Tracking ────────────────────────────────────────────────────────
  function markDirty(folder) {
    isDirty = true;
    if (folder) dirtyProjects.add(folder);
    dom.dirtyBadge().hidden = false;
  }

  function clearDirty() {
    isDirty = false;
    dirtyProjects.clear();
    dom.dirtyBadge().hidden = true;
  }

  // ─── Project Drag & Drop ───────────────────────────────────────────────────
  let dragProjectIdx = null;

  function onProjectDragStart(e) {
    dragProjectIdx = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragProjectIdx);
  }

  function onProjectDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  function onProjectDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function onProjectDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const fromIdx = dragProjectIdx;
    const toIdx   = parseInt(e.currentTarget.dataset.index);

    if (fromIdx !== null && fromIdx !== toIdx) {
      const [moved] = projects.splice(fromIdx, 1);
      projects.splice(toIdx, 0, moved);
      markDirty();
      renderProjectList();
    }
  }

  function onProjectDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    $$('.dash-project-item').forEach(el => el.classList.remove('drag-over'));
    dragProjectIdx = null;
  }

  // ─── Image Sortable (pointer-event based) ───────────────────────────────
  // Replaces flaky HTML5 Drag & Drop with direct pointer tracking.
  // Works on mouse and touch. Drag anywhere on the card to reorder.

  let _sortState = null; // active sort session

  function initImageSortable(grid) {
    grid.addEventListener('pointerdown', onSortPointerDown);
  }

  function onSortPointerDown(e) {
    // Only left mouse / primary touch
    if (e.button !== 0) return;
    // Don't drag when clicking the delete button
    if (e.target.closest('.dash-image-card__delete')) return;

    const card = e.target.closest('.dash-image-card');
    if (!card) return;

    e.preventDefault(); // prevent text selection & native image drag

    const grid = card.parentElement;
    const rect = card.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();

    // Create a floating clone for visual feedback
    const clone = card.cloneNode(true);
    clone.classList.add('dash-image-card--ghost');
    clone.style.position = 'fixed';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.85';
    clone.style.transition = 'none';
    clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
    clone.style.transform = 'scale(1.04)';
    document.body.appendChild(clone);

    card.classList.add('dragging');

    const fromIdx = parseInt(card.dataset.index);
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    _sortState = {
      grid,
      card,
      clone,
      fromIdx,
      currentIdx: fromIdx,
      offsetX,
      offsetY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };

    document.addEventListener('pointermove', onSortPointerMove);
    document.addEventListener('pointerup', onSortPointerUp);
    document.addEventListener('pointercancel', onSortPointerUp);
  }

  function onSortPointerMove(e) {
    if (!_sortState) return;
    const s = _sortState;

    // Move the ghost clone
    s.clone.style.left = (e.clientX - s.offsetX) + 'px';
    s.clone.style.top  = (e.clientY - s.offsetY) + 'px';
    s.moved = true;

    // Find which card the pointer is over
    const cards = Array.from(s.grid.querySelectorAll('.dash-image-card'));
    // Clear previous indicators
    cards.forEach(c => c.classList.remove('drag-over'));

    for (const c of cards) {
      if (c === s.card) continue;
      const r = c.getBoundingClientRect();
      if (
        e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top  && e.clientY <= r.bottom
      ) {
        c.classList.add('drag-over');
        s.currentIdx = parseInt(c.dataset.index);
        break;
      }
    }
  }

  function onSortPointerUp(e) {
    document.removeEventListener('pointermove', onSortPointerMove);
    document.removeEventListener('pointerup', onSortPointerUp);
    document.removeEventListener('pointercancel', onSortPointerUp);

    if (!_sortState) return;
    const s = _sortState;
    _sortState = null;

    // Clean up ghost
    s.clone.remove();
    s.card.classList.remove('dragging');
    s.grid.querySelectorAll('.dash-image-card').forEach(c => c.classList.remove('drag-over'));

    // Apply reorder if moved to a different position
    if (s.moved && s.fromIdx !== s.currentIdx && editingProject) {
      const project = projects.find(p => p.folder === editingProject);
      if (project && project.images) {
        const [moved] = project.images.splice(s.fromIdx, 1);
        project.images.splice(s.currentIdx, 0, moved);
        markDirty(editingProject);
        renderImageGrid(project);
      }
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function saveAll() {
    const saveBtn = dom.saveBtn();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // 1. Save project order
      const order = projects.map(p => p.folder);
      await api('/api/projects/reorder', {
        method: 'PUT',
        body: JSON.stringify({ order }),
      });

      // 2. Save settings
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ cardCount }),
      });

      // 3. Save dirty project metadata
      for (const folder of dirtyProjects) {
        const project = projects.find(p => p.folder === folder);
        if (!project) continue;

        await api(`/api/projects/${encodeURIComponent(folder)}`, {
          method: 'PUT',
          body: JSON.stringify({
            name:          project.name,
            artisticStyle: project.artisticStyle,
            medium:        project.medium,
            creationDate:  project.creationDate,
            insight:       project.insight,
          }),
        });

        // Save image order
        const imageOrder = project.images.map(img => img.filename);
        await api(`/api/projects/${encodeURIComponent(folder)}/images/reorder`, {
          method: 'PUT',
          body: JSON.stringify({ order: imageOrder }),
        });
      }

      clearDirty();
      showToast('All changes saved successfully!', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All';
    }
  }

  // ─── Editor Actions ────────────────────────────────────────────────────────
  function openEditor(folder) {
    editingProject = folder;
    const project = projects.find(p => p.folder === folder);
    if (project) renderEditor(project);
  }

  function closeEditor() {
    editingProject = null;
    dom.editorSection().hidden = true;
  }

  function updateEditingField(field, value) {
    if (!editingProject) return;
    const project = projects.find(p => p.folder === editingProject);
    if (!project) return;
    project[field] = value;
    markDirty(editingProject);

    // Update project name in the list if changed
    if (field === 'name') {
      renderProjectList();
    }
  }

  // ─── Image Management ─────────────────────────────────────────────────────
  async function uploadImages(files) {
    if (!editingProject || !files.length) return;

    try {
      const result = await uploadFiles(
        `/api/projects/${encodeURIComponent(editingProject)}/images`,
        files
      );
      showToast(`Uploaded ${result.files.length} file(s)`, 'success');

      // Reload project data to get updated image list
      await loadProjects();
      markDirty(editingProject);
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
  }

  async function uploadThumbnail(file) {
    if (!editingProject || !file) return;

    // Rename to main.* with same extension
    const ext = file.name.split('.').pop();
    const mainFile = new File([file], `main.${ext}`, { type: file.type });

    try {
      await uploadFiles(
        `/api/projects/${encodeURIComponent(editingProject)}/images`,
        [mainFile]
      );
      showToast('Thumbnail updated', 'success');
      await loadProjects();
    } catch (err) {
      showToast('Thumbnail upload failed: ' + err.message, 'error');
    }
  }

  async function deleteImage(folder, filename) {
    try {
      await api(`/api/projects/${encodeURIComponent(folder)}/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      showToast(`"${filename}" moved to trash`, 'success');
      await loadProjects();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  async function deleteProject(folder) {
    try {
      await api(`/api/projects/${encodeURIComponent(folder)}`, {
        method: 'DELETE',
      });
      showToast('Project moved to trash', 'success');
      if (editingProject === folder) closeEditor();
      await loadProjects();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  // ─── New Project ───────────────────────────────────────────────────────────
  async function createNewProject(folder, name) {
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ folder, name }),
      });
      showToast('Project created', 'success');
      await loadProjects();
    } catch (err) {
      showToast('Create failed: ' + err.message, 'error');
    }
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function showToast(message, type = '') {
    const toast = dom.toast();
    toast.textContent = message;
    toast.className = 'dash-toast' + (type ? ` dash-toast--${type}` : '');
    toast.hidden = false;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.hidden = true; }, 3000);
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  // ─── Event Binding ─────────────────────────────────────────────────────────
  function bindEvents() {
    // Save
    dom.saveBtn().addEventListener('click', saveAll);

    // Preview
    dom.previewBtn().addEventListener('click', () => {
      window.open('/', '_blank');
    });

    // Card count
    dom.cardCount().addEventListener('change', (e) => {
      cardCount = parseInt(e.target.value, 10) || cardCount;
      markDirty();
    });

    // Add project
    dom.addProjectBtn().addEventListener('click', () => {
      dom.newProjectModal().hidden = false;
      $('#newFolder').value = '';
      $('#newName').value = '';
      $('#newFolder').focus();
    });

    // New project modal
    $('#newProjectCancel').addEventListener('click', () => {
      dom.newProjectModal().hidden = true;
    });

    $('#newProjectCreate').addEventListener('click', async () => {
      const folder = $('#newFolder').value.trim();
      const name   = $('#newName').value.trim() || folder;
      if (!folder) {
        showToast('Folder name is required', 'error');
        return;
      }
      dom.newProjectModal().hidden = true;
      await createNewProject(folder, name);
    });

    // Delete modal
    $('#deleteCancel').addEventListener('click', () => {
      dom.deleteModal().hidden = true;
      pendingDelete = null;
    });

    $('#deleteConfirm').addEventListener('click', async () => {
      dom.deleteModal().hidden = true;
      if (!pendingDelete) return;

      if (pendingDelete.type === 'project') {
        await deleteProject(pendingDelete.folder);
      } else if (pendingDelete.type === 'image') {
        await deleteImage(pendingDelete.folder, pendingDelete.filename);
      }
      pendingDelete = null;
    });

    // Editor close
    $('#editorClose').addEventListener('click', closeEditor);

    // Editor field changes
    const fieldMap = {
      editName:    'name',
      editStyle:   'artisticStyle',
      editMedium:  'medium',
      editDate:    'creationDate',
      editInsight: 'insight',
    };

    for (const [id, field] of Object.entries(fieldMap)) {
      $(`#${id}`).addEventListener('input', (e) => {
        updateEditingField(field, e.target.value);
      });
    }

    // Thumbnail upload
    $('#thumbUpload').addEventListener('change', (e) => {
      if (e.target.files.length) {
        uploadThumbnail(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Image upload
    $('#imageUpload').addEventListener('change', (e) => {
      if (e.target.files.length) {
        uploadImages(Array.from(e.target.files));
        e.target.value = '';
      }
    });

    // Delegated clicks on project list
    dom.projectList().addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const folder = btn.dataset.folder;

      if (action === 'edit') {
        openEditor(folder);
      } else if (action === 'delete-project') {
        pendingDelete = { type: 'project', folder };
        dom.deleteModalText().textContent = `Move project "${folder}" to trash?`;
        dom.deleteModal().hidden = false;
      }
    });

    // Delegated clicks on image grid (delete button)
    dom.imageGrid().addEventListener('click', (e) => {
      const btn = e.target.closest('.dash-image-card__delete');
      if (!btn) return;

      const filename = btn.dataset.filename;
      pendingDelete = { type: 'image', folder: editingProject, filename };
      dom.deleteModalText().textContent = `Move "${filename}" to trash?`;
      dom.deleteModal().hidden = false;
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    bindEvents();
    await loadProjects();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
