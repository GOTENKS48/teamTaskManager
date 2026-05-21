/**
 * Dashboard page logic — fetches and renders stats, overdue tasks, projects
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  setupNavbar();

  try {
    const [dashRes, projRes] = await Promise.all([
      API.getDashboard(),
      API.getProjects(),
    ]);
    renderStats(dashRes.data);
    renderOverdue(dashRes.data.overdueTasks);
    renderRecent(dashRes.data.recentTasks);
    renderProjects(projRes.data);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function renderStats(data) {
  const container = document.getElementById('stats-grid');
  const total = data.allTasks.total || 0;
  const done = data.allTasks.DONE || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  container.innerHTML = `
    <div class="stat-card fade-in-up">
      <div class="stat-icon">📁</div>
      <div class="stat-value">${data.projects}</div>
      <div class="stat-label">Projects</div>
    </div>
    <div class="stat-card fade-in-up" style="animation-delay:0.05s">
      <div class="stat-icon">📋</div>
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Tasks</div>
    </div>
    <div class="stat-card fade-in-up" style="animation-delay:0.1s">
      <div class="stat-icon">✅</div>
      <div class="stat-value">${pct}%</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card fade-in-up" style="animation-delay:0.15s">
      <div class="stat-icon">⚠️</div>
      <div class="stat-value">${data.overdueTasks.length}</div>
      <div class="stat-label">Overdue</div>
    </div>
  `;
}

function renderOverdue(tasks) {
  const container = document.getElementById('overdue-list');
  if (!tasks.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">No overdue tasks!</div></div>';
    return;
  }
  container.innerHTML = `<div class="table-wrap"><table class="table">
    <thead><tr><th>Task</th><th>Project</th><th>Due</th><th>Assignee</th></tr></thead>
    <tbody>${tasks.map(t => `<tr style="cursor:pointer" onclick="window.location.href='/project.html?id=${t.project.id}'">
      <td style="color:var(--text-primary)">${t.title}</td>
      <td>${t.project.name}</td>
      <td><span class="badge badge-overdue">${formatDate(t.dueDate)}</span></td>
      <td>${t.assignees && t.assignees.length > 0 ? t.assignees.map(a => a.name).join(', ') : '<span class="text-muted">Unassigned</span>'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderRecent(tasks) {
  const container = document.getElementById('recent-list');
  if (!tasks.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No recent activity</div></div>';
    return;
  }
  container.innerHTML = `<div class="table-wrap"><table class="table">
    <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>${tasks.map(t => `<tr style="cursor:pointer" onclick="window.location.href='/project.html?id=${t.project.id}'">
      <td style="color:var(--text-primary)">${t.title}</td>
      <td>${t.project.name}</td>
      <td>${statusBadge(t.status)}</td>
      <td class="text-muted">${formatRelative(t.updatedAt)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderProjects(projects) {
  const container = document.getElementById('projects-grid');
  if (!projects.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><div class="empty-state-text">No projects yet. Create your first one!</div></div>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="project-card fade-in-up" onclick="window.location.href='/project.html?id=${p.id}'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem">
        <div class="project-card-name">${p.name}</div>
        ${roleBadge(p.myRole)}
      </div>
      <div class="project-card-desc">${p.description || 'No description'}</div>
      <div class="project-card-stats">
        <span>👥 ${p._count.members} members</span>
        <span>📋 ${p._count.tasks} tasks</span>
      </div>
    </div>
  `).join('');
}

// Create project modal
document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await API.createProject({
      name: document.getElementById('new-project-name').value.trim(),
      description: document.getElementById('new-project-desc').value.trim(),
    });
    showToast('Project created!', 'success');
    closeModal('create-project-modal');
    e.target.reset();
    // Reload
    const [dashRes, projRes] = await Promise.all([API.getDashboard(), API.getProjects()]);
    renderStats(dashRes.data);
    renderProjects(projRes.data);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});
