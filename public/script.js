const API_BASE = '/api/employees';

const rowsEl = document.getElementById('employeeRows');
const emptyStateEl = document.getElementById('emptyState');
const loadingStateEl = document.getElementById('loadingState');
const statusLineEl = document.getElementById('statusLine');
const stampCountEl = document.getElementById('stampCount');
const searchInput = document.getElementById('searchInput');

const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const panelTitle = document.getElementById('panelTitle');
const employeeForm = document.getElementById('employeeForm');
const formError = document.getElementById('formError');

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmBox = document.getElementById('confirmBox');
const confirmName = document.getElementById('confirmName');

const toastEl = document.getElementById('toast');

let employees = [];
let pendingDeleteId = null;

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

init();

function init() {
  document.getElementById('openAddBtn').addEventListener('click', () => openPanel());
  document.getElementById('closePanelBtn').addEventListener('click', closePanel);
  document.getElementById('cancelBtn').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirm);
  confirmOverlay.addEventListener('click', closeConfirm);
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteConfirmed);

  employeeForm.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', () => renderRows());

  loadEmployees();
}

async function loadEmployees() {
  setLoading(true);
  try {
    const res = await fetch(API_BASE);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Failed to load employees');
    employees = body.data;
    renderRows();
    setStatus(`Last synced ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    setStatus('Could not reach the server', true);
    showToast(err.message || 'Failed to load employees', true);
  } finally {
    setLoading(false);
  }
}

function renderRows() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? employees.filter((e) =>
        [e.name, e.department, e.role].some((v) => (v || '').toLowerCase().includes(query))
      )
    : employees;

  stampCountEl.textContent = employees.length;

  rowsEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyStateEl.hidden = false;
    emptyStateEl.querySelector('.empty-title').textContent =
      employees.length === 0 ? 'No records yet' : 'No matches';
    emptyStateEl.querySelector('.empty-sub').textContent =
      employees.length === 0
        ? 'Add your first employee to start the roster.'
        : 'Try a different search term.';
    return;
  }

  emptyStateEl.hidden = true;

  for (const emp of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="emp-name">${escapeHtml(emp.name)}</span>
        <span class="emp-email">${escapeHtml(emp.email)}</span>
      </td>
      <td><span class="dept-tag">${escapeHtml(emp.department)}</span></td>
      <td>${escapeHtml(emp.role || '—')}</td>
      <td class="num salary-figure">${emp.salary ? currency.format(emp.salary) : '—'}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="edit-link">Edit</button>
          <button type="button" class="delete-link">Remove</button>
        </div>
      </td>
    `;
    tr.querySelector('.edit-link').addEventListener('click', () => openPanel(emp));
    tr.querySelector('.delete-link').addEventListener('click', () => openConfirm(emp));
    rowsEl.appendChild(tr);
  }
}

function openPanel(emp) {
  formError.hidden = true;
  employeeForm.reset();

  if (emp) {
    panelTitle.textContent = 'Edit employee';
    document.getElementById('employeeId').value = emp._id;
    document.getElementById('fieldName').value = emp.name || '';
    document.getElementById('fieldEmail').value = emp.email || '';
    document.getElementById('fieldDepartment').value = emp.department || '';
    document.getElementById('fieldRole').value = emp.role || '';
    document.getElementById('fieldSalary').value = emp.salary || '';
  } else {
    panelTitle.textContent = 'Add employee';
    document.getElementById('employeeId').value = '';
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
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save employee';
  }
}

function openConfirm(emp) {
  pendingDeleteId = emp._id;
  confirmName.textContent = `${emp.name} — ${emp.department}`;
  confirmOverlay.classList.add('show');
  confirmBox.classList.add('show');
  confirmBox.setAttribute('aria-hidden', 'false');
}

function closeConfirm() {
  pendingDeleteId = null;
  confirmOverlay.classList.remove('show');
  confirmBox.classList.remove('show');
  confirmBox.setAttribute('aria-hidden', 'true');
}

async function handleDeleteConfirmed() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeConfirm();

  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Failed to remove employee');

    showToast('Employee removed');
    await loadEmployees();
  } catch (err) {
    showToast(err.message || 'Failed to remove employee', true);
  }
}

function setLoading(isLoading) {
  loadingStateEl.hidden = !isLoading || employees.length > 0;
}

function setStatus(text, isError) {
  statusLineEl.textContent = text;
  statusLineEl.style.color = isError ? '#a24b4b' : '';
}

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
