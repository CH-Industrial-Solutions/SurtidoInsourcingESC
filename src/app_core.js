/* ===== QORVEX Surtido · Núcleo: carpeta, sesión, candado, datos ===== */
const VERSION = '1.6.0';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('es-MX');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const nowIso = () => { const d = new Date(); return QS.ymd(d) + ' ' + QS.hm(d) + ':' + QS.pad(d.getSeconds()); };
const SID = Math.random().toString(36).slice(2) + Date.now().toString(36);
const ROLES = { capturista: 'Capturista', supervisor: 'Supervisor', administrador: 'Administrador', montacarguista: 'Montacarguista' };
const DEMO = /[?&]demo=opfs/.test(location.search);

function toast(msg, err) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.className = err ? 'e' : ''; clearTimeout(toast._t); toast._t = setTimeout(() => t.remove(), err ? 6000 : 3200); }

/* ---------- IndexedDB (recordar carpeta) ---------- */
const IDB = {
  open() { return new Promise((res, rej) => { const r = indexedDB.open('qorvex-surtido', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k) { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); },
  async del(k) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
};

/* ---------- Carpeta (File System Access) ---------- */
const FS = {
  dir: null,
  async h(name, create) { const p = name.split('/'); let d = this.dir; for (let i = 0; i < p.length - 1; i++) d = await d.getDirectoryHandle(p[i], { create }); return d.getFileHandle(p[p.length - 1], { create }); },
  async file(name) { try { return await (await this.h(name, false)).getFile(); } catch (e) { if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return null; throw e; } },
  async read(name) { const f = await this.file(name); return f ? f.text() : null; },
  async json(name, def) { const t = await this.read(name); if (t == null || t.trim() === '') return def; try { return JSON.parse(t); } catch (e) { throw new Error('El archivo ' + name + ' está dañado: ' + e.message); } },
  async mod(name) { const f = await this.file(name); return f ? f.lastModified : 0; },
  async write(name, text) { const w = await (await this.h(name, true)).createWritable(); await w.write(text); await w.close(); },
  async writeBlob(name, blob) { const w = await (await this.h(name, true)).createWritable(); await w.write(blob); await w.close(); },
  async save(name, obj) { return this.write(name, JSON.stringify(obj)); },
  async append(name, text, header, handle) {
    const h = handle || await this.h(name, true), f = await h.getFile();
    const w = await h.createWritable({ keepExistingData: true });
    await w.seek(f.size); await w.write((f.size === 0 && header ? '﻿' + header + '\n' : '') + text); await w.close();
  },
  async vacia() { for await (const _ of this.dir.keys()) return false; return true; }
};

/* ---------- Estado ---------- */
const S = { logos: {}, user: null, edit: false, lock: null, config: null, usuarios: [], estado: null, inv: { ln: null, baan: null }, cat: null, seg: { tickets: [] }, corridas: [], claves: {}, mods: {}, tab: 'surtido' };
const FILES = { config: 'config.json', usuarios: 'usuarios.json', estado: 'estado.json', cat: 'catalogos.json', seg: 'seguimiento.json', corridas: 'corridas.json', claves: 'claves.json', invln: 'inventario_ln.json', invbaan: 'inventario_baan.json', lock: 'candado.json' };
const AUDIT = 'auditoria_cierres_cero.txt';
function configInicial() {
  return {
    version: VERSION, creado: nowIso(),
    turnos: [{ id: 'D', nombre: 'Día', inicio: '07:00', fin: '15:00' }, { id: 'T', nombre: 'Tarde', inicio: '15:00', fin: '22:30' }, { id: 'N', nombre: 'Noche', inicio: '22:30', fin: '07:00' }],
    grupos: { 'IP': 'IP', 'DCM': 'DCM', 'COOLING': 'COOLING', 'DEF-LN': 'DEF', 'DEF-BAAN': 'DEF', 'AFT-LN': 'AFT', 'AFT-BAAN': 'AFT' },
    grupoOrden: ['IP', 'DCM', 'COOLING', 'DEF', 'AFT'],
    metas: { cumplimiento: 90, ticketsHora: { D: 10, T: 10, N: 10 } },
    festivos: [], noLab: { semanal: { 0: ['D', 'T', 'N'], 6: ['N'] }, fechas: [] },
    notaDif: false, renglonesHoja: 25, formato: ''
  };
}
const turnoPorId = id => S.config.turnos.find(t => t.id === id) || { id, nombre: id, inicio: '00:00', fin: '00:00' };
const turnoActual = () => QS.turnoDe(new Date(), S.config.turnos);
const usuariosRol = (...r) => S.usuarios.filter(u => u.activo !== false && r.includes(u.rol));
const esSup = () => S.user && (S.user.rol === 'supervisor' || S.user.rol === 'administrador');
const esAdmin = () => S.user && S.user.rol === 'administrador';
const puedeEditar = () => S.edit && S.user && S.user.rol !== 'montacarguista';

const LOGO_EXT = ['png', 'jpg', 'jpeg', 'svg'];
async function leerLogo(k) { for (const e of LOGO_EXT) { const f = await FS.file('logo_' + k + '.' + e); if (f) return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(e === 'svg' ? new Blob([f], { type: 'image/svg+xml' }) : f); }); } return ''; }
async function cargarDatos() {
  S.config = Object.assign(configInicial(), await FS.json(FILES.config, {}));
  if (!S.config.hojaH) { S.config.renglonesHoja = 25; S.config.hojaH = true; } // hoja horizontal de 25 renglones
  S.logos = {}; for (const k of ['sese', 'international']) S.logos[k] = await leerLogo(k);
  S.usuarios = await FS.json(FILES.usuarios, []);
  S.estado = Object.assign({ folios: {}, foliosHoja: {}, foliosCorto: {}, corrida: 0 }, await FS.json(FILES.estado, {}));
  S.cat = Object.assign({ prio: SEED_PRIO, jaula: [], pallets: {}, info: {} }, await FS.json(FILES.cat, {}));
  S.seg = await FS.json(FILES.seg, { tickets: [] });
  S.corridas = await FS.json(FILES.corridas, []);
  S.claves = await FS.json(FILES.claves, {});
  for (const k of ['ln', 'baan']) {
    const j = await FS.json(FILES['inv' + k], null);
    S.inv[k] = j ? { ...j, rows: j.rows.map(r => ({ wh: r[0], item: r[1], loc: r[2], qty: r[3], desc: r[4] })) } : null;
  }
  await marcarMods();
}
const WATCH = ['config', 'usuarios', 'estado', 'cat', 'seg', 'corridas', 'invln', 'invbaan'];
async function marcarMods() { for (const k of WATCH) S.mods[k] = await FS.mod(FILES[k]); }
async function huboCambios() { for (const k of WATCH) if ((await FS.mod(FILES[k])) !== S.mods[k]) return true; return false; }
async function guardar(...keys) {
  if (!(await verificaCandado())) throw new Error('Perdiste el control de edición. Otro usuario lo tomó.');
  for (const k of keys) {
    if (k === 'invln' || k === 'invbaan') { const v = S.inv[k.slice(3)]; await FS.save(FILES[k], { ...v, rows: v.rows.map(r => [r.wh, r.item, r.loc, Math.round(r.qty * 1e4) / 1e4, r.desc]) }); }
    else await FS.save(FILES[k], S[k]);
    S.mods[k] = await FS.mod(FILES[k]);
  }
}
async function evento(tipo, detalle) {
  try { await FS.append('historial/eventos_' + QS.ymd(new Date()).slice(0, 7) + '.txt', [nowIso(), S.user ? S.user.usuario : '-', tipo, QS.san(detalle)].join('\t') + '\n', 'fecha\tusuario\tevento\tdetalle'); } catch (e) { console.warn(e); }
}

/* ---------- Contraseñas ---------- */
async function hash(salt, pass) {
  const data = new TextEncoder().encode(salt + '|' + pass);
  if (crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  let h = 5381; for (const c of data) h = ((h << 5) + h + c) >>> 0; return 'x' + h.toString(16);
}
async function crearUsuario({ nombre, usuario, pass, rol }) {
  usuario = QS.norm(usuario).toLowerCase(); nombre = QS.norm(nombre);
  if (!nombre || !usuario) throw new Error('Nombre y usuario son obligatorios.');
  if (S.usuarios.some(u => u.usuario === usuario)) throw new Error('Ese usuario ya existe.');
  if (rol !== 'montacarguista' && (!pass || pass.length < 4)) throw new Error('La contraseña debe tener al menos 4 caracteres.');
  const salt = Math.random().toString(36).slice(2);
  const u = { id: 'u' + Date.now().toString(36), nombre, usuario, salt, hash: pass ? await hash(salt, pass) : '', rol, activo: true, creado: nowIso() };
  S.usuarios.push(u); return u;
}

/* ---------- Candado de edición (un solo editor) ---------- */
const LOCK_MS = 45000;
async function leerCandado() { try { return await FS.json(FILES.lock, null); } catch (e) { return null; } }
const candadoVivo = l => l && l.sid && Date.now() - l.ts < LOCK_MS;
async function escribirCandado() { S.lock = { sid: SID, usuario: S.user.usuario, nombre: S.user.nombre, ts: Date.now() }; await FS.save(FILES.lock, S.lock); }
async function verificaCandado() { if (!S.edit) return false; const l = await leerCandado(); if (l && l.sid !== SID && candadoVivo(l)) { S.edit = false; S.lock = l; return false; } return true; }
async function tomarControl(forzar) {
  const l = await leerCandado();
  if (!forzar && candadoVivo(l) && l.sid !== SID) { S.edit = false; S.lock = l; return false; }
  await escribirCandado(); S.edit = true;
  if (forzar && l && l.sid !== SID && candadoVivo(l)) await evento('TOMA_CONTROL', 'Tomó el control que tenía ' + l.nombre);
  return true;
}
async function soltarControl() { if (S.edit) { try { await FS.save(FILES.lock, {}); } catch (e) { } } S.edit = false; }
let _tick = null, _beat = 0;
function iniciarLatido() {
  clearInterval(_tick);
  _tick = setInterval(async () => {
    if (!S.user || !FS.dir) return;
    try {
      const l = await leerCandado();
      if (S.edit) {
        if (l && l.sid && l.sid !== SID && candadoVivo(l)) { S.edit = false; S.lock = l; toast(l.nombre + ' tomó el control. Quedaste en modo lectura.', true); await cargarDatos(); render(); return; }
        if (Date.now() - _beat > 10000) { _beat = Date.now(); await escribirCandado(); }
      } else {
        const antes = S.lock && candadoVivo(S.lock) ? S.lock.sid : ''; S.lock = l; const ahora = candadoVivo(l) ? l.sid : '';
        const cambios = await huboCambios();
        if (cambios && !$('.modal,.dlg')) { await cargarDatos(); render(); } else if (antes !== ahora) renderTop();
      }
    } catch (e) { console.warn('latido', e); }
  }, 5000);
}

/* ---------- Arranque / compuerta ---------- */
const app = () => $('#app');
function gate(html) { app().innerHTML = `<div class="gate"><div class="gate-card"><div class="brand"><img class="logoimg" src="${(S.config && S.config.logo) || LOGO_CH}" alt="CH Industrial Solutions"><div><small>CH Industrial Solutions</small><h1>QORVEX <span>Surtido</span></h1></div></div>${html}<div class="lg-foot"><button class="btn s" data-a="legal">Aviso legal y condiciones de uso</button></div></div></div>`; }
async function boot() {
  if (!DEMO && !window.showDirectoryPicker) return gate(`<p>Este sistema necesita <b>Microsoft Edge o Google Chrome</b> en computadora para trabajar sobre una carpeta.</p>`);
  let h = null;
  if (DEMO) { FS.dir = await navigator.storage.getDirectory(); return abrirCarpeta(); }
  try { h = await IDB.get('dir'); } catch (e) { }
  if (h) {
    const p = await h.queryPermission({ mode: 'readwrite' });
    if (p === 'granted') { FS.dir = h; return abrirCarpeta(); }
    gate(`<p>Carpeta de trabajo recordada: <b>${esc(h.name)}</b>. El navegador pide confirmar el acceso en cada sesión.</p><div class="row"><button class="btn p" id="g-re">Reconectar carpeta</button><button class="btn" id="g-otra">Elegir otra carpeta</button></div><div class="err" id="g-err"></div>`);
    $('#g-re').onclick = async () => { try { if ((await h.requestPermission({ mode: 'readwrite' })) === 'granted') { FS.dir = h; abrirCarpeta(); } } catch (e) { $('#g-err').textContent = e.message; } };
    $('#g-otra').onclick = elegirCarpeta; return;
  }
  gate(`<p>Selecciona la carpeta compartida donde vivirá el sistema (usuarios, inventarios, seguimiento e historial).</p><button class="btn p" id="g-sel">Seleccionar carpeta</button><div class="err" id="g-err"></div>`);
  $('#g-sel').onclick = elegirCarpeta;
}
async function elegirCarpeta() {
  try { const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'qorvex-surtido' }); FS.dir = h; await IDB.set('dir', h); abrirCarpeta(); }
  catch (e) { if (e.name !== 'AbortError') { const el = $('#g-err'); if (el) el.textContent = e.message; } }
}
async function abrirCarpeta() {
  try {
    const cfg = await FS.file(FILES.config);
    if (!cfg) return pantallaInicio(await FS.vacia());
    await cargarDatos();
    if (!S.usuarios.some(u => u.rol === 'administrador')) return pantallaInicio(false);
    pantallaLogin();
  } catch (e) { gate(`<p class="err">No se pudo abrir la carpeta: ${esc(e.message)}</p><button class="btn" id="g-sel">Elegir otra carpeta</button>`); $('#g-sel').onclick = elegirCarpeta; }
}
function pantallaInicio(vacia) {
  gate(`<p>${vacia ? 'La carpeta está vacía.' : 'En esta carpeta no hay una base de QORVEX Surtido.'} <b>Se iniciará de cero</b>: se crean los archivos del sistema y el primer usuario administrador.</p>
  <label class="f">Nombre completo<input id="i-nom" autocomplete="off"></label>
  <label class="f">Usuario<input id="i-usr" autocomplete="off"></label>
  <label class="f">Contraseña<input id="i-pw" type="password"></label>
  <label class="f"><span><input type="checkbox" id="i-ok" style="display:inline;width:auto"> Confirmo iniciar de cero en la carpeta «${esc(FS.dir.name || 'demo')}»</span></label>
  <div class="row" style="margin-top:14px"><button class="btn p" id="i-go">Crear e ingresar</button><button class="btn" id="i-otra">Elegir otra carpeta</button></div><div class="err" id="g-err"></div>`);
  $('#i-otra').onclick = elegirCarpeta;
  $('#i-go').onclick = async () => {
    try {
      if (!$('#i-ok').checked) throw new Error('Marca la confirmación para iniciar de cero.');
      S.config = configInicial(); S.usuarios = []; S.estado = { folios: {}, foliosHoja: {}, foliosCorto: {}, corrida: 0 }; S.cat = { prio: SEED_PRIO, jaula: [], pallets: {}, info: {} }; S.seg = { tickets: [] }; S.corridas = []; S.claves = {};
      const u = await crearUsuario({ nombre: $('#i-nom').value, usuario: $('#i-usr').value, pass: $('#i-pw').value, rol: 'administrador' });
      for (const k of ['config', 'usuarios', 'estado', 'cat', 'seg', 'corridas', 'claves']) await FS.save(FILES[k], S[k]);
      await marcarMods(); await entrar(u); await evento('INICIO_DE_CERO', 'Base creada');
    } catch (e) { $('#g-err').textContent = e.message; }
  };
}
function pantallaLogin(reg) {
  S.user = null; S.edit = false;
  gate(reg ? `<p>Registro de usuario nuevo (entra como capturista; un administrador puede cambiar el rol).</p>
  <label class="f">Nombre completo<input id="l-nom" autocomplete="off"></label><label class="f">Usuario<input id="l-usr" autocomplete="off"></label><label class="f">Contraseña<input id="l-pw" type="password"></label>
  <div class="row" style="margin-top:14px"><button class="btn p" id="l-go">Registrarme</button><button class="btn" id="l-sw">Ya tengo usuario</button></div><div class="err" id="g-err"></div>`
    : `<p>Carpeta: <b>${esc(FS.dir.name || 'demo')}</b></p>
  <label class="f">Usuario<input id="l-usr" autocomplete="username"></label><label class="f">Contraseña<input id="l-pw" type="password" autocomplete="current-password"></label>
  <div class="row" style="margin-top:14px"><button class="btn p" id="l-go">Ingresar</button><button class="btn" id="l-sw">Registrarse</button>${DEMO ? '' : '<button class="btn right s" id="l-dir">Cambiar carpeta</button>'}</div><div class="err" id="g-err"></div>`);
  $('#l-sw').onclick = () => pantallaLogin(!reg);
  if ($('#l-dir')) $('#l-dir').onclick = elegirCarpeta;
  const go = async () => {
    try {
      S.usuarios = await FS.json(FILES.usuarios, []);
      if (reg) {
        const l = await leerCandado();
        if (candadoVivo(l)) throw new Error('Ahora mismo edita ' + l.nombre + '. Pídele a un administrador que te dé de alta, o intenta cuando no haya nadie editando.');
        const u = await crearUsuario({ nombre: $('#l-nom').value, usuario: $('#l-usr').value, pass: $('#l-pw').value, rol: 'capturista' });
        await FS.save(FILES.usuarios, S.usuarios); await cargarDatos(); await entrar(u); await evento('REGISTRO', u.nombre); return;
      }
      const usr = QS.norm($('#l-usr').value).toLowerCase(), u = S.usuarios.find(x => x.usuario === usr);
      if (!u || u.activo === false || !u.hash || (await hash(u.salt, $('#l-pw').value)) !== u.hash) throw new Error('Usuario o contraseña incorrectos.');
      await cargarDatos(); await entrar(u);
    } catch (e) { $('#g-err').textContent = e.message; }
  };
  $('#l-go').onclick = go; $('#l-pw').onkeydown = e => { if (e.key === 'Enter') go(); };
  setTimeout(() => $('#l-usr') && $('#l-usr').focus(), 30);
}
async function entrar(u) {
  S.user = u; S.tab = 'surtido';
  if (u.rol === 'montacarguista') S.edit = false; else await tomarControl(false);
  await evento('INGRESO', S.edit ? 'edición' : 'lectura'); iniciarLatido(); render();
}
async function salir() { await evento('SALIDA', ''); await soltarControl(); clearInterval(_tick); V.reset(); pantallaLogin(); }
