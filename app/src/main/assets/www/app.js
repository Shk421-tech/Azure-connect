'use strict';
/* Azure Connect. UI layer; talks to Android through window.Android and to Firebase when configured. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'piyu_world_v3';
const CFG = window.FIREBASE_CONFIG;
const COLLECTIONS = ['Our Photos', 'Our Songs', 'Our Stupid Moments 😂', 'Letters', 'Special Days', 'Our Adventures'];
const COL_COLORS = ['#B5EBD3', '#D2C6FF', '#FFE08A', '#FFC2D9', '#FFCBA8', '#ABD2FA'];
const MOODS = [['calm', '☁️', '#ABD2FA'], ['heavy', '🌧️', '#D2C6FF'], ['happy', '☀️', '#FFE08A'], ['restless', '🌀', '#FFCBA8'], ['tender', '💗', '#FFC2D9'], ['tired', '🌙', '#B5EBD3']];
const moodOf = n => MOODS.find(m => m[0] === n) || MOODS[0];
const MAX_INLINE = 650000; // bytes of media we put inside a synced document (Firestore limit is 1 MiB)
const bridge = (fn, ...a) => { try { if (window.Android && Android[fn]) return Android[fn](...a); } catch (e) {} };

/* ================= the night sky: painted, not drawn ================= */
let _seed = 11;
const rnd = () => ((_seed = (_seed * 16807) % 2147483647) / 2147483647);
const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
function paintStars(cv) {
  const W = cv.width = 660, H = cv.height = 1350, x = cv.getContext('2d'); _seed = 11;
  x.save(); x.translate(W * .55, H * .42); x.rotate(-.9);
  const band = x.createLinearGradient(0, -W * .22, 0, W * .22);
  band.addColorStop(0, 'rgba(171,210,250,0)'); band.addColorStop(.5, 'rgba(171,210,250,.075)'); band.addColorStop(1, 'rgba(171,210,250,0)');
  x.fillStyle = band; x.filter = 'blur(26px)'; x.fillRect(-H, -W * .22, H * 2, W * .44); x.restore(); x.filter = 'none';
  const tints = ['255,255,255', '214,226,255', '255,240,225', '190,210,255'];
  const dot = (px, py, r, a, glow) => {
    const c = tints[(rnd() * tints.length) | 0];
    if (glow) { const g = x.createRadialGradient(px, py, 0, px, py, r * 7); g.addColorStop(0, `rgba(${c},${a * .55})`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 7, 0, 7); x.fill(); }
    x.fillStyle = `rgba(${c},${a})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  };
  for (let i = 0; i < 900; i++) dot(rnd() * W, rnd() * H, .4 + rnd() * .5, .12 + rnd() * .4, false);
  for (let i = 0; i < 1100; i++) {
    const t = gauss() * W * .13, s = (rnd() - .5) * H * 1.6, a = -.9;
    const px = W * .55 + Math.cos(a) * s - Math.sin(a) * t, py = H * .42 + Math.sin(a) * s + Math.cos(a) * t;
    if (px > 0 && px < W && py > 0 && py < H) dot(px, py, .35 + rnd() * .35, .1 + rnd() * .3, false);
  }
  for (let i = 0; i < 70; i++) dot(rnd() * W, rnd() * H, .8 + rnd() * .5, .5 + rnd() * .35, false);
  for (let i = 0; i < 14; i++) dot(rnd() * W, rnd() * H * .8, 1.1 + rnd() * .8, .8 + rnd() * .2, true);
}
let _moon;
function moonURL() { // grey regolith, dark maria, faint craters, limb darkening, soft terminator
  if (_moon) return _moon;
  const px = 420, R = px / 2, mk = () => { const c = document.createElement('canvas'); c.width = c.height = px; return c; };
  _seed = 7;
  const tex = mk(), t = tex.getContext('2d');
  t.save(); t.beginPath(); t.arc(R, R, R - 1, 0, 7); t.clip();
  let g = t.createRadialGradient(R * .75, R * .8, R * .1, R, R, R);
  g.addColorStop(0, '#ece9e1'); g.addColorStop(.65, '#cfcdc8'); g.addColorStop(1, '#a3a4aa');
  t.fillStyle = g; t.fillRect(0, 0, px, px);
  t.filter = `blur(${px * .045}px)`;
  for (let i = 0; i < 14; i++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R * .62;
    t.fillStyle = `rgba(92,96,112,${.30 + rnd() * .22})`;
    t.beginPath(); t.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d, R * (.07 + rnd() * .15), R * (.06 + rnd() * .11), rnd() * 3, 0, 7); t.fill();
  }
  t.filter = 'none';
  for (let i = 0; i < 320; i++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R * .95, cx = R + Math.cos(a) * d, cy = R + Math.sin(a) * d, r = px * (.004 + Math.pow(rnd(), 5) * .05);
    const cg = t.createRadialGradient(cx - r * .25, cy - r * .25, r * .1, cx, cy, r);
    cg.addColorStop(0, 'rgba(80,84,98,.13)'); cg.addColorStop(.75, 'rgba(80,84,98,.07)'); cg.addColorStop(1, 'rgba(255,255,255,.09)');
    t.fillStyle = cg; t.beginPath(); t.arc(cx, cy, r, 0, 7); t.fill();
  }
  for (let i = 0; i < 5000; i++) { t.fillStyle = rnd() < .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; t.fillRect(rnd() * px, rnd() * px, 1.2, 1.2); }
  g = t.createRadialGradient(R, R, R * .5, R, R, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,14,44,.5)');
  t.fillStyle = g; t.fillRect(0, 0, px, px); t.restore();
  const out = mk(), o = out.getContext('2d');
  o.globalAlpha = .04; o.drawImage(tex, 0, 0); o.globalAlpha = 1;
  const lit = mk(), l = lit.getContext('2d'); l.drawImage(tex, 0, 0);
  l.globalCompositeOperation = 'destination-out'; l.filter = `blur(${px * .01}px)`;
  l.beginPath(); l.arc(R + R * 1.2, R - R * .1, R * 1.03, 0, 7); l.fill();
  o.drawImage(lit, 0, 0);
  return (_moon = out.toDataURL('image/png'));
}
const moonHTML = () => `<div class="moon-wrap"><img src="${moonURL()}" alt=""></div>`;

/* ================= little hand-drawn stickers ================= */
const O = 'stroke="#091540" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const STICKERS = {
  cloud: `<svg class="sticker" viewBox="0 0 120 84"><path d="M32 70a20 20 0 0 1-3-39.800A27 27 0 0 1 80 24a23 23 0 0 1 14 44z" fill="#fff" ${O}/><circle cx="52" cy="50" r="3.4" fill="#091540"/><circle cx="76" cy="50" r="3.4" fill="#091540"/><ellipse cx="44" cy="58" rx="6" ry="3.4" fill="#FFC2D9"/><ellipse cx="84" cy="58" rx="6" ry="3.4" fill="#FFC2D9"/><path d="M58 57q6 6 12 0" fill="none" ${O}/></svg>`,
  star: `<svg class="sticker" viewBox="0 0 120 112"><path d="M60 6l15 31 34 4-25 23 7 34-31-17-31 17 7-34L11 41l34-4z" fill="#FFE08A" ${O}/><circle cx="51" cy="54" r="3" fill="#091540"/><circle cx="69" cy="54" r="3" fill="#091540"/><ellipse cx="44" cy="62" rx="5" ry="3" fill="#FFC2D9"/><ellipse cx="76" cy="62" rx="5" ry="3" fill="#FFC2D9"/><path d="M55 62q5 5 10 0" fill="none" ${O}/></svg>`,
  heart: `<svg class="sticker" viewBox="0 0 120 108"><path d="M60 100C20 72 10 48 22 30c11-14 30-9 38 6 8-15 27-20 38-6 12 18 2 42-38 70z" fill="#FFC2D9" ${O}/><circle cx="46" cy="50" r="3" fill="#091540"/><circle cx="74" cy="50" r="3" fill="#091540"/><path d="M54 58q6 6 12 0" fill="none" ${O}/></svg>`,
  moon: `<svg class="sticker" viewBox="0 0 120 110"><path d="M72 10a46 46 0 1 0 30 70A38 38 0 0 1 72 10z" fill="#FFE08A" ${O}/><path d="M38 56q6 5 12 0" fill="none" ${O}/><ellipse cx="38" cy="66" rx="6" ry="3.4" fill="#FFC2D9"/><path d="M92 20l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="#fff" stroke="#091540" stroke-width="2" stroke-linejoin="round"/></svg>`,
};
const ICON_MAIL = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>';
const ICON_HEART = '<svg viewBox="0 0 120 108"><path d="M60 100C20 72 10 48 22 30c11-14 30-9 38 6 8-15 27-20 38-6 12 18 2 42-38 70z" fill="#FFC2D9" stroke="#091540" stroke-width="5" stroke-linejoin="round"/></svg>';

/* illustrated placeholders for the sample memories */
function art(kind) {
  const sc = {
    beach: ['#7692FF', '#ABD2FA', '<circle cx="150" cy="64" r="22" fill="#FFE08A"/><path d="M0 160 Q50 140 100 160 T200 160 V200 H0Z" fill="#1B2CC1"/><path d="M0 182 Q50 168 100 182 T200 182 V200 H0Z" fill="#fff" opacity=".6"/>'],
    flowers: ['#FFC2D9', '#FFE08A', '<g stroke="#2e8b6b" stroke-width="4"><path d="M60 200V120M100 200V90M140 200V125"/></g><g fill="#fff"><circle cx="60" cy="115" r="14"/><circle cx="100" cy="85" r="17"/><circle cx="140" cy="120" r="14"/></g><g fill="#FFCBA8"><circle cx="60" cy="115" r="6"/><circle cx="100" cy="85" r="7"/><circle cx="140" cy="120" r="6"/></g>'],
    city: ['#1B2CC1', '#ABD2FA', '<g fill="#091540"><rect x="15" y="110" width="35" height="90"/><rect x="55" y="80" width="40" height="120"/><rect x="100" y="120" width="30" height="80"/><rect x="135" y="95" width="45" height="105"/></g><g fill="#FFE08A"><rect x="64" y="92" width="5" height="5"/><rect x="78" y="108" width="5" height="5"/><rect x="146" y="110" width="5" height="5"/></g>'],
    tea: ['#B5EBD3', '#ABD2FA', '<ellipse cx="100" cy="150" rx="55" ry="11" fill="#7692FF"/><path d="M55 100h90v30a45 40 0 0 1-90 0z" fill="#fff"/><path d="M145 108q28 2 22 22t-24 18" fill="none" stroke="#fff" stroke-width="6"/><path d="M85 82q-8-14 2-24M110 82q-8-14 2-24" stroke="#fff" stroke-width="3" fill="none"/>'],
    song: ['#D2C6FF', '#ABD2FA', '<circle cx="100" cy="100" r="64" fill="#091540"/><circle cx="100" cy="100" r="44" fill="none" stroke="#1B2CC1" stroke-width="3"/><circle cx="100" cy="100" r="22" fill="#FFC2D9"/><circle cx="100" cy="100" r="4" fill="#091540"/>'],
    window: ['#091540', '#7692FF', '<rect x="45" y="35" width="110" height="130" rx="6" fill="#0f1f8a" stroke="#fff" stroke-width="5"/><path d="M100 35V165M45 100H155" stroke="#fff" stroke-width="3"/><circle cx="125" cy="66" r="9" fill="#FFE08A"/>'],
  }[kind] || ['#091540', '#1B2CC1', ''];
  const [a, b, body] = sc;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/>${body}</svg>`);
}

/* ================= media storage (IndexedDB) ================= */
const IDB = {
  db: null, urls: {},
  open() { return new Promise(res => { try { const r = indexedDB.open('azure-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => { IDB.db = r.result; res(); }; r.onerror = () => res(); } catch (e) { res(); } }); },
  put(blob) {
    const id = 'b' + Date.now() + Math.random().toString(36).slice(2, 6); IDB.urls[id] = URL.createObjectURL(blob);
    return new Promise(res => { if (!IDB.db) return res(id); const q = IDB.db.transaction('m', 'readwrite').objectStore('m').put(blob, id); q.onsuccess = q.onerror = () => res(id); });
  },
  preload() {
    return new Promise(res => { if (!IDB.db) return res(); const q = IDB.db.transaction('m').objectStore('m').openCursor(); q.onsuccess = () => { const c = q.result; if (c) { IDB.urls[c.key] = URL.createObjectURL(c.value); c.continue(); } else res(); }; q.onerror = () => res(); });
  },
};
const mediaSrc = o => (o && (o.data || (o.mediaId && IDB.urls[o.mediaId]))) || '';
const blobToData = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
function shrink(file, max = 900) {
  return new Promise(res => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b.size > MAX_INLINE ? c.toBlob(b2 => res(b2), 'image/jpeg', .5) : res(b), 'image/jpeg', .74);
    };
    im.src = u;
  });
}
async function dataFor(o) { // small media travels inside the synced document; big files stay on this phone
  const src = mediaSrc(o); if (!src) return null;
  if (src.startsWith('data:')) return src.length < MAX_INLINE * 1.4 ? src : null;
  const b = await (await fetch(src)).blob(); return b.size <= MAX_INLINE ? blobToData(b) : null;
}

/* ================= state ================= */
function seedMem() {
  const d = (y, m, dd) => new Date(y, m, dd).getTime();
  return [
    { id: 'seed1', col: 'Our Adventures', mkind: 'photo', art: 'beach', cap: 'The day the waves took our shoes', t: d(2024, 5, 14), seed: 1 },
    { id: 'seed2', col: 'Our Stupid Moments 😂', mkind: 'photo', art: 'tea', cap: 'Tea, then the giggles, then more tea', t: d(2024, 10, 2), seed: 1 },
    { id: 'seed3', col: 'Letters', mkind: 'letter', letter: "I read your last message four times. You're a lot braver than you give yourself credit for, and I'm proud of you.\n\n— B", cap: 'A letter I never posted', t: d(2025, 1, 9), seed: 1 },
    { id: 'seed4', col: 'Our Songs', mkind: 'song', art: 'song', title: 'The song we both cried to', artist: '', cap: 'The song we both cried to', t: d(2025, 3, 21), seed: 1 },
    { id: 'seed5', col: 'Special Days', mkind: 'photo', art: 'flowers', cap: 'Your birthday, from far away', t: d(2025, 7, 30), seed: 1 },
    { id: 'seed6', col: 'Our Photos', mkind: 'photo', art: 'city', cap: 'Same sky, different cities', t: d(2025, 9, 12), seed: 1 },
  ];
}
const fresh = () => ({ role: null, friendName: '', code: '', joined: false, local: [], seen: {}, events: 0, entries: [], mine: [], settings: { sleepOn: true, sleepTime: '01:00', calm: false, theme: 'day', sleepSeen: '' }, opened: '' });
let S;
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); S.settings = Object.assign(fresh().settings, S.settings); } catch (e) { S = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full.'); } };
let dayOffset = 0, tab = 'world', newStar = false;

/* ================= sync: Firebase when configured, local demo otherwise ================= */
const Cloud = { db: null, items: [], unsub: null };
const items = () => (S.joined ? Cloud.items : S.local);
const connectedLive = () => S.joined;
const clean = o => JSON.parse(JSON.stringify(o));
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function cloudInit() {
  if (Cloud.db) return;
  const v = '10.12.2', base = `https://www.gstatic.com/firebasejs/${v}/firebase-`;
  await loadScript(base + 'app-compat.js'); await loadScript(base + 'auth-compat.js'); await loadScript(base + 'firestore-compat.js');
  firebase.initializeApp(CFG); await firebase.auth().signInAnonymously(); Cloud.db = firebase.firestore();
}
const pairDoc = () => Cloud.db.collection('pairs').doc(S.code);
function cloudListen() {
  if (Cloud.unsub) Cloud.unsub();
  Cloud.unsub = pairDoc().collection('items').orderBy('t').limitToLast(300).onSnapshot(
    snap => { Cloud.items = snap.docs.map(d => d.data()); onItems(); },
    () => toast("Can't reach the cloud right now."));
}
async function push(item) {
  item.t = item.t || Date.now(); item = clean(item);
  if (S.joined) { try { await pairDoc().collection('items').doc(item.id).set(item); } catch (e) { toast('Could not send. Check your connection.'); } }
  else { S.local = S.local.filter(x => x.id !== item.id).concat(item); save(); onItems(); }
}
async function dropItem(id) {
  if (S.joined) { try { await pairDoc().collection('items').doc(id).delete(); } catch (e) {} }
  else { S.local = S.local.filter(x => x.id !== id); save(); }
}
function genCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 8; i++) c += a[(Math.random() * a.length) | 0]; return c; }
async function createSpace() {
  try { await cloudInit(); S.code = genCode(); await pairDoc().set({ created: Date.now() }); S.joined = true; S.seen = {}; save(); cloudListen(); return true; }
  catch (e) { toast("Couldn't set it up. Check SETUP.md and your connection."); return false; }
}
async function joinSpace(code) {
  try { await cloudInit(); S.code = code.trim().toUpperCase(); const d = await pairDoc().get(); if (!d.exists) { toast("That code doesn't match anything."); return false; } S.joined = true; S.seen = {}; save(); cloudListen(); return true; }
  catch (e) { toast("Couldn't connect. Check your connection."); return false; }
}
function checkIncoming() {
  const me = S.role, last = S.seen[me] || 0, inc = items().filter(i => i.from !== me && i.t > last && i.kind !== 'hug' || (i.kind === 'hug' && me === 'piyu' && i.t > last));
  if (!inc.length) return;
  if (!S.seen[me]) { S.seen[me] = Math.max(...inc.map(i => i.t)); save(); return; } // first sync: stay quiet
  S.seen[me] = Math.max(...inc.map(i => i.t)); save();
  inc.forEach(i => {
    const m = i.kind === 'surprise' ? ['A little something for you', 'Open it whenever you like.']
      : i.kind === 'hug' ? [(S.friendName || 'They') + ' is here', 'They saw your little window.']
      : i.kind === 'need' ? ['Piyu opened a little window for you. 🫂', i.what || '']
      : i.kind === 'entry' ? ['Piyu shared something with you', '“I want you to see this.”']
      : i.kind === 'memory' ? ['A new memory in the vault', i.cap || ''] : null;
    if (m) { bridge('notify', m[0], m[1]); toast(m[0]); }
  });
}
function onItems() { checkIncoming(); if (!$('#sheet').classList.contains('on') && !$('#modal').classList.contains('on')) render(); }

/* ================= helpers ================= */
const them = () => S.friendName || 'your friend';
const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5) + dayOffset;
const timeStr = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dateStr = t => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
function dayLabel(t) { const k = dayKey(t); if (k === dayKey()) return 'Today'; if (k === dayKey(Date.now() - 864e5)) return 'Yesterday'; return new Date(t).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); }
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3000); }
function applyCalm() { document.body.classList.toggle('calm', !!S.settings.calm); }
function applyTheme() {
  const night = S.settings.theme === 'night';
  document.documentElement.dataset.theme = night ? 'night' : 'day';
  bridge('setBars', night ? '#060d2c' : '#7692FF', night ? '#091540' : '#EEF6FE', !night);
}
function greeting() { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Morning, sunshine.' : h >= 12 && h < 17 ? 'Hey, you.' : h >= 17 && h < 22 ? 'Good evening.' : 'Still up? 🌙'; }
const hrsLeft = ms => { const m = Math.max(1, Math.round(ms / 6e4)); return `${Math.floor(m / 60)}h ${m % 60}m left`; };
function openLink(u) { if (!u) return; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; if (window.Android && Android.openLink) Android.openLink(u); else window.open(u, '_blank'); }
window.openLink = openLink;
function starPos(i) {
  const pts = [[40, 190], [75, 150], [60, 105], [105, 80], [150, 105], [190, 70], [230, 95], [250, 150], [215, 185], [165, 200], [120, 170], [100, 215], [140, 140], [270, 60], [20, 70], [185, 130]];
  if (i < pts.length) return { x: pts[i][0], y: pts[i][1], r: 1.2 + (i % 3) * .45 };
  const n = i - pts.length, a = n * 2.399963, rad = 30 + Math.sqrt(n) * 17;
  return { x: Math.round(150 + Math.cos(a) * rad * 1.45), y: Math.round(135 + Math.sin(a) * rad * .95), r: 1.3 + (n % 4) * .4 };
}
const starCount = () => 14 + S.events + items().length;
const addEvent = () => { S.events++; newStar = true; };

/* ================= sky ================= */
function buildSky() {
  document.querySelectorAll('canvas.stars').forEach(paintStars);
  let h = ''; for (let i = 0; i < 16; i++) h += `<span class="twinkle" style="left:${rnd() * 100}%;top:${rnd() * 60}%;width:${1.3 + rnd() * 1.3}px;height:${1.3 + rnd() * 1.3}px;--d:${4 + rnd() * 6}s;--dl:-${rnd() * 8}s"></span>`;
  h += `<div class="sky-moon">${moonHTML()}</div>`;
  [[8, 130, 1], [30, 150, 1.25], [56, 120, .9], [74, 170, 1.1]].forEach(([top, t, sc], i) => h += `<div class="cloud fog" style="top:${top}%;--t:${t}s;--dl:-${i * 45}s;transform:scale(${sc})"></div>`);
  $('#sky').insertAdjacentHTML('beforeend', h);
  document.querySelectorAll('.sleep-moon,.splash-moon').forEach(e => e.innerHTML = moonHTML());
}

/* ================= surprises ================= */
const SAMPLES = [
  { type: 'message', tag: 'A message', text: 'I hope today is gentle with you.\nRemember, someone is always cheering for you.' },
  { type: 'song', tag: 'A song', title: 'Blue Hour', artist: 'I kept thinking of you while this played', text: 'No reason. It just sounded like you.' },
  { type: 'photo', tag: 'A photo', art: 'window', cap: 'the sky outside my window', text: 'Same moon, different window.' },
  { type: 'voice', tag: 'A voice note', sample: 1, text: 'Press play when you feel like hearing me.' },
  { type: 'photo', tag: 'A card', art: 'flowers', cap: 'for no reason', text: "You're allowed to take your time." },
  { type: 'message', tag: 'A letter', text: "You don't have to be okay all the time.\nI like you on the loud days and on the quiet ones." },
];
const TAGS = { message: 'A message', photo: 'A photo', song: 'A song', voice: 'A voice note' };
function todaysSurprise() {
  const live = items().filter(i => i.kind === 'surprise');
  if (S.joined || live.length) { // real gifts: only the latest one from the last 24 hours
    const i = live[live.length - 1]; if (!i || Date.now() - i.t > 864e5) return { none: true };
    return { ...i, tag: TAGS[i.type] || 'A little something', left: i.t + 864e5 - Date.now() };
  }
  const s = SAMPLES[((dayNum() % SAMPLES.length) + SAMPLES.length) % SAMPLES.length];
  const n = new Date(), e = new Date(n); e.setHours(24, 0, 0, 0);
  return { ...s, id: 'sample' + dayNum(), left: dayOffset ? 0 : e - n, sample: s.sample || 1 };
}
const WAVE = Array.from({ length: 36 }, (_, i) => 8 + Math.abs(Math.sin(i * 1.7) * 30) + (i % 5) * 2);
let playing = false;
const waveHTML = () => `<div class="wave ${playing ? 'play' : ''}">${WAVE.map((h, i) => `<i style="--h:${h}px;--i:${i}"></i>`).join('')}</div>`;
function songBlock(o) {
  const file = mediaSrc(o);
  return `<div class="disc ${playing ? 'spin' : ''}"><img src="${art('song')}" alt=""></div><div class="hand" style="font-size:30px;font-weight:600">${esc(o.title || 'A song')}</div>${o.artist ? `<div class="sub" style="margin-top:0">${esc(o.artist)}</div>` : ''}
   ${file ? `<audio controls src="${file}"></audio>` : o.link ? `<button class="pill" style="margin-top:12px" onclick="openLink(this.dataset.u)" data-u="${esc(o.link)}">Open the song</button>` : o.sample || o.seed ? `${waveHTML()}<button class="pill" onclick="togglePlay()">${playing ? 'Pause' : 'Listen'}</button>` : ''}`;
}
function surpriseBody(s) {
  let m = '';
  if (s.type === 'song') m = songBlock(s);
  else if (s.type === 'voice') m = s.data ? `<audio controls src="${s.data}" style="margin-top:14px"></audio>` : `${waveHTML()}<button class="pill" onclick="togglePlay()">${playing ? 'Pause' : 'Play'}</button>`;
  else if (s.type === 'photo') m = `<div style="width:78%;margin:16px auto 4px;transform:rotate(-1.5deg)"><div class="polaroid"><img src="${s.data || art(s.art)}" alt=""><div class="cap">${esc(s.cap || '')}</div></div></div>`;
  return `${m}${s.text ? `<div class="letter">${esc(s.text)}</div>` : ''}<div class="signed">${esc(S.friendName ? 'from ' + S.friendName : 'with love')}</div>`;
}
window.togglePlay = () => { playing = !playing; renderWorld(); };

function renderWorld() {
  if (S.role === 'friend') return renderFriendHome();
  const s = todaysSurprise(), F = S.friendName || 'someone who loves you';
  let card;
  if (s.none) card = `<div class="card gift paper-in"><div class="mascot">${STICKERS.cloud}</div><div class="hand" style="font-size:30px;font-weight:600;margin-top:10px">Nothing new today</div><div class="sub">Quiet days are fine too. A new one will show up when it's ready.</div></div>`;
  else if (S.opened !== s.id) card = `<div class="card gift closed paper-in" onclick="openGift('${s.id}')"><div class="mascot">${STICKERS.cloud}</div><div class="seal">${ICON_MAIL}</div><div class="hand" style="font-size:31px;font-weight:600">Something's waiting for you</div><div class="sub">Open it whenever you like.</div></div>`;
  else card = `<div class="card gift fade-in"><div class="mascot">${STICKERS.cloud}</div><div class="tag">${s.tag}</div>${surpriseBody(s)}<div class="here">This little moment is here for today.${s.left ? ' ' + hrsLeft(s.left) + '.' : ''}<br>Tomorrow there'll be a new one.</div></div>`;
  $('#s-world').innerHTML = `
    <div class="world-head"><div class="blob" style="width:160px;height:120px;left:-30px;top:-10px"></div><div class="title">Piyu's World</div><div class="hello">${greeting()}</div></div>
    <div class="gift-label">A little something from ${esc(F)}</div>
    ${card}
    <button class="need" onclick="openNeed()">${ICON_HEART}<span>I NEED YOU<small>${S.friendName ? esc(S.friendName) + ' gets' : 'They get'} a quiet nudge. Nothing else.</small></span></button>`;
}
window.openGift = id => { S.opened = id; addEvent(); save(); renderWorld(); };

/* ---------- I NEED YOU ---------- */
const NEEDS = [['🫂', 'I need a hug', '#FFC2D9'], ['💬', 'I want to talk', '#ABD2FA'], ['😂', 'Distract me', '#FFE08A'], ['🎨', 'Make something with me', '#B5EBD3'], ['🤐', 'Just stay with me', '#D2C6FF'], ['❤️', "I just need to know you're there", '#FFCBA8']];
window.openNeed = () => openSheet(`<div class="sheet-t">What would help right now?</div><p class="sub" style="margin:0 0 6px">Only this goes out. Your diary stays yours.</p>
  ${NEEDS.map(([e, t, c], i) => `<button class="opt" style="--c:${c}" onclick="sendNeed(${i})"><i>${e}</i><span>${t}</span></button>`).join('')}
  <button class="opt" style="--c:var(--card-2);color:var(--text)" onclick="sendNeed(-1)"><i>🪟</i><span>I don't know. Just let them know.</span></button>`);
window.sendNeed = async i => {
  const o = NEEDS[i]; closeSheet();
  await push({ id: 'n' + Date.now(), kind: 'need', from: 'piyu', what: o ? o[1] : '', text: 'Piyu opened a little window for you. 🫂' });
  addEvent(); save();
  $('#modal').innerHTML = `<button class="x" onclick="closeModal()">✕</button><div style="text-align:center;margin-top:16vh"><div style="width:130px;margin:0 auto">${STICKERS.heart}</div><div class="sheet-t" style="font-size:46px;margin-top:8px">They know.</div><p class="sub" style="font-size:16px;margin-top:12px">${o ? 'You said: ' + o[1].toLowerCase() + '.<br>' : ''}You don't have to explain anything.</p><br><button class="soft-btn" onclick="closeModal()">Okay</button></div>`;
  $('#modal').classList.add('on');
};

/* ---------- sheets ---------- */
function openSheet(h) { $('#sheet').innerHTML = `<div class="grab"></div>` + h; $('#sheet').scrollTop = 0; $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); }
function closeSheet() { $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); stopRec(); }
window.closeModal = () => { $('#modal').classList.remove('on'); render(); };
$('#scrim').onclick = closeSheet;
let C = null;

/* ---------- shared bits for composing ---------- */
const SONG_FIELDS = o => `<input class="field" placeholder="Song title" value="${esc(o.title || '')}" oninput="C.title=this.value"><input class="field" placeholder="Artist (optional)" value="${esc(o.artist || '')}" oninput="C.artist=this.value"><input class="field" placeholder="Paste a Spotify / YouTube / Apple Music link" value="${esc(o.link || '')}" oninput="C.link=this.value"><button class="soft-btn ghost" style="width:100%;margin-top:12px" onclick="pickSong()">Or pick an audio file from this phone</button>${o.fileName ? `<div class="file-chip">♪ ${esc(o.fileName)}</div><p class="note">Files stay on this phone. A link is what travels to the other person.</p>` : ''}`;
window.pickSong = async () => { const f = await pickFile('audio/*'); if (!f) return; C.blob = f; C.fileName = f.name; if (!C.title) C.title = f.name.replace(/\.[^.]+$/, ''); redraw(); };
window.pickPhoto = async () => { const f = await pickFile('image/*'); if (!f) return; C.blob = await shrink(f); C.preview = URL.createObjectURL(C.blob); redraw(); };
let redraw = () => {};
let rec, recStream;
window.toggleRec = async () => {
  if (C.rec) return stopRec();
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = []; rec = new MediaRecorder(recStream);
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => { C.blob = new Blob(chunks, { type: rec.mimeType }); C.preview = URL.createObjectURL(C.blob); C.rec = false; if ($('#sheet').classList.contains('on')) redraw(); };
    rec.start(); C.rec = true; setTimeout(() => C && C.rec && stopRec(), 45000); redraw();
  } catch (e) { toast("Can't reach the microphone right now."); }
};
function stopRec() { try { if (rec && rec.state === 'recording') rec.stop(); if (recStream) recStream.getTracks().forEach(t => t.stop()); } catch (e) {} recStream = null; }
const voiceBlock = () => `<button class="rec ${C.rec ? 'live' : ''}" onclick="toggleRec()">${C.rec ? 'STOP' : 'RECORD'}</button><p class="note" style="text-align:center">${C.rec ? 'Listening. Tap to stop.' : C.blob ? 'Got it. Tap to record again.' : 'Tap and say it out loud.'}</p>${C.blob && !C.rec ? `<audio controls src="${C.preview}"></audio>` : ''}`;
const photoBlock = () => `<button class="soft-btn ghost" style="width:100%;margin-top:12px" onclick="pickPhoto()">${C.blob ? 'Choose a different photo' : 'Choose a photo'}</button>${C.preview ? `<img src="${C.preview}" style="width:100%;border-radius:14px;margin-top:10px">` : ''}`;
const typeChips = (types, cur, fn) => `<div class="row" style="margin-top:6px">${types.map(([k, l]) => `<button class="chip ${cur === k ? 'on' : ''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;

/* ================= My Space (diary) ================= */
const TYPES = [['text', '✏️ Write'], ['doodle', '🎨 Doodle'], ['photo', '📷 Photo'], ['voice', '🎤 Voice'], ['song', '🎵 Song']];
function renderSpace() {
  const list = S.entries.slice().sort((a, b) => b.t - a.t);
  let last = '', h = `<div class="title">My Little Space</div><div class="hello">Just yours.</div><p class="sub">Everything here is private until you decide to share it.</p>`;
  if (!list.length) h += `<div class="empty" style="margin-top:50px">${STICKERS.moon}Nothing here yet.<br>Write, draw, talk, add a song.</div>`;
  else {
    h += `<div class="timeline">`;
    list.forEach(e => {
      const dl = dayLabel(e.t); if (dl !== last) { h += `</div><div class="day">${dl}</div><div class="timeline">`; last = dl; }
      const mo = moodOf(e.mood), src = mediaSrc(e);
      const media = e.type === 'doodle' || e.type === 'photo' ? `<img class="media" src="${src}" alt="">` : e.type === 'voice' ? `<audio controls src="${src}"></audio>` : e.type === 'song' ? `<div style="text-align:center">${songBlock(e)}</div>` : '';
      h += `<div class="entry paper-in" style="--mc:${mo[2]}"><div class="when"><span>${timeStr(e.t)}<span class="moodtag">${mo[1]} ${esc(e.mood)}</span></span><button class="badge ${e.shared ? 'sh' : ''}" onclick="editShare('${e.id}')">${e.shared ? '💌 Shared' : '🔒 Only me'}</button></div>${e.text ? `<div class="txt">${esc(e.text)}</div>` : ''}${media}${e.shared && e.noReply ? '<div class="note">No reply needed.</div>' : ''}</div>`;
    });
    h += `</div>`;
  }
  $('#s-space').innerHTML = h + '<div style="height:70px"></div>';
}
window.newEntry = () => { C = { kind: 'entry', type: 'text', mood: 'calm', shared: false, noReply: false, text: '', blob: null }; redraw = sheetEntry; sheetEntry(); };
function privacyBlock(o, fn, who) {
  return `<div class="priv"><button class="${o.shared ? '' : 'on'}" onclick="${fn}(false)">🔒 Private<br><small>only me</small></button><button class="${o.shared ? 'on' : ''}" onclick="${fn}(true)">💌 Share<br><small>with ${esc(S.friendName || 'my friend')}</small></button></div>
  ${o.shared ? `<p class="note">They'll see: “I want you to see this.”</p><label class="check"><input type="checkbox" ${o.noReply ? 'checked' : ''} onchange="${who}.noReply=this.checked"> No reply needed</label>` : `<p class="note">Stays on this phone. Nobody else sees it.</p>`}`;
}
function sheetEntry() {
  const body = {
    text: `<textarea class="field" placeholder="What's going on?" oninput="C.text=this.value">${esc(C.text)}</textarea>`,
    doodle: `<canvas class="doodle" id="cv"></canvas><div class="row"><button class="chip" onclick="clearCv()">Clear</button></div><textarea class="field" style="min-height:60px;font-size:22px" placeholder="A few words (optional)" oninput="C.text=this.value">${esc(C.text)}</textarea>`,
    photo: `${photoBlock()}<textarea class="field" style="min-height:60px;font-size:22px" placeholder="A caption (optional)" oninput="C.text=this.value">${esc(C.text)}</textarea>`,
    voice: voiceBlock(),
    song: SONG_FIELDS(C),
  }[C.type];
  openSheet(`<div class="sheet-t">New entry</div>${typeChips(TYPES, C.type, 'setType')}${body}
   <p class="note" style="margin-top:16px">How are you feeling?</p>
   <div class="row" style="margin-top:6px">${MOODS.map(m => `<button class="chip ${C.mood === m[0] ? 'on' : ''}" style="--c:${m[2]}" onclick="C.mood='${m[0]}';keepSheet()">${m[1]} ${m[0]}</button>`).join('')}</div>
   ${privacyBlock(C, 'setPriv', 'C')}
   <div style="text-align:center;margin-top:22px"><button class="soft-btn" onclick="saveEntry()">Save</button></div>`);
  if (C.type === 'doodle') initCanvas();
}
const grabDoodle = () => { const cv = $('#cv'); if (cv && C && C.type === 'doodle') { C.doodleDirty && cv.toBlob(b => { C.blob = b; C.preview = URL.createObjectURL(b); }, 'image/jpeg', .85); } };
window.keepSheet = () => { sheetEntry(); };
window.setType = t => { stopRec(); if (C.type !== t) { C.blob = null; C.preview = null; C.fileName = ''; } C.type = t; sheetEntry(); };
window.setPriv = v => { C.shared = v; if (!v) C.noReply = false; sheetEntry(); };
let cvx;
function initCanvas() {
  const cv = $('#cv'), r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; cvx = cv.getContext('2d');
  cvx.lineCap = cvx.lineJoin = 'round'; cvx.lineWidth = 4; cvx.strokeStyle = '#1B2CC1'; cvx.fillStyle = '#fff'; cvx.fillRect(0, 0, cv.width, cv.height);
  if (C.preview && C.blob) { const im = new Image(); im.onload = () => cvx.drawImage(im, 0, 0, cv.width, cv.height); im.src = C.preview; }
  let d = false; const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * 2, (e.clientY - b.top) * 2]; };
  cv.onpointerdown = e => { d = true; cv.setPointerCapture(e.pointerId); cvx.beginPath(); const [x, y] = pt(e); cvx.moveTo(x, y); cvx.lineTo(x + .1, y); cvx.stroke(); };
  cv.onpointermove = e => { if (!d) return; const [x, y] = pt(e); cvx.lineTo(x, y); cvx.stroke(); };
  cv.onpointerup = () => { d = false; C.doodleDirty = true; cv.toBlob(b => { C.blob = b; C.preview = URL.createObjectURL(b); }, 'image/jpeg', .85); };
}
window.clearCv = () => { C.blob = null; C.preview = null; initCanvas(); };
window.saveEntry = async () => {
  if (C.rec) return toast('Finish the recording first.');
  const hasMedia = !!C.blob, hasSong = C.type === 'song' && (C.title || C.link || C.blob);
  if (!C.text.trim() && !hasMedia && !hasSong) return toast('Add something first.');
  const e = { id: 'e' + Date.now(), t: Date.now(), mood: C.mood, type: C.type, text: C.text.trim(), shared: C.shared, noReply: C.noReply };
  if (C.type === 'song') { e.title = C.title; e.artist = C.artist; e.link = C.link; }
  if (C.blob) { e.mediaId = await IDB.put(C.blob); e.mtype = C.type === 'voice' || C.type === 'song' ? 'audio' : 'image'; }
  S.entries.push(e); addEvent(); save(); closeSheet();
  if (e.shared) await shareEntry(e);
  render(); toast(e.shared ? 'Saved, and sent.' : 'Saved. Only you can see it.');
};
async function shareEntry(e) {
  const data = e.type === 'song' && e.link ? null : await dataFor(e);
  if (e.mediaId && !data && !(e.type === 'song' && e.link)) toast('The words were sent. The file is too big to travel.');
  await push(clean({ id: e.id, kind: 'entry', from: 'piyu', t: e.t, text: e.text, mood: e.mood, type: e.type, noReply: e.noReply, data, title: e.title, artist: e.artist, link: e.link }));
}
let SH = null;
window.editShare = id => { const e = S.entries.find(x => x.id === id); SH = { id, shared: e.shared, noReply: e.noReply }; sheetShare(); };
function sheetShare() { openSheet(`<div class="sheet-t">Who can see this?</div>${privacyBlock(SH, 'setShare', 'SH')}<div style="text-align:center;margin-top:22px"><button class="soft-btn" onclick="applyShare()">Done</button></div>`); }
window.setShare = v => { SH.shared = v; if (!v) SH.noReply = false; sheetShare(); };
window.applyShare = async () => {
  const e = S.entries.find(x => x.id === SH.id), was = e.shared; e.shared = SH.shared; e.noReply = SH.noReply; save(); closeSheet();
  if (e.shared) await shareEntry(e); else if (was) await dropItem(e.id);
  render(); toast(e.shared ? 'Shared.' : 'Private again.');
};

/* ================= Us ================= */
function constellationHTML() {
  const n = starCount(); let lines = '', dots = '';
  for (let i = 0; i < n; i++) {
    const a = starPos(i);
    if (i) { const p = starPos(i - 1); lines += `<line x1="${p.x}" y1="${p.y}" x2="${a.x}" y2="${a.y}"/>`; }
    if (i > 2 && i % 3 === 0) { const p = starPos(i - 3); lines += `<line x1="${p.x}" y1="${p.y}" x2="${a.x}" y2="${a.y}"/>`; }
    dots += `<circle cx="${a.x}" cy="${a.y}" r="${a.r * 4.5}" fill="url(#sg)"/><circle class="cstar" cx="${a.x}" cy="${a.y}" r="${a.r}" fill="${i % 7 === 3 ? '#FFE08A' : '#fff'}" style="--d:${4 + (i % 5)}s;--dl:-${i % 7}s"/>`;
  }
  newStar = false;
  return `<div class="card const"><svg viewBox="0 0 300 260"><defs><radialGradient id="sg"><stop offset="0" stop-color="#ABD2FA" stop-opacity=".5"/><stop offset="1" stop-color="#ABD2FA" stop-opacity="0"/></radialGradient></defs><g stroke="#ABD2FA" stroke-width=".7" opacity=".6">${lines}</g>${dots}</svg><div class="cap">${n} stars</div></div>
  <p class="note" style="text-align:center">Shared entries, surprises, windows and memories each add a star. There's no streak to keep up.</p>`;
}
const bubble = (i, c, who) => {
  const src = mediaSrc(i);
  const body = i.kind === 'need' ? `<div class="hand">${esc(i.text)}</div>${i.what ? `<small>${esc(i.what)}</small>` : ''}`
    : i.kind === 'hug' ? `<div class="hand">${esc(who)} is here.</div>`
    : `<small style="margin:0 0 4px">“I want you to see this.”${i.noReply ? ' No reply needed.' : ''}</small>${i.text ? `<div class="hand">${esc(i.text)}</div>` : ''}${i.type === 'doodle' || i.type === 'photo' ? `<img src="${src}">` : ''}${i.type === 'voice' ? `<audio controls src="${src}"></audio>` : ''}${i.type === 'song' ? `<div style="text-align:center">${songBlock(i)}</div>` : ''}`;
  return `<div class="card bnote" style="--c:${c}">${body}<small>${dayLabel(i.t)}, ${timeStr(i.t)}</small></div>`;
};
function renderUs() {
  const mine = items().filter(i => i.from === 'piyu' && (i.kind === 'need' || i.kind === 'entry')).slice().reverse();
  const hugs = items().filter(i => i.kind === 'hug').slice().reverse();
  if (S.role === 'friend') {
    $('#s-us').innerHTML = `<div class="title">Us</div><div class="hello">Our little universe is growing.</div>${constellationHTML()}
     <div class="sec">From Piyu</div>
     ${mine.map(i => bubble(i, i.kind === 'need' ? '#FFC2D9' : '#D2C6FF', 'Piyu') + (i.kind === 'need' ? `<button class="chip" style="margin-top:8px;--c:var(--mint)" onclick="imHere()">I'm here</button>` : !i.noReply ? `<button class="chip" style="margin-top:8px;--c:var(--pink)" onclick="imHere()">💙 Send a hug back</button>` : '')).join('') || `<div class="empty" style="font-size:24px">${STICKERS.cloud}Nothing yet. When Piyu reaches out, it shows up here.</div>`}`;
    return;
  }
  const priv = S.entries.filter(e => !e.shared).length;
  $('#s-us').innerHTML = `<div class="title">Us</div><div class="hello">Our little universe is growing.</div>${constellationHTML()}
   ${hugs.length ? `<div class="sec">From ${esc(them())}</div>${hugs.slice(0, 2).map(i => bubble(i, '#B5EBD3', S.friendName || 'They')).join('')}` : ''}
   <div class="sec">What ${esc(S.friendName || 'they')} can see</div>
   ${mine.map(i => bubble(i, i.kind === 'need' ? '#FFC2D9' : '#D2C6FF', 'Piyu')).join('') || '<p class="note" style="margin:6px 2px">Nothing yet. Only what you choose to send shows up.</p>'}
   <p class="note" style="margin:16px 2px">${priv} private ${priv === 1 ? 'entry' : 'entries'}, only on your phone.</p>`;
}
window.imHere = async () => { await push({ id: 'h' + Date.now(), kind: 'hug', from: 'friend' }); addEvent(); save(); toast('Sent.'); render(); };

/* ================= friend's home: send a surprise ================= */
const SEND_TYPES = [['message', '💌 Message'], ['photo', '📷 Photo'], ['song', '🎵 Song'], ['voice', '🎤 Voice']];
let FC = { type: 'message', text: '' };
function renderFriendHome() {
  const needs = items().filter(i => i.kind === 'need').slice().reverse(), hugs = items().filter(i => i.kind === 'hug');
  const n = needs[0], answered = n && hugs.some(h => h.t > n.t), fresh = n && Date.now() - n.t < 864e5;
  const sent = items().filter(i => i.kind === 'surprise').slice().reverse().slice(0, 4);
  $('#s-world').innerHTML = `
   <div class="world-head"><div class="blob" style="width:160px;height:120px;left:-30px;top:-10px"></div><div class="title">For Piyu</div><div class="hello">Send a little happiness.</div></div>
   ${fresh && !answered ? `<div class="card bnote" style="--c:#FFC2D9;margin-top:18px"><div class="hand">Piyu opened a little window for you. 🫂</div>${n.what ? `<small>${esc(n.what)}</small>` : ''}<button class="soft-btn" style="margin-top:12px;padding:10px 22px" onclick="imHere()">I'm here</button></div>` : ''}
   <div class="gift-label">Today's surprise</div>
   <div class="card gift" style="text-align:left"><div class="mascot">${STICKERS.star}</div>${typeChips(SEND_TYPES, FC.type, 'setSend')}
     ${FC.type === 'photo' || FC.type === 'voice' || FC.type === 'song' ? '<div id="fc-media"></div>' : ''}
     <textarea class="field" style="min-height:90px" placeholder="${FC.type === 'message' ? 'Write something kind…' : 'Add a few words (optional)'}" oninput="FC.text=this.value">${esc(FC.text)}</textarea>
     <p class="note">It sits on Piyu's home screen for 24 hours, then it's gone and tomorrow's takes its place.</p>
     <div style="text-align:center;margin-top:14px"><button class="soft-btn" onclick="sendSurprise()">Send it</button></div></div>
   ${sent.length ? `<div class="sec">Sent</div>${sent.map(i => `<div class="card bnote" style="--c:#B5EBD3"><div class="hand">${esc(i.text || i.title || TAGS[i.type])}</div><small>${TAGS[i.type]} · ${Date.now() - i.t < 864e5 ? hrsLeft(i.t + 864e5 - Date.now()) + ' on their screen' : 'expired'}</small></div>`).join('')}` : ''}`;
  if (FC.type !== 'message') { C = FC; redraw = () => { renderFriendHome(); }; $('#fc-media').innerHTML = FC.type === 'photo' ? photoBlock() : FC.type === 'voice' ? voiceBlock() : SONG_FIELDS(FC); }
}
window.setSend = t => { stopRec(); FC = { type: t, text: FC.text }; renderFriendHome(); };
window.sendSurprise = async () => {
  if (FC.rec) return toast('Finish the recording first.');
  const it = { id: 's' + Date.now(), kind: 'surprise', from: 'friend', type: FC.type, text: (FC.text || '').trim() };
  if (FC.type === 'message' && !it.text) return toast('Write something first.');
  if (FC.type === 'photo' || FC.type === 'voice') { if (!FC.blob) return toast('Add something first.'); it.data = await blobToData(FC.blob); if (it.data.length > MAX_INLINE * 1.4) return toast('That one is too big. Try a shorter clip or smaller photo.'); it.cap = it.text; }
  if (FC.type === 'song') { if (!FC.title && !FC.link) return toast('Add a song title or a link.'); it.title = FC.title; it.artist = FC.artist; it.link = FC.link; if (FC.blob) toast('Audio files stay on this phone. Send a link so it can travel.'); }
  await push(it); addEvent(); FC = { type: 'message', text: '' }; save(); renderFriendHome(); toast('Sent. It will be on their screen for 24 hours.');
};

/* ================= Memories ================= */
let colSel = 'All';
function allMemories() {
  const shared = items().filter(i => i.kind === 'memory'), ids = new Set(shared.map(i => i.id));
  return seedMem().concat(S.mine.filter(m => !ids.has(m.id)), shared);
}
function memThumb(m) {
  if (m.mkind === 'letter') return `<div class="letterpaper">${esc(m.letter)}</div>`;
  if (m.mkind === 'song') return `<div class="songtile"><img src="${art('song')}" alt=""></div>`;
  return `<img src="${mediaSrc(m) || (m.art ? art(m.art) : '')}" alt="">`;
}
window.setCol = c => { colSel = c; renderMem(); };
function renderMem() {
  const list = allMemories().filter(m => colSel === 'All' || m.col === colSel).sort((a, b) => b.t - a.t);
  $('#s-mem').innerHTML = `<div class="title">Memory Vault</div><div class="hello">Things we keep.</div>
   <div class="row" style="flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:14px -22px 0;padding:2px 22px">${['All', ...COLLECTIONS].map((c, i) => `<button class="chip ${colSel === c ? 'on' : ''}" style="--c:${i ? COL_COLORS[i - 1] : 'var(--card-2)'}" data-i="${i}">${c}</button>`).join('')}</div>
   <div class="board">${list.map((m, i) => `<button class="mem paper-in" style="--r:${(i % 2 ? 2 : -2) + (i % 3) * .5}deg;--t:${7 + i % 4}s;--dl:-${i * 1.3}s;--tc:${COL_COLORS[Math.max(0, COLLECTIONS.indexOf(m.col))]}" data-id="${esc(m.id)}"><div class="polaroid">${memThumb(m)}<div class="cap">${esc(m.cap)}</div></div></button>`).join('')}</div>
   ${list.length ? '' : `<div class="empty">${STICKERS.star}Nothing in this one yet.</div>`}<div style="height:70px"></div>`;
  document.querySelectorAll('#s-mem .chip').forEach(b => b.onclick = () => setCol(['All', ...COLLECTIONS][b.dataset.i]));
  document.querySelectorAll('#s-mem .mem').forEach(b => b.onclick = () => openMem(b.dataset.id));
}
function openMem(id) {
  const m = allMemories().find(x => x.id === id); if (!m) return;
  const body = m.mkind === 'letter' ? `<div class="letterpaper" style="aspect-ratio:auto;font-size:24px;padding:18px;min-height:240px">${esc(m.letter)}</div>`
    : m.mkind === 'song' ? `<div style="text-align:center;padding:6px 0 10px">${songBlock(m)}</div>` : `<img src="${mediaSrc(m) || (m.art ? art(m.art) : '')}" alt="">`;
  $('#modal').innerHTML = `<button class="x" onclick="closeModal()">✕</button><div class="big-memory"><div class="sheet-t" style="text-align:center;font-size:42px;margin-top:22px">Remember this?</div>
   <div class="polaroid">${body}<div class="cap">${esc(m.cap)}</div></div></div>
   <div class="meta">${dateStr(m.t)} · ${esc(m.col)}${m.localOnly ? ' · only on this phone' : ''}</div>`;
  $('#modal').classList.add('on');
}
const MEM_TYPES = [['photo', '📷 Photo'], ['song', '🎵 Song'], ['letter', '💌 Letter']];
window.addMemory = () => { C = { kind: 'memory', type: 'photo', col: COLLECTIONS[0], cap: '', letter: '', blob: null }; redraw = sheetMemory; sheetMemory(); };
function sheetMemory() {
  const body = C.type === 'photo' ? photoBlock() : C.type === 'song' ? SONG_FIELDS(C) : `<textarea class="field" placeholder="Write it as a letter…" oninput="C.letter=this.value">${esc(C.letter)}</textarea>`;
  openSheet(`<div class="sheet-t">Keep a memory</div>${typeChips(MEM_TYPES, C.type, 'setMemType')}
   <div class="row">${COLLECTIONS.map((c, i) => `<button class="chip ${C.col === c ? 'on' : ''}" style="--c:${COL_COLORS[i]}" onclick="C.col=COLLECTIONS[${i}];sheetMemory()">${c}</button>`).join('')}</div>
   ${body}<input class="field" style="font-size:24px" placeholder="A caption" value="${esc(C.cap)}" oninput="C.cap=this.value">
   <div style="text-align:center;margin-top:22px"><button class="soft-btn" onclick="saveMemory()">Keep it</button></div>`);
}
window.setMemType = t => { if (C.type !== t) { C.blob = null; C.preview = null; C.fileName = ''; } C.type = t; sheetMemory(); };
window.saveMemory = async () => {
  const ok = C.type === 'photo' ? C.blob : C.type === 'song' ? (C.title || C.link || C.blob) : C.letter.trim();
  if (!ok) return toast('Add something first.');
  const m = { id: 'm' + Date.now(), kind: 'memory', from: S.role, t: Date.now(), col: C.col, mkind: C.type, cap: C.cap.trim() || C.title || 'Untitled', letter: C.letter.trim() || undefined, title: C.title, artist: C.artist, link: C.link };
  if (C.type === 'photo') m.data = await blobToData(C.blob);
  if (C.type === 'song' && C.blob) { // audio files are too big to sync; keep on this phone
    m.mediaId = await IDB.put(C.blob); m.localOnly = true; S.mine.push(clean(m)); addEvent(); save(); closeSheet(); render(); return toast('Kept on this phone. Add a link so the other person can listen too.');
  }
  closeSheet(); await push(m); addEvent(); save(); render(); toast('Added to the vault.');
};

/* ================= Settings & connecting ================= */
const row = (b, s, ctl) => `<div class="card set"><div><b>${b}</b><small>${s}</small></div>${ctl}</div>`;
const sw = (on, fn, label) => `<button class="sw ${on ? 'on' : ''}" onclick="${fn}" aria-label="${label}"></button>`;
function renderSet() {
  const s = S.settings, piyu = S.role !== 'friend';
  $('#s-set').innerHTML = `<div class="title">Settings</div><div class="hello">Your way.</div>
   ${row('Connection', S.joined ? `Connected. Space code <b>${esc(S.code)}</b>` : CFG ? 'Not connected yet.' : 'Demo mode on this phone.', `<button class="pill" onclick="connectSheet()">${S.joined ? 'Details' : 'Connect'}</button>`)}
   ${row('Night sky', 'Switch between the day and night look.', sw(s.theme === 'night', "S.settings.theme=S.settings.theme==='night'?'day':'night';applyTheme();save();renderSet()", 'Night sky'))}
   ${piyu ? `<div class="card set"><div><b>What do you call them?</b><small>Used instead of "your friend".</small></div></div><input class="field" style="margin-top:8px;font-size:22px" placeholder="Their name" value="${esc(S.friendName)}" onchange="S.friendName=this.value.trim();save();renderSet()">` : ''}
   ${piyu ? row('Goodnight reminder', 'A short note once a night.', sw(s.sleepOn, "setSleep('on')", 'Goodnight reminder')) + row('Reminder time', 'Set to 1:00 AM by default.', `<input type="time" value="${s.sleepTime}" onchange="setSleep('time',this.value)">`) + row('Preview it', 'See what it looks like.', `<button class="pill" onclick="showSleep()">Show</button>`) : ''}
   ${row('Reduce motion', "Stops drifting clouds and twinkling. Also follows your phone's setting.", sw(s.calm, "S.settings.calm=!S.settings.calm;applyCalm();save();renderSet()", 'Reduce motion'))}
   ${piyu && !S.joined ? row("Tomorrow's surprise", 'Preview, for testing.', sw(dayOffset, "dayOffset=dayOffset?0:1;renderSet();renderWorld()", 'Preview tomorrow')) : ''}
   ${!S.joined ? row('Demo: switch sides', `See the app as ${piyu ? 'the friend' : 'Piyu'} on this phone.`, `<button class="pill" onclick="switchRole()">Switch</button>`) : ''}`;
}
window.switchRole = () => { S.role = S.role === 'friend' ? 'piyu' : 'friend'; applyRole(); save(); go('world'); toast(S.role === 'friend' ? "Now you're the friend." : "Now you're Piyu."); };
window.setSleep = (k, v) => { if (k === 'on') S.settings.sleepOn = !S.settings.sleepOn; else S.settings.sleepTime = v || '01:00'; save(); syncSleep(); renderSet(); };
function syncSleep() { const [h, m] = S.settings.sleepTime.split(':').map(Number); bridge('scheduleSleep', !!S.settings.sleepOn && S.role !== 'friend', h, m); }
window.connectSheet = () => {
  if (S.joined) return openSheet(`<div class="sheet-t">You're connected</div><p class="sub">Share this code with the other person so they can join.</p><div class="code">${esc(S.code)}</div><div style="text-align:center;margin-top:18px"><button class="soft-btn" onclick="shareCode()">Share code</button></div>`);
  if (!CFG) return openSheet(`<div class="sheet-t">Linking two phones</div><p class="sub">Right now the app runs in demo mode: everything works on this one phone, and you can switch sides in Settings to try both views.</p><p class="sub">To connect two real phones, set up the free cloud once. The steps are in <b>SETUP.md</b> in the project folder (about 10 minutes).</p><div style="text-align:center;margin-top:16px"><button class="soft-btn" onclick="closeSheet()">Okay</button></div>`);
  if (S.role === 'friend') return openSheet(`<div class="sheet-t">Join Piyu's space</div><p class="sub">Type the code from Piyu's phone.</p><input class="field codein" id="cin" maxlength="8" placeholder="CODE"><div style="text-align:center;margin-top:18px"><button class="soft-btn" onclick="doJoin()">Connect</button></div>`);
  openSheet(`<div class="sheet-t">Make your space</div><p class="sub">This creates a private space for just the two of you. You'll get a code to give to your friend.</p><div style="text-align:center;margin-top:18px"><button class="soft-btn" onclick="doCreate()">Create it</button></div>`);
};
window.shareCode = () => { const t = "Join me on Azure Connect. Code: " + S.code; if (window.Android && Android.shareText) Android.shareText(t); else navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Copied.")); };
window.doCreate = async () => { if (await createSpace()) { closeSheet(); renderSet(); connectSheet(); } };
window.doJoin = async () => { if (await joinSpace($('#cin').value)) { closeSheet(); renderSet(); toast("You're connected."); render(); } };

/* ================= welcome ================= */
function showWelcome() {
  const w = $('#welcome'); w.classList.add('on');
  w.innerHTML = `<div class="sticker" style="width:120px">${STICKERS.cloud}</div><div class="big">Hi there.</div><p class="sub" style="font-size:16px;margin-top:10px">This is a small private space for two friends. Who's holding this phone?</p>
    <button class="opt" style="--c:#FFC2D9;margin-top:24px" onclick="pickRole('piyu')"><i>🌙</i><span>I'm Piyu</span></button>
    <button class="opt" style="--c:#B5EBD3" onclick="pickRole('friend')"><i>💌</i><span>I'm Piyu's friend</span></button>
    <button class="opt" style="--c:var(--card-2)" onclick="pickRole('piyu',true)"><i>👀</i><span>Just looking around</span></button>`;
}
window.pickRole = (r, demo) => { S.role = r; save(); applyRole(); $('#welcome').classList.remove('on'); go('world'); syncSleep(); if (!demo && CFG) setTimeout(connectSheet, 400); };
function applyRole() { $('#app').dataset.role = S.role || 'piyu'; $('#nav-world').textContent = S.role === 'friend' ? 'Send' : 'World'; }

/* ================= goodnight ================= */
window.showSleep = () => { const el = $('#sleep'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
$('#sleep-close').onclick = () => { $('#sleep').classList.remove('on'); S.settings.sleepSeen = dayKey(); save(); };
window.onNativeSleep = () => { if (S.role !== 'friend' && S.settings.sleepSeen !== dayKey()) showSleep(); };
setInterval(() => {
  const n = new Date(), hm = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  if (S.role !== 'friend' && S.settings.sleepOn && hm === S.settings.sleepTime && S.settings.sleepSeen !== dayKey()) { showSleep(); S.settings.sleepSeen = dayKey(); save(); }
  if (tab === 'world') renderWorldIfIdle();
}, 30000);
const renderWorldIfIdle = () => { if (!$('#sheet').classList.contains('on') && !$('#modal').classList.contains('on') && !FC.rec) { const a = document.activeElement; if (!(a && /TEXTAREA|INPUT/.test(a.tagName))) renderWorld(); } };

/* ================= navigation ================= */
const R = { world: renderWorld, space: renderSpace, us: renderUs, mem: renderMem, set: renderSet };
function render() { R[tab](); }
function go(t) {
  if (S.role === 'friend' && t === 'space') t = 'world';
  tab = t; closeSheet(); $('#app').dataset.tab = t;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + t));
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#fab').classList.toggle('on', t === 'space' || t === 'mem');
  $('#fab').onclick = t === 'mem' ? addMemory : newEntry;
  render(); $('#s-' + t).scrollTop = 0;
}
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => go(b.dataset.tab));
const fab = document.createElement('button'); fab.id = 'fab'; fab.className = 'fab'; fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'; fab.setAttribute('aria-label', 'Add'); $('#app').appendChild(fab);
window.onBack = () => {
  if ($('#sleep').classList.contains('on')) { $('#sleep-close').click(); return true; }
  if ($('#modal').classList.contains('on')) { closeModal(); return true; }
  if ($('#sheet').classList.contains('on')) { closeSheet(); return true; }
  if (tab !== 'world') { go('world'); return true; }
  return false;
};

/* ================= boot ================= */
(async function boot() {
  await IDB.open(); await IDB.preload();
  buildSky(); applyCalm(); applyTheme(); applyRole(); go('world'); syncSleep();
  if (S.joined && CFG) cloudInit().then(cloudListen).catch(() => toast("Can't reach the cloud right now."));
  const end = () => { $('#splash').classList.add('out'); if (!S.role) setTimeout(showWelcome, 700); };
  $('#splash').onclick = end; setTimeout(end, 5600);
})();
