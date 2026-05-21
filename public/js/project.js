/**
 * Project page logic — Task board, member management, task CRUD
 */
let projectId, projectData, myRole, allTasks = [], members = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  setupNavbar();
  projectId = getProjectIdFromUrl();
  if (!projectId) { window.location.href = '/dashboard.html'; return; }
  await loadProject();
});

async function loadProject() {
  try {
    const [projRes, taskRes] = await Promise.all([
      API.getProject(projectId),
      API.getTasks(projectId),
    ]);
    projectData = projRes.data;
    myRole = projectData.myRole;
    members = projectData.members || [];
    allTasks = taskRes.data;

    renderProjectHeader();
    renderTaskBoard();
    renderMembers();
    toggleAdminUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function toggleAdminUI() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = myRole === 'ADMIN' ? '' : 'none';
  });
}

function renderProjectHeader() {
  document.getElementById('project-name').textContent = projectData.name;
  document.getElementById('project-desc').textContent = projectData.description || '';
  document.title = `${projectData.name} — TaskFlow`;
}

function renderTaskBoard() {
  const cols = { TODO: [], IN_PROGRESS: [], DONE: [] };
  allTasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

  ['TODO', 'IN_PROGRESS', 'DONE'].forEach(status => {
    const container = document.getElementById(`col-${status}`);
    const countEl = document.getElementById(`count-${status}`);
    countEl.textContent = cols[status].length;

    if (!cols[status].length) {
      container.innerHTML = '<div class="empty-state" style="padding:1.5rem"><div class="text-muted text-sm">No tasks</div></div>';
      return;
    }

    container.innerHTML = cols[status].map(t => {
      const dueCls = t.dueDate && isOverdue(t.dueDate) && t.status !== 'DONE' ? 'overdue' : '';
      return `<div class="task-card" onclick="openTaskDetail('${t.id}')">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.3rem">
          <div class="task-card-title">${t.title}</div>
          ${priorityBadge(t.priority)}
        </div>
        <div class="task-card-meta">
          ${t.assignedTo ? `<span class="task-card-assignee"><span class="user-avatar" style="width:20px;height:20px;font-size:0.6rem">${userInitials(t.assignedTo.name)}</span>${t.assignedTo.name}</span>` : '<span class="task-card-assignee text-muted">Unassigned</span>'}
          ${t.dueDate ? `<span class="task-card-due ${dueCls}">${formatDate(t.dueDate)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  });
}

function renderMembers() {
  const container = document.getElementById('members-list');
  const user = getUser();
  container.innerHTML = members.map(m => `
    <div class="member-item">
      <div class="member-info">
        <div class="user-avatar" style="width:28px;height:28px;font-size:0.7rem">${userInitials(m.user.name)}</div>
        <div>
          <div style="font-size:0.875rem;font-weight:500">${m.user.name} ${m.user.id === user.id ? '<span class="text-muted">(you)</span>' : ''}</div>
          <div class="text-muted" style="font-size:0.75rem">${m.user.email}</div>
        </div>
      </div>
      <div class="member-actions">
        ${roleBadge(m.role)}
        ${myRole === 'ADMIN' && m.user.id !== user.id ? `
          <select class="form-select" style="width:auto;padding:0.25rem 0.5rem;font-size:0.75rem" onchange="changeMemberRole('${m.userId}', this.value)">
            <option value="MEMBER" ${m.role === 'MEMBER' ? 'selected' : ''}>Member</option>
            <option value="ADMIN" ${m.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
          </select>
          <button class="btn btn-danger btn-sm" onclick="removeMember('${m.userId}')">Remove</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Task Detail Modal ───────────────────────────────────────────────────────

async function openTaskDetail(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  const user = getUser();
  const isAdmin = myRole === 'ADMIN';
  const isAssignee = task.assignedToId === user.id;
  const canEdit = isAdmin;
  const canChangeStatus = isAdmin || isAssignee;

  const modal = document.getElementById('task-detail-modal');
  document.getElementById('task-detail-title').textContent = task.title;
  document.getElementById('task-detail-desc').textContent = task.description || 'No description';
  document.getElementById('task-detail-status').innerHTML = statusBadge(task.status);
  document.getElementById('task-detail-priority').innerHTML = priorityBadge(task.priority);
  document.getElementById('task-detail-due').textContent = task.dueDate ? formatDate(task.dueDate) : 'No due date';
  document.getElementById('task-detail-assignee').textContent = task.assignedTo ? task.assignedTo.name : 'Unassigned';
  document.getElementById('task-detail-created').textContent = `Created by ${task.createdBy.name} · ${formatRelative(task.createdAt)}`;

  // Status change buttons
  const statusActions = document.getElementById('task-status-actions');
  if (canChangeStatus) {
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'].filter(s => s !== task.status);
    statusActions.innerHTML = '<div style="margin-top:1rem"><label class="form-label">Move to:</label><div style="display:flex;gap:0.5rem">' +
      statuses.map(s => `<button class="btn btn-secondary btn-sm" onclick="updateTaskStatus('${taskId}','${s}')">${s === 'TODO' ? '📋 To Do' : s === 'IN_PROGRESS' ? '🔄 In Progress' : '✅ Done'}</button>`).join('') +
      '</div></div>';
    statusActions.style.display = '';
  } else {
    statusActions.style.display = 'none';
  }

  // Admin actions
  const adminActions = document.getElementById('task-admin-actions');
  if (canEdit) {
    adminActions.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openEditTask('${taskId}')">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteTask('${taskId}')">🗑️ Delete</button>
    `;
    adminActions.style.display = '';
  } else {
    adminActions.style.display = 'none';
  }

  openModal('task-detail-modal');
}

async function updateTaskStatus(taskId, status) {
  try {
    await API.updateTask(projectId, taskId, { status });
    showToast('Task updated!', 'success');
    closeModal('task-detail-modal');
    const res = await API.getTasks(projectId);
    allTasks = res.data;
    renderTaskBoard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.deleteTask(projectId, taskId);
    showToast('Task deleted', 'success');
    closeModal('task-detail-modal');
    const res = await API.getTasks(projectId);
    allTasks = res.data;
    renderTaskBoard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Create Task ─────────────────────────────────────────────────────────────

function openCreateTask() {
  // Populate assignee dropdown
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>' +
    members.map(m => `<option value="${m.userId}">${m.user.name}</option>`).join('');
  document.getElementById('create-task-form').reset();
  openModal('create-task-modal');
}

document.getElementById('create-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const body = {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-desc').value.trim(),
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value || undefined,
      assignedToId: document.getElementById('task-assignee').value || undefined,
    };
    await API.createTask(projectId, body);
    showToast('Task created!', 'success');
    closeModal('create-task-modal');
    const res = await API.getTasks(projectId);
    allTasks = res.data;
    renderTaskBoard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// ─── Edit Task ───────────────────────────────────────────────────────────────

function openEditTask(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  closeModal('task-detail-modal');

  document.getElementById('edit-task-id').value = task.id;
  document.getElementById('edit-task-title').value = task.title;
  document.getElementById('edit-task-desc').value = task.description || '';
  document.getElementById('edit-task-priority').value = task.priority;
  document.getElementById('edit-task-status').value = task.status;
  document.getElementById('edit-task-due').value = task.dueDate ? task.dueDate.split('T')[0] : '';

  const sel = document.getElementById('edit-task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>' +
    members.map(m => `<option value="${m.userId}" ${m.userId === task.assignedToId ? 'selected' : ''}>${m.user.name}</option>`).join('');

  openModal('edit-task-modal');
}

document.getElementById('edit-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const taskId = document.getElementById('edit-task-id').value;
    const body = {
      title: document.getElementById('edit-task-title').value.trim(),
      description: document.getElementById('edit-task-desc').value.trim(),
      priority: document.getElementById('edit-task-priority').value,
      status: document.getElementById('edit-task-status').value,
      dueDate: document.getElementById('edit-task-due').value || null,
      assignedToId: document.getElementById('edit-task-assignee').value || null,
    };
    await API.updateTask(projectId, taskId, body);
    showToast('Task updated!', 'success');
    closeModal('edit-task-modal');
    const res = await API.getTasks(projectId);
    allTasks = res.data;
    renderTaskBoard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// ─── Members ─────────────────────────────────────────────────────────────────

document.getElementById('add-member-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await API.addMember(projectId, {
      email: document.getElementById('member-email').value.trim(),
      role: document.getElementById('member-role').value,
    });
    showToast('Member added!', 'success');
    closeModal('add-member-modal');
    e.target.reset();
    await loadProject();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

async function changeMemberRole(userId, role) {
  try {
    await API.updateMemberRole(projectId, userId, { role });
    showToast('Role updated', 'success');
    await loadProject();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeMember(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await API.removeMember(projectId, userId);
    showToast('Member removed', 'success');
    await loadProject();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
