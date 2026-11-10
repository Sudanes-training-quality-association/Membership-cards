/* Sudanese Training Quality Association — Membership Card Generator
   Pure vanilla JS. The card is drawn on a canvas (1000-unit design grid) so the
   preview and every export (PNG/JPG/WEBP/PDF/print) come from one renderer. */
(() => {
'use strict';

const PRINT_MM = 90, DPI = 300;
const PX = Math.round(PRINT_MM / 25.4 * DPI);          // 1063
const U = 1000;                                          // design units
const FONT = "Cairo, Tajawal, 'Segoe UI', Tahoma, Arial, sans-serif";
const C = { blue:'#1a4dff', green:'#1fae2a', greenDark:'#2f6b36', orange:'#f98717', ink:'#0d0d0d' };
const STORE = 'stqa-card-v1';

const $ = s => document.querySelector(s);
const canvas = $('#cardCanvas');
const form = $('#cardForm');
const ids = ['memberNo','memberName','specialization','validityDate','issueDate'];
const state = { photo: null };      // photo = HTMLImageElement
let photoData = '';                 // data URL (for session storage)

/* ---------- assets ---------- */
const logoImg = new Image();
const wmImg = new Image();
const wmReady = new Promise(r => { wmImg.onload = r; wmImg.onerror = r; wmImg.src = window.WM_DATA || 'assets/watermark.png'; });
const logoReady0 = new Promise(r => { logoImg.onload = r; logoImg.onerror = r; logoImg.src = window.LOGO_DATA || 'assets/association-logo.png'; });
const logoReady = Promise.all([logoReady0, wmReady]);

/* ---------- drawing helpers ---------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function text(ctx, str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 700} ${size}px ${FONT}`;
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'right';
  ctx.textBaseline = o.base || 'middle';
  ctx.direction = o.dir || 'rtl';
  if (o.maxW) {                       // shrink to fit
    let s = size;
    while (ctx.measureText(str).width > o.maxW && s > 12) { s -= 1; ctx.font = `${o.weight || 700} ${s}px ${FONT}`; }
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}
function fmtDate(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-');
  return `${d}/${m}/${y}`;
}

function decorations(ctx) {
  ctx.save();
  ctx.lineWidth = 1.6;
  const curves = [
    ['#1fae2a', .38], ['#f98717', .38]
  ];
  // flowing guilloche-like curves in the corners / edges
  const corners = [[0,0,1,1],[U,0,-1,1],[0,U,1,-1],[U,U,-1,-1]];
  corners.forEach(([cx, cy, sx, sy]) => {
    for (let i = 0; i < 16; i++) {
      const [col, a] = curves[i % 2];
      ctx.strokeStyle = col; ctx.globalAlpha = a * (1 - i / 22);
      const k = 40 + i * 14;
      ctx.beginPath();
      ctx.moveTo(cx + sx * 0, cy + sy * (k * 2.2));
      ctx.bezierCurveTo(cx + sx * k * 1.6, cy + sy * k * 1.4, cx + sx * k * 1.2, cy + sy * k * 0.5, cx + sx * (k * 2.2), cy);
      ctx.stroke();
    }
  });
  // side sweeps
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = i % 2 ? C.green : C.orange; ctx.globalAlpha = .22;
    ctx.beginPath();
    ctx.moveTo(0, 380 + i * 22);
    ctx.bezierCurveTo(70 + i * 5, 450 + i * 18, 40, 620 + i * 14, 0, 700 + i * 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(U, 380 + i * 22);
    ctx.bezierCurveTo(U - 70 - i * 5, 450 + i * 18, U - 40, 620 + i * 14, U, 700 + i * 12);
    ctx.stroke();
  }
  ctx.restore();
}

function render(cv, opts = {}) {
  const forExport = !!opts.export;
  const bg = opts.background;                 // CSS colour behind rounded corners, or undefined = transparent
  const ctx = cv.getContext('2d');
  cv.width = cv.height = PX;
  const k = PX / U;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, U, U);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, U, U); }

  // card body
  ctx.save();
  rr(ctx, 0, 0, U, U, 42); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, U, U);
  g.addColorStop(0, '#fbf8ee'); g.addColorStop(.5, '#f7f6e8'); g.addColorStop(1, '#f2f5e6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, U, U);
  decorations(ctx);

  // watermark (behind fields)
  if (wmImg.naturalWidth) {
    ctx.globalAlpha = .17;
    ctx.drawImage(wmImg, 190, 215, 620, 620);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // thin card edge
  ctx.save(); rr(ctx, 1.5, 1.5, U - 3, U - 3, 41); ctx.strokeStyle = 'rgba(47,107,54,.35)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();

  // --- header: logo (left) + names ---
  if (logoImg.naturalWidth) ctx.drawImage(logoImg, 44, 38, 150, 150);
  text(ctx, 'الجمعية السودانية لجودة التدريب', 700, 78, 46, { maxW: 480 });
  text(ctx, 'SUDANESE TRAINING QUALITY ASSOCIATION', 700, 132, 25, { dir: 'ltr', align: 'right', maxW: 480 });

  // --- title ---
  text(ctx, 'بطاقة عضوية', 560, 232, 64);
  text(ctx, 'MEMBERSHIP CARD', 560, 292, 32, { dir: 'ltr' });

  // --- photo (upper right) ---
  const px = 740, py = 38, pw = 220, ph = 275;
  ctx.save();
  rr(ctx, px, py, pw, ph, 18);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
  ctx.save(); ctx.clip();
  if (state.photo) {
    const im = state.photo, s = Math.max(pw / im.width, ph / im.height);
    const w = im.width * s, h = im.height * s;
    ctx.drawImage(im, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
  } else if (!forExport) {
    // camera placeholder (preview only)
    ctx.fillStyle = '#9a9a9a';
    const cx = px + pw / 2, cy = py + ph / 2;
    rr(ctx, cx - 50, cy - 30, 100, 70, 10); ctx.fill();
    ctx.fillRect(cx - 20, cy - 42, 40, 16);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy + 5, 24, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.arc(cx, cy + 5, 14, 0, 7); ctx.fill();
  }
  ctx.restore();
  rr(ctx, px, py, pw, ph, 18); ctx.strokeStyle = C.greenDark; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  text(ctx, 'صورة العضو', px + pw / 2, 345, 30, { align: 'center' });
  text(ctx, 'MEMBER PHOTO', px + pw / 2, 378, 21, { align: 'center', dir: 'ltr' });

  // --- fields: labels on the RIGHT, boxes extend to the LEFT ---
  const v = Object.fromEntries(ids.map(i => [i, (form[i].value || '').trim()]));
  const rows = [
    ['رقم العضوية:', 'MEMBERSHIP NO:', v.memberNo, 690],
    ['اسم العضو:', 'MEMBER NAME:', v.memberName, 690],
    ['التخصص:', 'SPECIALIZATION:', v.specialization, 690],
    ['تاريخ الصلاحية:', 'VALIDITY DATE:', fmtDate(v.validityDate), 440, true],
    ['التاريخ (الإصدار):', 'DATE (ISSUE):', fmtDate(v.issueDate), 440]
  ];
  const labelRight = 960, boxRight = 722, boxLeft = 44, bh = 76;
  rows.forEach(([ar, en, val, boxW, cal], i) => {
    const y = 412 + i * 96, cy = y + bh / 2;
    text(ctx, ar, labelRight, cy - 16, 34);
    text(ctx, en, labelRight, cy + 21, 22, { dir: 'ltr' });
    const bw = boxW === 690 ? boxRight - boxLeft : boxW, bx = boxRight - bw;
    ctx.save();
    rr(ctx, bx, y, bw, bh, 18);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill();
    ctx.strokeStyle = C.greenDark; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();
    if (val) text(ctx, val, bx + bw - 22, cy + 2, 36, { maxW: bw - 60, weight: 700 });
    if (cal && !forExport && !val) drawCalendar(ctx, bx + 36, cy);
  });
  // --- signature & stamp ---
  ctx.save(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(60, 905); ctx.lineTo(430, 905); ctx.moveTo(600, 905); ctx.lineTo(900, 905); ctx.stroke(); ctx.restore();
  text(ctx, 'التوقيع المخول', 245, 930, 28, { align: 'center' });
  text(ctx, 'AUTHORIZED SIGNATURE', 245, 962, 21, { align: 'center', dir: 'ltr' });
  text(ctx, 'الختم الرسمي', 750, 930, 28, { align: 'center' });
  text(ctx, 'OFFICIAL STAMP', 750, 962, 21, { align: 'center', dir: 'ltr' });
}

function drawCalendar(ctx, x, y) {
  ctx.save(); ctx.fillStyle = '#8a8a8a';
  rr(ctx, x - 22, y - 20, 44, 40, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 17, y - 8, 34, 24);
  ctx.fillStyle = '#8a8a8a';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ctx.fillRect(x - 15 + c * 8.5, y - 6 + r * 7.5, 5, 5);
  ctx.restore();
}

/* ---------- live preview ---------- */
let queued = false;
function refresh() {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; render(canvas, { background: null }); });
}

/* ---------- toasts / loader ---------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}
const loader = on => { $('#loader').hidden = !on; };

/* ---------- validation ---------- */
const MSG = {
  memberNo: 'الرجاء إدخال رقم العضوية', memberName: 'الرجاء إدخال اسم العضو',
  specialization: 'الرجاء إدخال التخصص', validityDate: 'الرجاء اختيار تاريخ الصلاحية', issueDate: 'الرجاء اختيار تاريخ الإصدار'
};
function validate() {
  let ok = true, first = null;
  ids.forEach(id => {
    const el = form[id], err = document.querySelector(`.error[data-for="${id}"]`);
    let m = '';
    if (!el.value.trim()) m = MSG[id];
    err.textContent = m; el.classList.toggle('invalid', !!m);
    if (m) { ok = false; first = first || el; }
  });
  if (ok && form.validityDate.value < form.issueDate.value) {
    const err = document.querySelector('.error[data-for="validityDate"]');
    err.textContent = 'تاريخ الصلاحية يجب أن يكون بعد تاريخ الإصدار';
    form.validityDate.classList.add('invalid'); ok = false; first = form.validityDate;
  }
  if (first) first.focus();
  return ok;
}

/* ---------- session persistence ---------- */
function save() {
  const d = Object.fromEntries(ids.map(i => [i, form[i].value]));
  d.photo = photoData;
  try { sessionStorage.setItem(STORE, JSON.stringify(d)); }
  catch { try { d.photo = ''; sessionStorage.setItem(STORE, JSON.stringify(d)); } catch {} }
}
function load() {
  try {
    const d = JSON.parse(sessionStorage.getItem(STORE) || 'null'); if (!d) return Promise.resolve();
    ids.forEach(i => form[i].value = d[i] || '');
    if (d.photo) return setPhoto(d.photo);
  } catch {}
  return Promise.resolve();
}

/* ---------- photo ---------- */
function setPhoto(url) {
  return new Promise(res => {
    if (!url) { state.photo = null; photoData = ''; }
    const t = $('#photoThumb');
    if (!url) { t.style.backgroundImage = ''; t.classList.remove('has'); $('#photoRemove').hidden = true; $('#photoPick').textContent = 'رفع صورة'; refresh(); save(); return res(); }
    const im = new Image();
    im.onload = () => {
      state.photo = im; photoData = url;
      t.style.backgroundImage = `url(${url})`; t.classList.add('has');
      $('#photoRemove').hidden = false; $('#photoPick').textContent = 'استبدال الصورة';
      refresh(); save(); res();
    };
    im.onerror = () => { toast('تعذر قراءة الصورة، جرّب صورة أخرى', 'err'); res(); };
    im.src = url;
  });
}
function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('الرجاء اختيار ملف صورة صالح', 'err');
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {                         // downscale to keep memory/storage sane
      const s = Math.min(1, 1200 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      setPhoto(c.toDataURL('image/jpeg', .92)); toast('تم رفع الصورة بنجاح');
    };
    im.onerror = () => toast('تعذر قراءة الصورة، جرّب صورة أخرى', 'err');
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* ---------- export ---------- */
const bytes = s => Uint8Array.from(s, c => c.charCodeAt(0) & 255);
const concat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let i = 0; parts.forEach(p => { o.set(p, i); i += p.length; }); return o; };
const dataToBytes = url => { const b = atob(url.split(',')[1]); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const toBlob = (cv, type, q) => new Promise(r => cv.toBlob(r, type, q));

function crc32(buf) {
  let c, crc = ~0; 
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return ~crc >>> 0;
}
function pngWithDpi(u8) {                        // insert pHYs chunk (300 DPI = 11811 px/m)
  const ppm = Math.round(DPI / 0.0254);
  const body = new Uint8Array(13); const dv = new DataView(body.buffer);
  body.set(bytes('pHYs'), 0); dv.setUint32(4, ppm); dv.setUint32(8, ppm); body[12] = 1;
  const chunk = new Uint8Array(21); const cdv = new DataView(chunk.buffer);
  cdv.setUint32(0, 9); chunk.set(body, 4); cdv.setUint32(17, crc32(body));
  const at = 8 + 25;                              // after signature + IHDR
  return concat([u8.slice(0, at), chunk, u8.slice(at)]);
}
function jpegWithDpi(u8) {                        // set JFIF density
  if (u8[2] === 0xFF && u8[3] === 0xE0 && u8[6] === 0x4A) { u8[13] = 1; u8[14] = DPI >> 8; u8[15] = DPI & 255; u8[16] = DPI >> 8; u8[17] = DPI & 255; }
  return u8;
}
function makePdf(jpeg) {                          // single-page PDF, page = exactly 90 x 90 mm
  const pt = (PRINT_MM / 25.4 * 72).toFixed(3);
  const content = `q ${pt} 0 0 ${pt} 0 0 cm /Im0 Do Q`;
  const parts = [], offs = []; let len = 0;
  const push = p => { parts.push(p); len += p.length; };
  const obj = (n, head, stream) => { offs[n] = len; push(bytes(`${n} 0 obj\n${head}\n`)); if (stream) { push(bytes('stream\n')); push(stream); push(bytes('\nendstream\n')); } push(bytes('endobj\n')); };
  push(bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt} ${pt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${PX} /Height ${PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  obj(5, `<< /Length ${content.length} >>`, bytes(content));
  const xref = len;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(bytes(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob([concat(parts)], { type: 'application/pdf' });
}

async function prepare() {
  if (!validate()) { toast('يرجى استكمال الحقول المطلوبة أولاً', 'err'); return null; }
  await Promise.all([logoReady, document.fonts ? document.fonts.load(`700 40px Cairo`, 'بطاقة عضوية').catch(() => {}) : 0]);
  if (document.fonts) await document.fonts.ready;
  return true;
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function exportAs(fmt) {
  if (!await prepare()) return;
  loader(true);
  try {
    await new Promise(r => setTimeout(r, 60));
    const cv = document.createElement('canvas');
    const solid = fmt === 'jpg' || fmt === 'pdf';
    render(cv, { export: true, background: solid ? '#ffffff' : undefined });
    const base = 'membership-card-' + (form.memberNo.value.trim().replace(/[^\w\u0600-\u06FF-]+/g, '_') || 'card');
    let blob;
    if (fmt === 'png') blob = new Blob([pngWithDpi(new Uint8Array(await (await toBlob(cv, 'image/png')).arrayBuffer()))], { type: 'image/png' });
    else if (fmt === 'jpg') blob = new Blob([jpegWithDpi(new Uint8Array(await (await toBlob(cv, 'image/jpeg', .96)).arrayBuffer()))], { type: 'image/jpeg' });
    else if (fmt === 'webp') {
      blob = await toBlob(cv, 'image/webp', .95);
      if (!blob || blob.type !== 'image/webp') throw new Error('webp');
    } else blob = makePdf(new Uint8Array(await (await toBlob(cv, 'image/jpeg', .97)).arrayBuffer()));
    download(blob, `${base}.${fmt === 'jpg' ? 'jpg' : fmt}`);
    toast(`تم تحميل ملف ${fmt.toUpperCase()} بنجاح`);
  } catch (e) {
    toast(e.message === 'webp' ? 'متصفحك لا يدعم صيغة WEBP، استخدم PNG أو JPG' : 'حدث خطأ أثناء إنشاء الملف', 'err');
  } finally { loader(false); }
}

/* ---------- print ---------- */
async function showPrint(thenPrint) {
  if (!await prepare()) return;
  const cv = document.createElement('canvas');
  render(cv, { export: true, background: '#ffffff' });
  $('#printImg').src = cv.toDataURL('image/png');
  $('#printModal').hidden = false;
  if (thenPrint) setTimeout(() => window.print(), 250);
}

/* ---------- events ---------- */
form.addEventListener('input', e => {
  if (e.target.classList.contains('invalid')) { e.target.classList.remove('invalid'); document.querySelector(`.error[data-for="${e.target.id}"]`).textContent = ''; }
  refresh(); save();
});
$('#photoPick').onclick = () => $('#photoInput').click();
$('#photoInput').onchange = e => { handleFile(e.target.files[0]); e.target.value = ''; };
$('#photoRemove').onclick = () => { setPhoto(''); toast('تمت إزالة الصورة'); };
$('#resetBtn').onclick = () => { form.reset(); setPhoto(''); ids.forEach(i => { form[i].classList.remove('invalid'); }); document.querySelectorAll('.error').forEach(e => e.textContent = ''); sessionStorage.removeItem(STORE); refresh(); toast('تمت إعادة تعيين النموذج'); };
$('#clearBtn').onclick = () => { if (!confirm('هل تريد مسح جميع البيانات المدخلة؟')) return; $('#resetBtn').click(); toast('تم مسح جميع البيانات'); };
document.querySelectorAll('[data-export]').forEach(b => b.onclick = () => exportAs(b.dataset.export));
$('#previewPrintBtn').onclick = () => showPrint(false);
$('#printBtn').onclick = () => showPrint(true);
$('#modalPrint').onclick = () => window.print();
$('#modalClose').onclick = () => { $('#printModal').hidden = true; };
$('#printModal').addEventListener('click', e => { if (e.target.id === 'printModal') e.target.hidden = true; });
window.addEventListener('afterprint', () => { $('#printModal').hidden = true; });

/* ---------- PWA ---------- */
let deferred;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; };
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));

/* ---------- init ---------- */
render(canvas, {});
logoReady.then(refresh);
load().then(refresh);
if (document.fonts) { document.fonts.load('700 40px Cairo', 'بطاقة').then(refresh).catch(() => {}); document.fonts.ready.then(refresh); }
})();
