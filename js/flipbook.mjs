import * as pdfjsLib from '/js/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.mjs';

const root = document.getElementById('flipbook-root');
if (!root) throw new Error('flipbook root not found');
const pdfUrl = root.dataset.pdf;
const leftCanvas = document.getElementById('left-canvas');
const rightCanvas = document.getElementById('right-canvas');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');

let pdfDoc = null;
let totalPages = 0;
let currentSpread = 0;

function resizeCanvasForDPR(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderPageToCanvas(pageNumber, canvas) {
  if (!canvas) return Promise.resolve();
  if (pageNumber < 1 || pageNumber > totalPages) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return Promise.resolve();
  }
  return pdfDoc.getPage(pageNumber).then(page => {
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = Math.min(900, window.innerWidth - 40) * 0.48;
    const scale = (containerWidth) / viewport.width;
    const vp = page.getViewport({ scale });
    resizeCanvasForDPR(canvas, vp.width, vp.height);
    const renderContext = { canvasContext: canvas.getContext('2d'), viewport: vp };
    return page.render(renderContext).promise;
  });
}

function updateSpread() {
  const leftPage = currentSpread * 2 + 1;
  const rightPage = leftPage + 1;
  Promise.all([
    renderPageToCanvas(leftPage, leftCanvas),
    renderPageToCanvas(rightPage, rightCanvas)
  ]).then(() => {
    pageIndicator.textContent = `${Math.min(leftPage, totalPages)}-${Math.min(rightPage, totalPages)} / ${totalPages}`;
  });
}

function goNext() {
  if ((currentSpread + 1) * 2 + 1 <= totalPages) {
    currentSpread++;
    updateSpread();
  }
}
function goPrev() {
  if (currentSpread > 0) {
    currentSpread--;
    updateSpread();
  }
}

prevBtn.addEventListener('click', goPrev);
nextBtn.addEventListener('click', goNext);
window.addEventListener('resize', () => { updateSpread(); });

pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
  pdfDoc = doc;
  totalPages = pdfDoc.numPages;
  currentSpread = 0;
  updateSpread();
}).catch(err => {
  console.error('Failed to load PDF:', err);
  root.innerHTML = '<p>Failed to load flipbook PDF.</p>';
});