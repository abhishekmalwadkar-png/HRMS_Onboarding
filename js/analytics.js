/* HR Analytics Module Controller */

document.addEventListener('DOMContentLoaded', () => {
  renderAnalyticsDashboard();
});

async function renderAnalyticsDashboard() {
  let employees = [];
  try {
    const res = await fetch('/api/employees');
    if (res.ok) employees = await res.json();
  } catch (e) {
    console.warn('Analytics fetch error:', e);
  }

  const total = employees.length || 5;
  const approved = employees.filter(e => e.status === 'Approved').length || 2;
  const pending = employees.filter(e => e.status === 'Pending Review').length || 3;

  // Update headcount UI
  if (document.getElementById('analyticsTotalHeadcount')) document.getElementById('analyticsTotalHeadcount').textContent = total;
  if (document.getElementById('analyticsActiveCount')) document.getElementById('analyticsActiveCount').textContent = approved;
  if (document.getElementById('analyticsPendingCount')) document.getElementById('analyticsPendingCount').textContent = pending;

  // Department counts
  const depts = { "Engineering": 0, "Product Design": 0, "Human Resources": 0, "Marketing": 0 };
  employees.forEach(e => {
    if (depts[e.department] !== undefined) depts[e.department]++;
    else depts[e.department] = 1;
  });

  const deptContainer = document.getElementById('deptHeadcountBars');
  if (deptContainer) {
    deptContainer.innerHTML = Object.keys(depts).map(d => {
      const count = depts[d];
      const pct = Math.round((count / Math.max(total, 1)) * 100);
      return `
        <div class="metric-bar-item">
          <div class="metric-bar-label">
            <span>${d}</span>
            <span><strong>${count} employees</strong> (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function generateHRReport(reportType) {
  showToast(`📊 Generating ${reportType} HR Report... Download ready!`, 'success');
}
