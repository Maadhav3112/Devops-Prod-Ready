const API_BASE = '/api/employees';
const DEPT_BASE = '/api/departments';
const ROLE_BASE = '/api/roles';

const THEME_KEY = 'thikse-theme';
const FEATURES_KEY = 'thikse-features';

// ---------------------------------------------------------------------
// Element refs
// ---------------------------------------------------------------------

const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

const rowsEl = document.getElementById('employeeRows');
const emptyStateEl = document.getElementById('emptyState');
const loadingStateEl = document.getElementById('loadingState');
const statusLineEl = document.getElementById('statusLine');
const stampCountEl = document.getElementById('stampCount');
const searchInput = document.getElementById('searchInput');
const ledgerTable = document.getElementById('ledgerTable');

const filterDepartment = document.getElementById('filterDepartment');
const filterRole = document.getElementById('filterRole');
const filterStatus = document.getElementById('filterStatus');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const exportBtn = document.getElementById('exportBtn');
const settingsExportBtn = document.getElementById('settingsExportBtn');
const resetDemoBtn = document.getElementById('resetDemoBtn');

const statTotalEmployees = document.getElementById('statTotalEmployees');
const statTotalDepartments = document.getElementById('statTotalDepartments');
const statAverageSalary = document.getElementById('statAverageSalary');
const statHighestSalary = document.getElementById('statHighestSalary');
const dashboardDeptBreakdown = document.getElementById('dashboardDeptBreakdown');

const analyticsAvg = document.getElementById('analyticsAvg');
const analyticsHigh = document.getElementById('analyticsHigh');
const analyticsLow = document.getElementById('analyticsLow');
const analyticsDeptCount = document.getElementById('analyticsDeptCount');
const analyticsDeptBreakdown = document.getElementById('analyticsDeptBreakdown');
const statusBreakdownEl = document.getElementById('statusBreakdown');

const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panelTitle');
const employeeForm = document.getElementById('employeeForm');
const formError = document.getElementById('formError');
const departmentOptions = document.getElementById('departmentOptions');
const roleOptions = document.getElementById('roleOptions');

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBox = document.getElementById('confirmBox');
const confirmTitle = document.getElementById('confirmTitle');
const confirmName = document.getElementById('confirmName');

const toastEl = document.getElementById('toast');

const themePicker = document.getElementById('themePicker');
const toggleCompact = document.getElementById('toggleCompact');
const toggleAutoRefresh = document.getElementById('toggleAutoRefresh');
const toggleShortcuts = document.getElementById('toggleShortcuts');

const departmentChipsEl = document.getElementById('departmentChips');
const roleChipsEl = document.getElementById('roleChips');
const addDepartmentForm = document.getElementById('addDepartmentForm');
const addRoleForm = document.getElementById('addRoleForm');
const newDepartmentName = document.getElementById('newDepartmentName');
const newRoleName = document.getElementById('newRoleName');
const syncDepartmentsBtn = document.getElementById('syncDepartmentsBtn');
const syncRolesBtn = document.getElementById('syncRolesBtn');

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

let employees = [];
let departments = [];
let roles = [];
let currentRoute = 'dashboard';
let autoRefreshTimer = null;

// Generic confirm dialog is reused for employee delete, dept/role delete,
// and reset-demo. This holds whichever action is currently pending.
let pendingConfirmAction = null;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const STATUS_CLASS = {
  Active: 'status-active',
  'On Leave': 'status-leave',
  Inactive: 'status-inactive',
};

init();

function init() {
  setupRouter();
  setupTheme();
  setupFeatures();
  setupEmployeeUi();
  setupSettingsUi();

  loadEmployees();
  loadStats();
  loadDepartments();
  loadRoles();
}

// =======================================================================
// Router — simple hash-based navigation between the four pages
// =======================================================================

function setupRouter() {
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = `/${btn.dataset.route}`;
    });
  });

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

function renderRoute() {
  const hash = window.location.hash.replace('#/', '') || 'dashboard';
  const validRoutes = ['dashboard', 'employees', 'analytics', 'settings'];
  currentRoute = validRoutes.includes(hash) ? hash : 'dashboard';

  pages.forEach((page) => {
    page.hidden = page.dataset.page !== currentRoute;
  });
  navItems.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === currentRoute);
  });

  manageAutoRefreshTimer();
}

// =======================================================================
// Theme (light / dark / system) — applied app-wide via data-theme
// =======================================================================

function setupTheme() {
  const stored = localStorage.getItem(THEME_KEY) || 'system';
  applyTheme(stored, { persist: false });

  themePicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-option');
    if (!btn) return;
    applyTheme(btn.dataset.themeChoice, { persist: true });
  });

  // If the user has chosen "system", keep following OS changes live.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem(THEME_KEY) || 'system') === 'system') {
      applyTheme('system', { persist: false });
    }
  });
}

function applyTheme(choice, { persist }) {
  const resolved =
    choice === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : choice;

  document.documentElement.setAttribute('data-theme', resolved);
  if (persist) localStorage.setItem(THEME_KEY, choice);

  const activeChoice = persist ? choice : (localStorage.getItem(THEME_KEY) || 'system');
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeChoice === activeChoice);
  });
}

// =======================================================================
// Special features — client-side preferences stored in localStorage.
// There's no user-account system in this app, so per-browser storage is
// the right scope for these (not something that needs a database field).
// =======================================================================

function loadFeatures() {
  try {
    return JSON.parse(localStorage.getItem(FEATURES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveFeatures(features) {
  localStorage.setItem(FEATURES_KEY, JSON.stringify(features));
}

function setupFeatures() {
  const features = loadFeatures();

  toggleCompact.checked = Boolean(features.compact);
  toggleAutoRefresh.checked = Boolean(features.autoRefresh);
  toggleShortcuts.checked = features.shortcuts !== false; // default on

  applyCompact(toggleCompact.checked);

  toggleCompact.addEventListener('change', () => {
    const f = loadFeatures();
    f.compact = toggleCompact.checked;
    saveFeatures(f);
    applyCompact(toggleCompact.checked);
  });

  toggleAutoRefresh.addEventListener('change', () => {
    const f = loadFeatures();
    f.autoRefresh = toggleAutoRefresh.checked;
    saveFeatures(f);
    manageAutoRefreshTimer();
  });

  toggleShortcuts.addEventListener('change', () => {
    const f = loadFeatures();
    f.shortcuts = toggleShortcuts.checked;
    saveFeatures(f);
  });

  document.addEventListener('keydown', handleGlobalShortcut);
  manageAutoRefreshTimer();
}

function applyCompact(isCompact) {
  ledgerTable.classList.toggle('compact', isCompact);
}

function manageAutoRefreshTimer() {
  clearInterval(autoRefreshTimer);
  const features = loadFeatures();
  const onRelevantPage = currentRoute === 'dashboard' || currentRoute === 'analytics';
  if (features.autoRefresh && onRelevantPage) {
    autoRefreshTimer = setInterval(() => {
      loadStats();
    }, 30000);
  }
}

function handleGlobalShortcut(e) {
  const features = loadFeatures();
  if (features.shortcuts === false) return;

  // Never hijack typing inside an input/select/textarea.
  const tag = (e.target.tagName || '').toLowerCase();
  const isTyping = tag === 'input' || tag === 'select' || tag === 'textarea';

  if (e.key === 'Escape') {
    closePanel();
    closeConfirm();
    return;
  }

  if (isTyping) return;

  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    window.location.hash = '/employees';
    openPanel();
  } else if (e.key === '/') {
    e.preventDefault();
    window.location.hash = '/employees';
    searchInput.focus();
  }
}

// =======================================================================
// Employee data + dashboard/analytics rendering
// =======================================================================

function setupEmployeeUi() {
  document.getElementById('openAddBtn').addEventListener('click', () => openPanel());
  document.getElementById('closePanelBtn').addEventListener('click', closePanel);
  document.getElementById('cancelBtn').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirm);
  confirmOverlay.addEventListener('click', closeConfirm);
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmAccepted);

  employeeForm.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', () => renderRows());
  filterDepartment.addEventListener('change', () => renderRows());
  filterRole.addEventListener('change', () => renderRows());
  filterStatus.addEventListener('change', () => renderRows());
  clearFiltersBtn.addEventListener('click', clearFilters);
  exportBtn.addEventListener('click', handleExport);
  settingsExportBtn.addEventListener('click', handleExport);
}

async function loadEmployees() {
  setLoading(true);
  try {
    const res = await fetch(API_BASE);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load employees');
    employees = body.data;
    populateFilterOptions();
    renderRows();
    setStatus(`Last synced ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    setStatus('Could not reach the server', true);
    showToast(err.message || 'Failed to load employees', true);
  } finally {
    setLoading(false);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load stats');
    renderStats(body.data);
  } catch (err) {
    statTotalEmployees.textContent = '—';
    statTotalDepartments.textContent = '—';
    statAverageSalary.textContent = '—';
    statHighestSalary.textContent = '—';
  }
}

function renderStats(stats) {
  statTotalEmployees.textContent = stats.totalEmployees;
  statTotalDepartments.textContent = stats.totalDepartments;
  statAverageSalary.textContent = stats.averageSalary ? currency.format(stats.averageSalary) : '—';
  statHighestSalary.textContent = stats.highestSalary ? currency.format(stats.highestSalary) : '—';

  analyticsAvg.textContent = stats.averageSalary ? currency.format(stats.averageSalary) : '—';
  analyticsHigh.textContent = stats.highestSalary ? currency.format(stats.highestSalary) : '—';
  analyticsLow.textContent = stats.lowestSalary ? currency.format(stats.lowestSalary) : '—';
  analyticsDeptCount.textContent = stats.totalDepartments;

  renderDeptBreakdown(dashboardDeptBreakdown, stats.byDepartment);
  renderDeptBreakdown(analyticsDeptBreakdown, stats.byDepartment);
  renderStatusBreakdown(stats);
}

function renderDeptBreakdown(container, byDepartment) {
  container.innerHTML = '';
  if (!byDepartment || byDepartment.length === 0) {
    container.innerHTML = '<p class="chip-empty">No data yet.</p>';
    return;
  }
  const maxTotal = Math.max(1, ...byDepartment.map((d) => d.totalSalary));
  for (const d of byDepartment) {
    const row = document.createElement('div');
    const pct = Math.round((d.totalSalary / maxTotal) * 100);
    row.innerHTML = `
      <div class="dept-row-label">
        <span>${escapeHtml(d.department)}</span>
        <span class="dept-row-meta">${d.count} · avg ${currency.format(d.averageSalary)}</span>
      </div>
      <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${pct}%"></div></div>
    `;
    container.appendChild(row);
  }
}

function renderStatusBreakdown(stats) {
  const counts = { Active: 0, 'On Leave': 0, Inactive: 0 };
  for (const emp of employees) {
    const s = emp.status || 'Active';
    if (counts[s] !== undefined) counts[s] += 1;
  }
  statusBreakdownEl.innerHTML = '';
  for (const [label, count] of Object.entries(counts)) {
    const row = document.createElement('div');
    row.className = 'status-breakdown-row';
    row.innerHTML = `
      <span>${label}</span>
      <span class="status-badge ${STATUS_CLASS[label]}">${count}</span>
    `;
    statusBreakdownEl.appendChild(row);
  }
}

function populateFilterOptions() {
  const employeeDepartments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  const employeeRoles = [...new Set(employees.map((e) => e.role).filter(Boolean))].sort();

  fillSelect(filterDepartment, employeeDepartments, 'All departments');
  fillSelect(filterRole, employeeRoles, 'All roles');
}

function fillSelect(selectEl, values, placeholder) {
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  for (const v of values) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
  if (values.includes(current)) selectEl.value = current;
}

function clearFilters() {
  searchInput.value = '';
  filterDepartment.value = '';
  filterRole.value = '';
  filterStatus.value = '';
  renderRows();
}

function renderRows() {
  const query = searchInput.value.trim().toLowerCase();
  const dept = filterDepartment.value;
  const role = filterRole.value;
  const status = filterStatus.value;

  const filtered = employees.filter((e) => {
    const matchesQuery = query
      ? [e.name, e.department, e.role].some((v) => (v || '').toLowerCase().includes(query))
      : true;
    const matchesDept = dept ? e.department === dept : true;
    const matchesRole = role ? e.role === role : true;
    const matchesStatus = status ? (e.status || 'Active') === status : true;
    return matchesQuery && matchesDept && matchesRole && matchesStatus;
  });

  stampCountEl.textContent = employees.length;

  rowsEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyStateEl.hidden = false;
    emptyStateEl.querySelector('.empty-title').textContent =
      employees.length === 0 ? 'No records yet' : 'No matches';
    emptyStateEl.querySelector('.empty-sub').textContent =
      employees.length === 0
        ? 'Add your first employee to start the roster.'
        : 'Try a different search term or filter.';
    return;
  }

  emptyStateEl.hidden = true;

  for (const emp of filtered) {
    const empStatus = emp.status || 'Active';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="emp-name">${escapeHtml(emp.name)}</span>
        <span class="emp-email">${escapeHtml(emp.email)}</span>
      </td>
      <td><span class="dept-tag">${escapeHtml(emp.department)}</span></td>
      <td>${escapeHtml(emp.role || '—')}</td>
      <td class="num salary-figure">${emp.salary ? currency.format(emp.salary) : '—'}</td>
      <td><span class="status-badge ${STATUS_CLASS[empStatus] || 'status-active'}">${escapeHtml(empStatus)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="edit-link">Edit</button>
          <button type="button" class="delete-link">Remove</button>
        </div>
      </td>
    `;
    tr.querySelector('.edit-link').addEventListener('click', () => openPanel(emp));
    tr.querySelector('.delete-link').addEventListener('click', () => openConfirmDeleteEmployee(emp));
    rowsEl.appendChild(tr);
  }
}

function openPanel(emp) {
  formError.hidden = true;
  employeeForm.reset();
  refreshFormDatalists();

  if (emp) {
    panelTitle.textContent = 'Edit employee';
    document.getElementById('employeeId').value = emp._id;
    document.getElementById('fieldName').value = emp.name || '';
    document.getElementById('fieldEmail').value = emp.email || '';
    document.getElementById('fieldDepartment').value = emp.department || '';
    document.getElementById('fieldRole').value = emp.role || '';
    document.getElementById('fieldSalary').value = emp.salary || '';
    document.getElementById('fieldStatus').value = emp.status || 'Active';
  } else {
    panelTitle.textContent = 'Add employee';
    document.getElementById('employeeId').value = '';
    document.getElementById('fieldStatus').value = 'Active';
  }

  overlay.classList.add('show');
  panel.classList.add('show');
  panel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
  overlay.classList.remove('show');
  panel.classList.remove('show');
  panel.setAttribute('aria-hidden', 'true');
}

function refreshFormDatalists() {
  departmentOptions.innerHTML = departments.map((d) => `<option value="${escapeHtml(d.name)}"></option>`).join('');
  roleOptions.innerHTML = roles.map((r) => `<option value="${escapeHtml(r.name)}"></option>`).join('');
}

async function handleSubmit(e) {
  e.preventDefault();
  formError.hidden = true;

  const id = document.getElementById('employeeId').value;
  const payload = {
    name: document.getElementById('fieldName').value.trim(),
    email: document.getElementById('fieldEmail').value.trim(),
    department: document.getElementById('fieldDepartment').value.trim(),
    role: document.getElementById('fieldRole').value.trim(),
    salary: Number(document.getElementById('fieldSalary').value) || 0,
    status: document.getElementById('fieldStatus').value,
  };

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const res = await fetch(id ? `${API_BASE}/${id}` : API_BASE, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Failed to save employee');

    closePanel();
    showToast(id ? 'Employee updated' : 'Employee added');
    await loadEmployees();
    await loadStats();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save employee';
  }
}

function handleExport() {
  window.location.href = `${API_BASE}/export`;
}

function setLoading(isLoading) {
  loadingStateEl.hidden = !isLoading || employees.length > 0;
}

function setStatus(text, isError) {
  statusLineEl.textContent = text;
  statusLineEl.style.color = isError ? 'var(--danger)' : '';
}

// =======================================================================
// Generic confirm dialog — used for employee delete, dept/role delete,
// and reset-demo. `pendingConfirmAction` holds a function to run on accept.
// =======================================================================

function openConfirm(title, subtitle, onAccept) {
  confirmTitle.textContent = title;
  confirmName.textContent = subtitle;
  pendingConfirmAction = onAccept;
  confirmOverlay.classList.add('show');
  confirmBox.classList.add('show');
  confirmBox.setAttribute('aria-hidden', 'false');
}

function closeConfirm() {
  pendingConfirmAction = null;
  confirmOverlay.classList.remove('show');
  confirmBox.classList.remove('show');
  confirmBox.setAttribute('aria-hidden', 'true');
}

async function handleConfirmAccepted() {
  const action = pendingConfirmAction;
  closeConfirm();
  if (action) await action();
}

function openConfirmDeleteEmployee(emp) {
  openConfirm('Remove this employee?', `${emp.name} — ${emp.department}`, async () => {
    try {
      const res = await fetch(`${API_BASE}/${emp._id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to remove employee');
      showToast('Employee removed');
      await loadEmployees();
      await loadStats();
    } catch (err) {
      showToast(err.message || 'Failed to remove employee', true);
    }
  });
}

// =======================================================================
// Settings: departments & roles management, special features are wired
// in setupFeatures() above.
// =======================================================================

function setupSettingsUi() {
  addDepartmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newDepartmentName.value.trim();
    if (!name) return;
    try {
      const res = await fetch(DEPT_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to add department');
      newDepartmentName.value = '';
      showToast('Department added');
      await loadDepartments();
    } catch (err) {
      showToast(err.message || 'Failed to add department', true);
    }
  });

  addRoleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newRoleName.value.trim();
    if (!name) return;
    try {
      const res = await fetch(ROLE_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to add role');
      newRoleName.value = '';
      showToast('Role added');
      await loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to add role', true);
    }
  });

  syncDepartmentsBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${DEPT_BASE}/sync`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Sync failed');
      showToast(body.added > 0 ? `Added ${body.added} department(s) from the roster` : 'Already up to date');
      await loadDepartments();
    } catch (err) {
      showToast(err.message || 'Sync failed', true);
    }
  });

  syncRolesBtn.addEventListener('click', async () => {
    try {
      const res = await fetch(`${ROLE_BASE}/sync`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Sync failed');
      showToast(body.added > 0 ? `Added ${body.added} role(s) from the roster` : 'Already up to date');
      await loadRoles();
    } catch (err) {
      showToast(err.message || 'Sync failed', true);
    }
  });

  resetDemoBtn.addEventListener('click', () => {
    openConfirm(
      'Reset all demo data?',
      'This permanently deletes every employee record. This cannot be undone.',
      async () => {
        try {
          const res = await fetch(`${API_BASE}/reset-demo`, { method: 'DELETE' });
          const body = await res.json();
          if (!res.ok || !body.success) throw new Error(body.error || 'Failed to reset data');
          showToast(`Removed ${body.deletedCount} employee record(s)`);
          await loadEmployees();
          await loadStats();
        } catch (err) {
          showToast(err.message || 'Failed to reset data', true);
        }
      }
    );
  });
}

async function loadDepartments() {
  try {
    const res = await fetch(DEPT_BASE);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error);
    departments = body.data;
    renderChips(departmentChipsEl, departments, openConfirmDeleteDepartment);
    refreshFormDatalists();
  } catch {
    departmentChipsEl.innerHTML = '<p class="chip-empty">Could not load departments.</p>';
  }
}

async function loadRoles() {
  try {
    const res = await fetch(ROLE_BASE);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error);
    roles = body.data;
    renderChips(roleChipsEl, roles, openConfirmDeleteRole);
    refreshFormDatalists();
  } catch {
    roleChipsEl.innerHTML = '<p class="chip-empty">Could not load roles.</p>';
  }
}

function renderChips(container, items, onDelete) {
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="chip-empty">None yet — add one below or sync from the roster.</p>';
    return;
  }
  for (const item of items) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtml(item.name)} <button type="button" aria-label="Remove"><i class="ti ti-x"></i></button>`;
    chip.querySelector('button').addEventListener('click', () => onDelete(item));
    container.appendChild(chip);
  }
}

function openConfirmDeleteDepartment(dept) {
  openConfirm('Remove this department?', `"${dept.name}" will be removed from the suggestion list only.`, async () => {
    try {
      const res = await fetch(`${DEPT_BASE}/${dept._id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to remove department');
      const stillUsed = body.data.employeesStillUsingName;
      showToast(stillUsed > 0 ? `Removed. ${stillUsed} employee(s) still use that name.` : 'Department removed');
      await loadDepartments();
    } catch (err) {
      showToast(err.message || 'Failed to remove department', true);
    }
  });
}

function openConfirmDeleteRole(role) {
  openConfirm('Remove this role?', `"${role.name}" will be removed from the suggestion list only.`, async () => {
    try {
      const res = await fetch(`${ROLE_BASE}/${role._id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to remove role');
      const stillUsed = body.data.employeesStillUsingName;
      showToast(stillUsed > 0 ? `Removed. ${stillUsed} employee(s) still use that name.` : 'Role removed');
      await loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to remove role', true);
    }
  });
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

let toastTimer;
function showToast(message, isError) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.toggle('error', Boolean(isError));
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
