/* Employee Services & HR AI Helpdesk Controller */

let leaveRequests = [];

document.addEventListener('DOMContentLoaded', () => {
  loadLeaveRequests();
});

async function loadLeaveRequests() {
  try {
    const res = await fetch('/api/leaves');
    if (res.ok) {
      leaveRequests = await res.json();
    }
  } catch (e) {
    console.warn('Leave fetch error:', e);
  }
  renderLeaveTable();
}

function renderLeaveTable() {
  const tbody = document.getElementById('leaveTableBody');
  if (!tbody) return;

  if (leaveRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No leave applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = leaveRequests.map(l => `
    <tr>
      <td><strong>${l.empName}</strong></td>
      <td>${l.leaveType}</td>
      <td>${l.fromDate} to ${l.toDate}</td>
      <td>${l.reason}</td>
      <td><span class="badge ${l.status === 'Approved' ? 'badge-approved' : 'badge-pending'}">${l.status}</span></td>
    </tr>
  `).join('');
}

// AI Helpdesk Chatbot Answers
const policyAnswers = {
  "leave": "MangoHRMS policy provides 12 Casual Leaves, 10 Sick Leaves, and 15 Earned Leaves per calendar year. Leave requests must be submitted at least 2 days in advance.",
  "payslip": "You can download your monthly payslips directly from the Payslip & Documents tab. Payslips are generated on the 28th of every month.",
  "health": "Health Insurance coverage starts on Day 1 of joining. We offer 100% employer-sponsored Platinum PPO and Gold HDHP plans.",
  "timing": "Standard working hours are 9:00 AM to 6:00 PM Monday through Friday. Flexible core hours are 10:00 AM to 4:00 PM.",
  "letter": "You can generate official Employment Verification, Relieving, and Salary Experience letters instantly from the Letter Generator tool."
};

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;

  const msg = input.value.trim();
  appendChatBubble(msg, 'user');
  input.value = '';

  setTimeout(() => {
    let reply = "I'm your MangoHRMS AI Assistant. You can ask me about Leave policy, Payslips, Health insurance, Work timing, or HR Letter generation!";
    const lower = msg.toLowerCase();

    for (const key in policyAnswers) {
      if (lower.includes(key)) {
        reply = policyAnswers[key];
        break;
      }
    }

    appendChatBubble(reply, 'bot');
  }, 600);
}

function appendChatBubble(text, sender) {
  const messagesBox = document.getElementById('chatMessages');
  if (!messagesBox) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = text;

  messagesBox.appendChild(bubble);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function submitLeaveRequest(e) {
  e.preventDefault();
  const newLeave = {
    id: 'LV-' + Math.floor(100 + Math.random() * 900),
    empId: 'EMP-9021',
    empName: 'Alex Vance',
    leaveType: document.getElementById('lvType').value,
    fromDate: document.getElementById('lvFrom').value,
    toDate: document.getElementById('lvTo').value,
    reason: document.getElementById('lvReason').value,
    status: 'Approved'
  };

  fetch('/api/leaves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newLeave)
  }).then(() => {
    leaveRequests.unshift(newLeave);
    renderLeaveTable();
    showToast('✓ Leave Application submitted & automatically approved!', 'success');
  });
}

function downloadHRDocument(type) {
  showToast(`📄 Generating & downloading official ${type}...`, 'info');
}
