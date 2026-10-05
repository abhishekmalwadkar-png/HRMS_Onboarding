/* HTML5 Canvas E-Signature Pad Controller */

let signatureCanvas = null;
let sigCtx = null;
let isDrawing = false;
let hasSignature = false;

function initSignatureCanvas() {
  signatureCanvas = document.getElementById('signatureCanvas');
  if (!signatureCanvas) return;

  sigCtx = signatureCanvas.getContext('2d');
  
  // Set canvas resolution to match container size
  resizeSignatureCanvas();
  window.addEventListener('resize', resizeSignatureCanvas);

  // Mouse event listeners
  signatureCanvas.addEventListener('mousedown', startDrawing);
  signatureCanvas.addEventListener('mousemove', draw);
  signatureCanvas.addEventListener('mouseup', stopDrawing);
  signatureCanvas.addEventListener('mouseleave', stopDrawing);

  // Touch event listeners for tablet/mobile
  signatureCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = signatureCanvas.getBoundingClientRect();
    isDrawing = true;
    sigCtx.beginPath();
    sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  });

  signatureCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = signatureCanvas.getBoundingClientRect();
    sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sigCtx.stroke();
    hasSignature = true;
    updateSigStatus();
  });

  signatureCanvas.addEventListener('touchend', stopDrawing);
}

function resizeSignatureCanvas() {
  if (!signatureCanvas || !sigCtx) return;
  const parent = signatureCanvas.parentElement;
  signatureCanvas.width = parent.clientWidth || 500;
  signatureCanvas.height = parent.clientHeight || 180;

  // Style stroke
  sigCtx.lineWidth = 2.5;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';
  sigCtx.strokeStyle = '#6366f1';
}

function startDrawing(e) {
  isDrawing = true;
  const rect = signatureCanvas.getBoundingClientRect();
  sigCtx.beginPath();
  sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = signatureCanvas.getBoundingClientRect();
  sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  sigCtx.stroke();
  hasSignature = true;
  updateSigStatus();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    sigCtx.closePath();
  }
}

function clearSignature() {
  if (!sigCtx || !signatureCanvas) return;
  sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  hasSignature = false;
  updateSigStatus();
}

function updateSigStatus() {
  const statusEl = document.getElementById('sigStatusText');
  if (statusEl) {
    if (hasSignature) {
      statusEl.textContent = '✓ Digital Signature Recorded';
      statusEl.style.color = 'var(--accent-emerald)';
    } else {
      statusEl.textContent = 'Sign above to authorize';
      statusEl.style.color = 'var(--text-dim)';
    }
  }
}

function getSignatureDataUrl() {
  if (!hasSignature || !signatureCanvas) return null;
  return signatureCanvas.toDataURL('image/png');
}

function renderAutoSignature(name) {
  if (!signatureCanvas || !sigCtx) return;
  resizeSignatureCanvas();
  sigCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  
  sigCtx.font = "italic bold 36px 'Caveat', 'Dancing Script', cursive, 'Brush Script MT', sans-serif";
  sigCtx.fillStyle = '#6366f1';
  sigCtx.fillText(name || 'Sneha Rao', 40, signatureCanvas.height / 2 + 10);
  
  // Underline flourish
  sigCtx.beginPath();
  sigCtx.strokeStyle = '#6366f1';
  sigCtx.lineWidth = 2.5;
  sigCtx.moveTo(35, signatureCanvas.height / 2 + 25);
  sigCtx.quadraticCurveTo(signatureCanvas.width / 2, signatureCanvas.height / 2 + 40, signatureCanvas.width - 60, signatureCanvas.height / 2 + 20);
  sigCtx.stroke();
  
  hasSignature = true;
  updateSigStatus();
}
