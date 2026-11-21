/* ===== QORVEX Surtido · Vistas de operación ===== */
const V = { pg: null, res: null, invTmp: null, asig: { encargado: '', montas: {} }, corrida: null, segF: { q: '', est: '', grp: '', mon: '' }, hist: { mes: '', sub: 'tickets', q: '', rows: null }, invQ: '', reset() { this.pg = this.res = this.invTmp = this.corrida = null; this.asig = { encargado: '', montas: {} }; } };
const TABS = [['surtido', 'Surtido'], ['seguimiento', 'Seguimiento'], ['historial', 'Historial'], ['d1', '1. En Curso'], ['d2', '2. Tendencias'], ['d3', '3. Productividad'], ['inventarios', 'Inventarios'], ['config', 'Configuración']];
const ACT = {}, CHG = {}; let BUSY = false;
/* ---------- interacción: iconos, diálogos propios, progreso, tooltip, ordenar tablas, animación ---------- */
const ICON = { surtido: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z', seguimiento: 'M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2', historial: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', inventarios: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8', d1: 'M3 12h4l3-8 4 16 3-8h4', d2: 'M3 17l6-6 4 4 8-8M15 7h6v6', d3: 'M5 21V10M12 21V3M19 21v-7', config: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4', menu: 'M4 6h16M4 12h16M4 18h16' };
const ico = k => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k]}"/></svg>`;
function dlg({ titulo, msg, ok = 'Aceptar', cancel = 'Cancelar', input, peligro }) {
  if (window.__auto) return Promise.resolve(input ? window.__auto : true);
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'dlg';
    d.innerHTML = `<div class="dbox"><h3>${esc(titulo)}</h3><p>${esc(msg).replace(/\n/g, '<br>')}</p>${input ? `<input type="${input}" id="dlg-in" style="width:100%">` : ''}<div class="row" style="margin-top:18px;justify-content:flex-end"><button class="btn" id="dlg-no">${esc(cancel)}</button><button class="btn ${peligro ? 'd' : 'p'}" id="dlg-ok">${esc(ok)}</button></div></div>`;
    document.body.appendChild(d);
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); fin(input ? null : false); } else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); fin(input ? d.querySelector('#dlg-in').value : true); } };
    const fin = v => { d.remove(); document.removeEventListener('keydown', key, true); res(v); };
    document.addEventListener('keydown', key, true);
    d.querySelector('#dlg-no').onclick = () => fin(input ? null : false); d.querySelector('#dlg-ok').onclick = () => fin(input ? d.querySelector('#dlg-in').value : true);
    setTimeout(() => { const f = d.querySelector('#dlg-in') || d.querySelector('#dlg-ok'); if (f) f.focus(); }, 30);
  });
}
async function ocupado(msg) { const d = document.createElement('div'); d.className = 'dlg'; d.innerHTML = `<div class="dbox" style="text-align:center"><h3>${esc(msg)}</h3><div class="prog"><i></i></div></div>`; document.body.appendChild(d); await new Promise(r => setTimeout(r, 40)); return () => d.remove(); }
let _tip = null;
document.addEventListener('mousemove', e => { const el = e.target.closest ? e.target.closest('[data-tip]') : null; if (!el) { if (_tip) _tip.style.display = 'none'; return; } if (!_tip) { _tip = document.createElement('div'); _tip.id = 'tip'; document.body.appendChild(_tip); } _tip.textContent = el.dataset.tip; _tip.style.display = 'block'; _tip.style.left = Math.max(4, Math.min(innerWidth - _tip.offsetWidth - 8, e.clientX + 14)) + 'px'; _tip.style.top = Math.min(innerHeight - _tip.offsetHeight - 8, e.clientY + 16) + 'px'; });
document.addEventListener('click', () => { if (_tip) _tip.style.display = 'none'; }, true);
document.addEventListener('click', e => { // ordenar cualquier tabla al hacer clic en su encabezado
  const th = e.target.closest ? e.target.closest('table.t th') : null; if (!th || e.target.closest('input,select,button')) return;
  const tb = th.closest('table'), rows = [...tb.rows].slice(1), nc = tb.rows[0].cells.length; if (rows.length < 2 || rows.some(r => r.cells.length !== nc)) return;
  const i = th.cellIndex, dir = th.dataset.s === 'a' ? -1 : 1; [...tb.rows[0].cells].forEach(c => { delete c.dataset.s; }); th.dataset.s = dir === 1 ? 'a' : 'd';
  const val = r => { const t = r.cells[i].textContent.trim(); return /^[-+]?[\d,.]+\s*%?$/.test(t) ? parseFloat(t.replace(/[,%+]/g, '')) : t.toLowerCase(); };
  rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })) * dir; });
  const par = rows[0].parentNode; rows.forEach(r => par.appendChild(r));
});
function animar(m) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  m.querySelectorAll('.kpi b,.hbig').forEach(el => { const n = el.firstChild; if (!n || n.nodeType !== 3) return; const mt = /^(\s*)(\d[\d,]*)(%?)(\s*)$/.exec(n.nodeValue); if (!mt) return; const fin = +mt[2].replace(/,/g, ''); if (!(fin > 0)) return; const t0 = performance.now();
    const paso = t => { const k = Math.min(1, (t - t0) / 550), v = Math.round(fin * (1 - Math.pow(1 - k, 3))); n.nodeValue = mt[1] + v.toLocaleString('es-MX') + mt[3] + mt[4]; if (k < 1 && el.isConnected) requestAnimationFrame(paso); }; requestAnimationFrame(paso); });
}
const miniMenu = v => { try { if (v === undefined) return localStorage.getItem('qs-mini') === '1'; localStorage.setItem('qs-mini', v ? '1' : '0'); } catch (e) { } return !!v; };
ACT.colap = () => { miniMenu(!miniMenu()); render(); };
/* detalle al hacer clic en un indicador */
let DR = {};
const drK = (k, titulo, rows) => { DR[k] = { titulo, rows }; return `data-a="drill" data-k="${esc(k)}"`; };
ACT.drill = el => {
  const d = DR[el.dataset.k]; if (!d) return; const ES = { conf: ['Confirmado', 'g'], cero: ['Cerrado en 0', 'v'], seg: ['En seguimiento', 'o'], por: ['Por surtir', 'r'] };
  modal(`<div class="row"><h3>${esc(d.titulo)} <span class="tag b">${d.rows.length} tickets</span></h3><button class="btn right" data-a="cerrarModal">Cerrar</button></div><div class="tw" style="max-height:66vh;margin-top:10px"><table class="t"><tr><th>Folio</th><th>Estatus</th><th>Línea</th><th>Ítem</th><th>Descripción</th><th>Ubicación</th><th class="n">Pedido</th><th class="n">Surtido</th><th>Impreso</th><th>Cerrado</th><th>Encargado</th><th>Montacarguista</th></tr>${d.rows.slice(0, 500).map(t => { const e = ES[st(t)]; return `<tr><td class="b">${esc(t.folio)}</td><td><span class="tag ${e[1]}">${e[0]}</span></td><td>${esc(t.linea)}</td><td class="b">${esc(t.item)}</td><td>${esc(t.desc)}</td><td>${esc(t.loc)}</td><td class="n">${nf(t.qty)}</td><td class="n">${t.estadoFinal ? nf(t.qtySurtida) : ''}</td><td>${esc(String(t.fechaImp).slice(5, 16))}</td><td>${esc(String(t.fechaCierre || '').slice(5, 16))}</td><td>${esc(t.encargado)}</td><td>${esc(t.monta)}</td></tr>`; }).join('') || '<tr><td colspan="12" class="mut" style="padding:18px;text-align:center">Sin tickets.</td></tr>'}</table></div>${d.rows.length > 500 ? `<p class="sm mut">Mostrando 500 de ${d.rows.length}.</p>` : ''}<p class="sm mut">Haz clic en un encabezado para ordenar.</p>`, true);
};

const NAV = [['OPERACIÓN', ['surtido', 'seguimiento', 'historial', 'inventarios']], ['INDICADORES', ['d1', 'd2', 'd3']], ['SISTEMA', ['config']]];
const TITULO = { surtido: 'Surtido', seguimiento: 'Seguimiento', historial: 'Historial', inventarios: 'Inventarios y catálogos', d1: 'En Curso', d2: 'Tendencias', d3: 'Productividad del equipo', config: 'Configuración' };
const logoHtml = () => `<img class="logoimg" src="${(S.config && S.config.logo) || LOGO_CH}" alt="CH Industrial Solutions">`;
const temaOscuro = () => document.documentElement.dataset.theme === 'dark';
ACT.tema = () => { const d = !temaOscuro(); document.documentElement.dataset.theme = d ? 'dark' : 'light'; try { localStorage.setItem('qs-tema', d ? 'dark' : 'light'); } catch (e) { } render(); };
function render() {
  const nom = Object.fromEntries(TABS);
  app().innerHTML = `<div class="shell"><aside class="side ${miniMenu() ? 'mini' : ''}"><button class="colap" data-a="colap" data-tip="${miniMenu() ? 'Expandir menú' : 'Contraer menú'}">${ico('menu')}</button><div class="sidelogo">${logoHtml()}</div><div class="prod">QORVEX <span>Surtido</span><small>TICKET PERFORMANCE &amp; OPERATIONS CONTROL</small></div>
  ${NAV.map(g => `<div class="sec">${g[0]}</div>` + g[1].map(t => `<button class="nv ${S.tab === t ? 'on' : ''}" data-a="tab" data-t="${t}" ${miniMenu() ? `data-tip="${nom[t].replace(/^\d\. /, '')}"` : ''}>${ico(t)}<span class="nl">${nom[t].replace(/^\d\. /, '')}</span>${t === 'seguimiento' ? `<b>${S.seg.tickets.length}</b>` : ''}</button>`).join('')).join('')}
  <div class="usr"><b>${esc(S.user.nombre)}</b><span>${ROLES[S.user.rol]}</span><button class="out tema" data-a="tema" ${miniMenu() ? `data-tip="${temaOscuro() ? 'Tema claro' : 'Tema oscuro'}"` : ''}><i>${temaOscuro() ? '☀' : '☾'}</i><em>${temaOscuro() ? 'Tema claro' : 'Tema oscuro'}</em></button><button class="out" data-a="salir">Cerrar sesión</button></div></aside>
  <div class="mainc"><header class="top"><div id="top" class="row grow"></div><div id="cinta"></div></header><main id="main"></main></div></div>`;
  renderTop(); renderTab();
}
const encTurno = () => { const a = turnoActual(), e = S.estado.encTurno; return e && e.clave === a.fechaOp + '|' + a.turno.id ? e.nombre : ''; };
function renderCinta() {
  const el = $('#cinta'); if (!el) return; const a = turnoActual(), enc = encTurno(), sups = usuariosRol('supervisor', 'administrador');
  if (el.contains(document.activeElement)) return;
  const html = `<div class="cinta ${enc ? '' : 'falta'}"><b>Encargado del turno ${esc(a.turno.nombre)}:</b><select data-c="encTurno" ${puedeEditar() ? '' : 'disabled'}><option value="">— Selecciona —</option>${sups.map(u => `<option ${u.nombre === enc ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select>${enc ? '' : '<span class="sm b">⚠ Falta: sin encargado no se puede ejecutar el cruce</span>'}</div>`;
  if (el._h !== html) { el._h = html; el.innerHTML = html; }
}
CHG.encTurno = async el => {
  const a = turnoActual(), ant = encTurno(); if (!puedeEditar()) throw new Error('Estás en modo lectura.');
  S.estado.encTurno = { clave: a.fechaOp + '|' + a.turno.id, nombre: el.value };
  await guardar('estado'); await evento('ENCARGADO_TURNO', `${a.turno.nombre}: ${ant || '—'} → ${el.value || '—'}`); el.blur(); render(); if (el.value) toast('Encargado del turno: ' + el.value);
};
function renderTop() {
  renderCinta();
  const el = $('#top'); if (!el) return; const ta = turnoActual(), d = new Date();
  const lk = S.lock && candadoVivo(S.lock) && S.lock.sid !== SID ? S.lock : null;
  el.innerHTML = `<h1>${TITULO[S.tab]}</h1><span class="pill ${S.edit ? '' : 'ro'}"><i></i>${S.edit ? 'Operación activa · edición' : 'Solo lectura' + (lk ? ' · edita ' + esc(lk.nombre) : '')}</span>
  ${!S.edit && S.user.rol !== 'montacarguista' ? `<button class="btn take" data-a="tomar">Tomar control</button>` : ''}
  <span class="d">${d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · ${QS.hm(d)} · Turno ${esc(ta.turno.nombre)}</span>`;
}
setInterval(() => { if (S.user && $('#top')) renderTop(); }, 30000);
function renderTab() {
  const m = $('#main'); if (!m) return;
  const f = { surtido: vSurtido, seguimiento: vSeguimiento, historial: vHistorial, d1: vDash1, d2: vDash2, d3: vDash3, inventarios: vInventarios, config: vConfig }[S.tab];
  const ent = V._enter || /^d\d$/.test(S.tab); V._enter = false;
  const pon = h => { m.innerHTML = h; if (ent) { m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter'); animar(m); } else m.classList.remove('enter'); };
  const r = f(); if (r && r.then) { if (!m.firstChild || ent) m.innerHTML = '<div class="card mut">Cargando…</div>'; r.then(h => { if (h != null) pon(h); }).catch(e => { m.innerHTML = `<div class="card err">${esc(e.message)}</div>`; }); } else pon(r);
}
const roNote = () => puedeEditar() ? '' : `<div class="note ro">Estás en <b>modo lectura</b>. ${S.user.rol === 'montacarguista' ? '' : 'Usa «Tomar control» para editar desde esta computadora.'}</div><div style="height:10px"></div>`;
ACT.tab = el => { S.tab = el.dataset.t; V._enter = true; render(); };
ACT.salir = () => salir();
ACT.tomar = async () => {
  const l = await leerCandado();
  if (candadoVivo(l) && l.sid !== SID && !(await dlg({ titulo: 'Tomar control', msg: l.nombre + ' está editando. Si tomas el control, su pantalla quedará en modo lectura.', ok: 'Tomar control' }))) return;
  await cargarDatos(); await tomarControl(true); _beat = Date.now(); toast('Ahora tú tienes el control de edición.'); render();
};
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-a]'); if (!el || el.disabled) return;
  const libre = ['tab', 'cerrarModal', 'drill', 'colap', 'tema'].includes(el.dataset.a);
  if (BUSY && !libre) return; if (!libre) BUSY = true; // una acción a la vez: evita doble clic y escrituras encimadas
  try { await ACT[el.dataset.a](el, ev); } catch (e) { console.error(e); toast(e.message || String(e), true); if (/Perdiste el control/.test(e.message)) { await cargarDatos(); render(); } }
  finally { if (!libre) { if (el.dataset.a === 'segOk') setTimeout(() => { BUSY = false; }, 350); else BUSY = false; } }
});
document.addEventListener('change', async ev => { const el = ev.target.closest('[data-c]'); if (!el) return; try { await CHG[el.dataset.c](el, ev); } catch (e) { console.error(e); toast(e.message || String(e), true); } });
document.addEventListener('input', ev => { const el = ev.target.closest('[data-i]'); if (el) CHG[el.dataset.i](el, ev); });

/* ---------- modal ---------- */
function modal(html, wide) { cerrarModal(); const d = document.createElement('div'); d.className = 'modal'; d.innerHTML = `<div class="${wide ? 'wide' : ''}">${html}</div>`; d.addEventListener('mousedown', e => { if (e.target === d) cerrarModal(); }); document.body.appendChild(d); const f = d.querySelector('[autofocus]'); if (f) setTimeout(() => { f.focus(); f.select && f.select(); }, 30); return d; }
function cerrarModal() { const m = $('.modal'); if (m) m.remove(); }
ACT.cerrarModal = cerrarModal;

/* =================== SURTIDO =================== */
const invChip = k => { const v = S.inv[k], n = k.toUpperCase(); if (!v) return `<span class="tag r">Inventario ${n}: sin cargar</span>`; const hoy = v.cargado.slice(0, 10) === QS.ymd(new Date()); return `<span class="tag ${hoy ? 'g' : 'o'}">Inventario ${n}: ${v.rows.length.toLocaleString()} ubicaciones · cargado ${esc(v.cargado.slice(0, 16))}${hoy ? '' : ' (no es de hoy)'}</span>`; };
function vSurtido() {
  let h = roNote() + `<div class="card"><div class="row">${['ln', 'baan'].map(k => `<label class="btn ${S.inv[k] ? '' : 'p'}" ${puedeEditar() ? '' : 'style="opacity:.45;pointer-events:none"'}>Seleccionar inventario ${k.toUpperCase()}<input type="file" accept=".xlsx,.xlsm" data-c="invFile" data-k="${k}" hidden></label>`).join('')}<span class="sm mut">Elige el Excel desde cualquier ubicación de tu PC; en la carpeta de trabajo solo se guarda un respaldo ya limpio.</span></div><div class="row" style="margin-top:10px">${invChip('ln')}${invChip('baan')}<span class="tag k">Jaula: ${S.cat.jaula.length} ítems</span><span class="tag k">Pallet completo: ${Object.keys(S.cat.pallets).length} ítems</span></div></div>`;
  if (V.corrida) return h + vCorrida(V.corrida, true);
  if (V.res) return h + vResultado();
  if (!V.pg) return h + `<div class="card"><h3>1 · Pega las solicitudes de Smartsheet</h3><div class="drop"><b>Ctrl + V</b>Copia el rango en Smartsheet (Created … Comments, con o sin encabezado) y pégalo aquí.<div style="margin-top:12px"><button class="btn" data-a="pegarBtn" ${puedeEditar() ? '' : 'disabled'}>Pegar desde el portapapeles</button></div></div></div>` + vCorridasRecientes();
  const rows = V.pg.rows, ok = rows.filter(r => r.incl && !r.errs.length).length, dup = rows.filter(r => r.dup).length, bad = rows.filter(r => r.errs.length).length;
  h += `<div class="card"><h3>1 · Solicitudes pegadas <span class="tag b">${rows.length} filas</span><span class="tag g">${ok} a procesar</span>${dup ? `<span class="tag o">${dup} duplicadas</span>` : ''}${bad ? `<span class="tag r">${bad} con error</span>` : ''}
  <span class="right row"><button class="btn" data-a="limpiarPg">Limpiar</button><button class="btn p" data-a="cruce" ${ok && puedeEditar() ? '' : 'disabled'}>Ejecutar cruce (${ok})</button></span></h3>
  <div class="tw"><table class="t"><tr><th></th><th>#</th><th>Creado</th><th>Almacén</th><th>Línea</th><th>Router</th><th>Ítem</th><th>Descripción</th><th>H. req.</th><th class="n">Cantidad</th><th>Solicitante</th><th>Estado</th></tr>
  ${rows.map((r, i) => `<tr class="${r.errs.length ? 'bad' : r.dup ? 'dup' : ''}"><td><input type="checkbox" data-c="incl" data-i2="${i}" ${r.incl ? 'checked' : ''} ${r.errs.length ? 'disabled' : ''}></td><td>${i + 1}</td><td>${esc(r.created)}</td><td>${esc(r.almacen)}</td><td>${esc(r.linea)}</td><td>${esc(r.router)}</td><td class="b">${esc(r.item)}</td><td>${esc(r.desc)}</td><td>${esc(QS.prioTxt(r.prioridad))}</td><td class="n">${nf(r.qty)}</td><td>${esc(r.solicitante)}</td><td>${r.errs.length ? `<span class="tag r">${esc(r.errs.join(', '))}</span>` : r.dup ? `<span class="tag o">${esc(r.dup)}</span>` : '<span class="tag g">OK</span>'}</td></tr>`).join('')}
  </table></div><p class="sm mut">Las duplicadas vienen desmarcadas; marca la casilla si de verdad quieres surtirlas otra vez.</p></div>`;
  return h;
}
function cargarPegado(text) {
  const p = QS.parsePaste(text); if (p.error) return toast(p.error, true);
  if (!p.rows.length) return toast('No se reconocieron filas.', true);
  const vistos = new Set();
  for (const r of p.rows) {
    r.errs = QS.validaReq(r); r.clave = QS.claveReq(r); r.dup = '';
    if (S.claves[r.clave]) r.dup = 'ya procesada ' + S.claves[r.clave]; else if (vistos.has(r.clave)) r.dup = 'repetida en el pegado';
    vistos.add(r.clave); r.incl = !r.errs.length && !r.dup;
  }
  V.pg = { rows: p.rows }; V.res = null; renderTab();
  const d = p.rows.filter(r => r.dup).length; if (d) toast(d + ' solicitudes duplicadas se omitieron (puedes reactivarlas).');
}
document.addEventListener('paste', ev => {
  if (!S.user || S.tab !== 'surtido' || V.res || V.corrida || $('.modal,.dlg')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
  if (!puedeEditar()) return toast('Estás en modo lectura.', true);
  const t = ev.clipboardData.getData('text/plain'); if (t) { ev.preventDefault(); cargarPegado(t); }
});
ACT.pegarBtn = async () => { try { cargarPegado(await navigator.clipboard.readText()); } catch (e) { toast('El navegador no dio permiso. Usa Ctrl+V.', true); } };
ACT.limpiarPg = () => { V.reset(); renderTab(); };
CHG.incl = el => { V.pg.rows[+el.dataset.i2].incl = el.checked; renderTab(); };
ACT.cruce = () => {
  if (!encTurno()) throw new Error('Primero selecciona el encargado del turno en la cinta de arriba.');
  const reqs = V.pg.rows.filter(r => r.incl && !r.errs.length);
  const falta = [...new Set(reqs.map(r => r.almacen))].filter(a => !S.inv[a.toLowerCase()]);
  if (falta.length) return toast('Falta cargar el inventario de ' + falta.join(' y ') + ' (pestaña Inventarios).', true);
  const cp = k => S.inv[k] ? S.inv[k].rows.map(r => ({ ...r })) : [];
  V.invTmp = { ln: cp('ln'), baan: cp('baan') };
  const res = QS.cruce(reqs, { ln: V.invTmp.ln, baan: V.invTmp.baan, prio: S.cat.prio, jaula: new Set(S.cat.jaula), pallets: S.cat.pallets, grupos: S.config.grupos });
  V.reqs = reqs; V.res = QS.ordenar(res, S.config.grupoOrden, QS.toMin(turnoActual().turno.inicio));
  V.asig = { encargado: V.asig.encargado || '', montas: { ...V.asig.montas } }; renderTab();
};
const gruposDe = res => { const g = []; for (const r of res) if (!g.includes(r.grupo)) g.push(r.grupo); return g; };
const opt = (list, sel, ph) => `<option value="">${ph}</option>` + list.map(u => `<option ${u.nombre === sel ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('');
function vResultado() {
  const res = V.res, gs = gruposDe(res), tk = res.filter(r => r.tipo === 'TICKET'), co = res.filter(r => r.tipo === 'CORTO');
  const sups = usuariosRol('supervisor', 'administrador'), montas = usuariosRol('montacarguista'), todos = S.usuarios.filter(u => u.activo !== false);
  return `<div class="card"><h3>2 · Resultado del cruce <span class="tag b">${V.reqs.length} solicitudes</span><span class="tag g">${tk.length} tickets</span>${co.length ? `<span class="tag r">${co.length} cortos (sin inventario)</span>` : ''}
   <span class="right row"><button class="btn" data-a="volverPg">← Volver</button><button class="btn" data-a="pvEt">Vista previa etiquetas</button><button class="btn" data-a="pvHo">Vista previa hojas</button><button class="btn g" data-a="confirmar" ${puedeEditar() ? '' : 'disabled'}>Confirmar y generar folios</button></span></h3>
   <div class="grid g2"><div><p>Encargado del turno: <b>${esc(encTurno() || '— falta seleccionarlo en la cinta de arriba —')}</b></p>
   <p class="sm mut">Capturista: <b>${esc(S.user.nombre)}</b> · Turno ${esc(turnoActual().turno.nombre)}. Los folios se asignan al confirmar; el inventario se descuenta en ese momento.</p></div>
   <div><table class="t"><tr><th>Línea</th><th class="n">Tickets</th><th class="n">Cortos</th><th>${'Montacarguista asignado'}</th></tr>${gs.map(g => `<tr><td class="b">${esc(g)}${g === 'JAULA' ? ' <span class="tag v">hoja aparte</span>' : ''}</td><td class="n">${tk.filter(r => r.grupo === g).length}</td><td class="n">${co.filter(r => r.grupo === g).length}</td><td><select data-c="asigMonta" data-g="${esc(g)}">${opt(g === 'JAULA' ? todos : montas, V.asig.montas[g], g === 'JAULA' ? '— Responsable de jaula —' : '— Selecciona —')}</select></td></tr>`).join('')}</table>
   ${montas.length ? '' : '<p class="sm err">No hay montacarguistas en el catálogo. Dalos de alta en Configuración → Usuarios.</p>'}</div></div></div>
   <div class="card"><div class="tw">${tablaRes(res)}</div></div>`;
}
const tablaRes = res => `<table class="t"><tr><th>Línea</th><th>Folio</th><th>H. req.</th><th>Ítem</th><th>Descripción</th><th>Router</th><th class="n">Solicitado</th><th class="n">A surtir</th><th>Ubicación</th><th class="n">Stock ubic.</th><th>Almacén</th><th></th></tr>${res.map(r => `<tr class="${r.tipo === 'CORTO' ? 'corto' : ''}"><td class="b">${esc(r.grupo)}${r.grupo !== r.linea ? ` <span class="mut sm">${esc(r.linea)}</span>` : ''}</td><td>${esc(r.folio || '—')}</td><td>${esc(r.prioridad)}</td><td class="b">${esc(r.item)}</td><td>${esc(r.desc)}</td><td>${esc(r.router)}</td><td class="n">${nf(r.qtySolicitada)}</td><td class="n b">${nf(r.qty)}</td><td class="b">${esc(r.loc)}</td><td class="n">${nf(r.stock)}</td><td>${esc(r.wh)}</td><td>${r.tipo === 'CORTO' ? '<span class="tag r">CORTO</span>' : ''}${r.pallets ? ` <span class="tag v">PALLET ×${r.pallets}</span>` : ''}${r.jaula ? ' <span class="tag o">JAULA</span>' : ''}</td></tr>`).join('')}</table>`;
ACT.volverPg = () => { V.res = null; renderTab(); };
CHG.asigMonta = el => { V.asig.montas[el.dataset.g] = el.value; };
ACT.confirmar = async () => {
  const res = V.res, gs = gruposDe(res.filter(r => r.tipo === 'TICKET'));
  V.asig.encargado = encTurno(); if (!V.asig.encargado) throw new Error('Selecciona el encargado del turno en la cinta de arriba.');
  const sinM = gs.filter(g => !V.asig.montas[g]); if (sinM.length) throw new Error('Falta asignar montacarguista en: ' + sinM.join(', '));
  if (!(await dlg({ titulo: 'Confirmar corrida', msg: `Se generarán ${res.filter(r => r.tipo === 'TICKET').length} tickets con folio y se descontará el inventario.`, ok: 'Generar folios' }))) return;
  const ta = turnoActual(), T = ta.turno.id, E = S.estado, N = S.config.renglonesHoja || 25, fecha = nowIso();
  const sig = (o, k) => (o[k] = (o[k] || 0) + 1);
  const id = ++E.corrida, hojas = {}, tickets = [];
  for (const r of res) {
    const folio = r.tipo === 'TICKET' ? T + '-' + QS.pad(sig(E.folios, T), 6) : T + 'C-' + QS.pad(sig(E.foliosCorto, T), 6);
    const { req, pmin, ...rest } = r;
    tickets.push({ ...rest, folio, corrida: id, fechaImp: fecha, fechaOp: ta.fechaOp, turno: T, capturista: S.user.nombre, encargado: V.asig.encargado, monta: V.asig.montas[r.grupo] || '', estado: r.tipo === 'TICKET' ? 'POR_SURTIR' : 'CORTO', supSeg: '', transferencias: [], reimp: 0 });
  }
  for (const g of gruposDe(res)) { const n = Math.ceil(res.filter(r => r.grupo === g).length / N); hojas[g] = []; for (let i = 0; i < n; i++) hojas[g].push('H' + T + '-' + QS.pad(sig(E.foliosHoja, T), 6)); }
  const corrida = { id, fecha, fechaOp: ta.fechaOp, turno: T, capturista: S.user.nombre, encargado: V.asig.encargado, montas: { ...V.asig.montas }, hojas, tickets, impEt: 0, impHo: 0 };
  try {
    S.seg.tickets.push(...tickets.map(t => ({ ...t })));
    for (const k of ['ln', 'baan']) if (S.inv[k]) S.inv[k].rows = V.invTmp[k].filter(r => r.qty > 1e-9).map(({ _i, _p, ...r }) => r);
    const hoy = Date.now(); for (const k in S.claves) if (hoy - new Date(S.claves[k]).getTime() > 15 * 864e5) delete S.claves[k];
    for (const q of V.reqs) S.claves[q.clave] = ta.fechaOp;
    S.corridas.unshift(corrida); S.corridas.length = Math.min(S.corridas.length, 30);
    await guardar('estado', 'seg', 'invln', 'invbaan', 'claves', 'corridas');
  } catch (e) { await cargarDatos(); throw e; }
  await evento('CRUCE', `Corrida ${id}: ${tickets.filter(t => t.tipo === 'TICKET').length} tickets, ${tickets.filter(t => t.tipo === 'CORTO').length} cortos, encargado ${corrida.encargado}`);
  V.pg = V.res = V.invTmp = null; V.corrida = corrida; render(); toast('Corrida ' + id + ' confirmada. Ya puedes imprimir.');
};
function vCorrida(c, nueva) {
  const tk = c.tickets.filter(t => t.tipo === 'TICKET'), gs = gruposDe(c.tickets);
  return `<div class="card"><h3>Corrida #${c.id} confirmada <span class="tag g">${tk.length} tickets</span><span class="tag r">${c.tickets.length - tk.length} cortos</span><span class="tag k">${esc(c.fecha)} · Turno ${esc(turnoPorId(c.turno).nombre)}</span>
  <span class="right row">${nueva ? '<button class="btn n" data-a="nuevaCarga">Nueva carga</button>' : ''}</span></h3>
  <p class="sm mut">Capturista: <b>${esc(c.capturista)}</b> · Encargado: <b>${esc(c.encargado)}</b></p>
  <table class="t"><tr><th>Línea</th><th>Montacarguista</th><th class="n">Tickets</th><th>Hojas</th><th></th></tr>
  ${gs.map(g => `<tr><td class="b">${esc(g)}</td><td>${esc(c.montas[g] || '—')}</td><td class="n">${tk.filter(t => t.grupo === g).length}</td><td>${esc((c.hojas[g] || []).join(', '))}</td><td class="row"><button class="btn s" data-a="impEt" data-c2="${c.id}" data-g="${esc(g)}" ${puedeEditar() ? '' : 'disabled'}>Etiquetas</button><button class="btn s" data-a="impHo" data-c2="${c.id}" data-g="${esc(g)}" ${puedeEditar() ? '' : 'disabled'}>Hoja</button></td></tr>`).join('')}</table>
  <div class="row" style="margin-top:12px"><button class="btn p" data-a="impEt" data-c2="${c.id}" ${puedeEditar() ? '' : 'disabled'}>Imprimir todas las etiquetas${c.impEt ? ' (reimpresión)' : ''}</button><button class="btn p" data-a="impHo" data-c2="${c.id}" ${puedeEditar() ? '' : 'disabled'}>Imprimir todas las hojas${c.impHo ? ' (reimpresión)' : ''}</button><button class="btn" data-a="pvEtC" data-c2="${c.id}">Vista previa etiquetas</button><button class="btn" data-a="pvHoC" data-c2="${c.id}">Vista previa hojas</button></div></div>
  <div class="card"><div class="tw">${tablaRes(c.tickets)}</div></div>`;
}
function vCorridasRecientes() {
  if (!S.corridas.length) return '';
  return `<div class="card"><h3>Corridas recientes</h3><div class="tw" style="max-height:260px"><table class="t"><tr><th>#</th><th>Fecha</th><th>Turno</th><th>Capturista</th><th>Encargado</th><th class="n">Tickets</th><th class="n">Cortos</th><th></th></tr>${S.corridas.slice(0, 12).map(c => `<tr><td>${c.id}</td><td>${esc(c.fecha)}</td><td>${esc(c.turno)}</td><td>${esc(c.capturista)}</td><td>${esc(c.encargado)}</td><td class="n">${c.tickets.filter(t => t.tipo === 'TICKET').length}</td><td class="n">${c.tickets.filter(t => t.tipo === 'CORTO').length}</td><td><button class="btn s" data-a="verCorrida" data-c2="${c.id}">Abrir / reimprimir</button></td></tr>`).join('')}</table></div></div>`;
}
const corridaPorId = id => S.corridas.find(c => c.id === +id);
ACT.verCorrida = el => { V.corrida = corridaPorId(el.dataset.c2); renderTab(); };
ACT.nuevaCarga = () => { V.reset(); renderTab(); };

/* ---------- etiquetas y hojas ---------- */
function qrSvg(text) { const q = qrcode(0, 'M'); q.addData(String(text || '-')); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
function htmlEtiqueta(t, re) {
  const r1 = (t.router || '').split(' ')[0];
  const rows = [['ALMACÉN', t.wh, 'Sistema ' + t.almacen], ['ÍTEM', t.item, t.desc], ['UBICACIÓN', t.loc, 'Stock en ubicación: ' + nf(t.stock)], ['ROUTER', r1, '']];
  return `<div class="label"><div class="l1"><div class="lin">${esc(t.linea)}</div><div class="fol">${esc(t.folio || 'PENDIENTE')}</div></div>
  <div class="l2"><span>${esc(t.fechaImp || nowIso()).slice(0, 16)} · Turno ${esc(turnoPorId(t.turno || turnoActual().turno.id).nombre)}</span>${re ? '<b>REIMPRESIÓN</b>' : ''}</div>
  ${t.jaula || t.pallets ? `<div class="ban">${t.jaula ? 'JAULA' : ''}${t.jaula && t.pallets ? ' · ' : ''}${t.pallets ? 'PALLET COMPLETO ×' + t.pallets : ''}</div>` : ''}
  ${rows.map((r, i) => `<div class="qr">${r[1] ? qrSvg(r[1]) : '<div class="noqr"></div>'}<div><u>${i + 1} · ${r[0]}</u><b>${esc(r[1] || 'SIN ROUTER')}</b>${r[2] ? `<small>${esc(r[2])}</small>` : ''}</div></div>`).join('')}
  <div class="box"><div><u>CANTIDAD REQ</u><div class="qty">${nf(t.qty)}</div></div><div><u>H. REQUERIDA</u><div class="hr">${esc(t.prioridad || '—')}</div></div></div>
  <div class="ft"><span>Solicitud: ${esc(t.creadoSS)}</span><span>Solicita: ${esc(t.solicitante)}</span><span>Capturista: ${esc(t.capturista || S.user.nombre)}</span><span>Montacargas: ${esc(t.monta || '')}</span><span>Encargado: ${esc(t.encargado || '')}</span><span>Sup. línea: ${esc((t.supCliente || '').split('@')[0])}</span></div></div>`;
}
function htmlHojas(c, soloG) {
  const N = S.config.renglonesHoja || 25, rh = Math.min(.36, 6.25 / N).toFixed(3), L = S.logos || {}, fmt = S.config.formato || ''; let h = '';
  const logos = `<div class="lg">${L.sese ? `<img src="${L.sese}" alt="SESE">` : ''}${L.international ? `<img src="${L.international}" alt="International">` : ''}</div>`;
  for (const g of gruposDe(c.tickets)) {
    if (soloG && g !== soloG) continue;
    const rows = c.tickets.filter(t => t.grupo === g), multi = new Set(rows.map(r => r.linea)).size > 1 || g === 'JAULA', tot = Math.ceil(rows.length / N), fol = c.hojas[g] || [];
    for (let p = 0; p < tot; p++) {
      const part = rows.slice(p * N, p * N + N);
      h += `<div class="sheet"><div class="sh">${logos}<h2>Surtido ESC ${esc(g)}${g === 'JAULA' ? '<small>Material resguardado en jaula</small>' : ''}</h2><div class="fo">${fmt ? `Formato: <b>${esc(fmt)}</b><br>` : ''}Folio <b>${esc(fol[p] || (fol[0] ? fol[0] + '·' + (p + 1) : 'PENDIENTE'))}</b> · <span class="pg">Página ${p + 1} de ${tot}</span><br>${esc((c.fecha || nowIso()).slice(0, 16))} · Turno ${esc(turnoPorId(c.turno).nombre)} · Corrida ${c.id || '—'}</div></div>
      <div class="who"><div><b>Capturista:</b> ${esc(c.capturista)}</div><div><b>Supervisor:</b> ${esc(c.encargado || '')}</div><div><b>${g === 'JAULA' ? 'Resp. jaula' : 'Montacarguista'}:</b> ${esc(c.montas[g] || '')}</div></div>
      <table style="--rh:${rh}in"><colgroup><col style="width:.3in"><col style="width:.55in"><col style="width:1.1in"><col>${multi ? '<col style="width:.9in">' : ''}<col style="width:1.15in"><col style="width:.8in"><col style="width:1in"><col style="width:.6in"><col style="width:.9in"><col style="width:1in"></colgroup>
      <tr><th>#</th><th>Hora</th><th>SKU</th><th>Description</th>${multi ? '<th>Línea</th>' : ''}<th>Router</th><th>Requi</th><th>Location</th><th>Stock</th><th>Ticket</th><th>Pick. Qty</th></tr>
      ${Array.from({ length: N }, (_, i) => { const r = part[i]; return r ? `<tr><td class="c">${p * N + i + 1}</td><td class="c">${esc(r.prioridad)}</td><td><b>${esc(r.item)}</b></td><td>${esc(r.desc)}</td>${multi ? `<td>${esc(r.linea)}</td>` : ''}<td>${esc(r.router)}</td><td class="q">${nf(r.qty)}${r.pallets ? ' (P×' + r.pallets + ')' : ''}</td><td class="${r.tipo === 'CORTO' ? 'sin' : ''}"><b>${esc(r.loc)}</b></td><td class="c">${r.tipo === 'CORTO' ? '' : nf(r.stock)}</td><td class="c">${r.tipo === 'CORTO' ? 'CORTO' : esc(r.folio || '')}</td><td></td></tr>` : `<tr><td class="c">${p * N + i + 1}</td>${'<td></td>'.repeat(multi ? 10 : 9)}</tr>`; }).join('')}</table>
      <div class="sg"><div>Capturista</div><div>${g === 'JAULA' ? 'Responsable de jaula' : 'Montacarguista'}</div><div>Supervisor</div></div></div>`;
    }
  }
  return h;
}
const provisional = () => (V.asig.encargado = encTurno(), { id: 0, fecha: nowIso(), turno: turnoActual().turno.id, capturista: S.user.nombre, encargado: V.asig.encargado, montas: V.asig.montas, hojas: {}, tickets: V.res.map(r => ({ ...r, encargado: encTurno(), monta: V.asig.montas[r.grupo] || '' })) });
function preview(html, titulo) { modal(`<div class="row"><h3>${titulo}</h3><button class="btn right" data-a="cerrarModal">Cerrar</button></div><div class="pv">${html}</div>`, true); }
const etiquetasDe = (c, g, re) => c.tickets.filter(t => t.tipo === 'TICKET' && (!g || t.grupo === g)).map(t => htmlEtiqueta(t, re)).join('');
ACT.pvEt = () => preview(etiquetasDe(provisional()), 'Vista previa de etiquetas (folio pendiente)');
ACT.pvHo = () => preview(htmlHojas(provisional()), 'Vista previa de hojas de surtido');
ACT.pvEtC = el => preview(etiquetasDe(corridaPorId(el.dataset.c2)), 'Etiquetas');
ACT.pvHoC = el => preview(htmlHojas(corridaPorId(el.dataset.c2)), 'Hojas de surtido');
function imprimir(html, tipo) {
  if (!html) return toast('No hay nada que imprimir.', true);
  $('#print-root').innerHTML = html;
  $('#pagecss').textContent = tipo === 'label' ? '@page{size:4in 6in;margin:0}' : '@page{size:letter landscape;margin:.2in}';
  return new Promise(res => setTimeout(() => { window.print(); $('#print-root').innerHTML = ''; res(); }, 60));
}
ACT.impEt = async el => { const c = corridaPorId(el.dataset.c2), g = el.dataset.g || ''; const re = c.impEt > 0; await imprimir(etiquetasDe(c, g, re), 'label'); c.impEt++; await guardar('corridas'); await evento(re ? 'REIMPRESION_ETIQUETAS' : 'IMPRESION_ETIQUETAS', `Corrida ${c.id} ${g || 'todas las líneas'}`); renderTab(); };
ACT.impHo = async el => { const c = corridaPorId(el.dataset.c2), g = el.dataset.g || ''; const re = c.impHo > 0; await imprimir(htmlHojas(c, g), 'sheet'); c.impHo++; await guardar('corridas'); await evento(re ? 'REIMPRESION_HOJAS' : 'IMPRESION_HOJAS', `Corrida ${c.id} ${g || 'todas las líneas'}`); renderTab(); };

/* =================== SEGUIMIENTO =================== */
const EST = { POR_SURTIR: ['Por surtir', 'r'], SEGUIMIENTO: ['En seguimiento', 'o'], CORTO: ['Corto', 'v'] };
const heredado = t => { const a = turnoActual(); return t.fechaOp !== a.fechaOp || t.turno !== a.turno.id; };
const segFiltra = () => { const F = V.segF, q = F.q.toUpperCase(); return S.seg.tickets.filter(t => (!F.est || t.estado === F.est) && (!F.grp || t.grupo === F.grp) && (!F.mon || t.monta === F.mon) && (!q || (t.folio + ' ' + t.item + ' ' + t.loc + ' ' + t.linea + ' ' + t.desc + ' ' + t.monta).toUpperCase().includes(q))); };
const montasAbiertas = () => { const m = {}; for (const t of S.seg.tickets) if (t.tipo === 'TICKET' && t.monta) (m[t.monta] = m[t.monta] || []).push(t); return m; };
function vSeguimiento() {
  const F = V.segF, all = S.seg.tickets, rows = segFiltra(), mo = montasAbiertas(), moK = Object.keys(mo).sort();
  const gs = [...new Set(all.map(t => t.grupo))], cnt = e => all.filter(t => t.estado === e).length, her = all.filter(t => t.tipo === 'TICKET' && heredado(t)).length;
  return roNote() + `<div class="grid g5" style="margin-bottom:14px"><div class="kpi r"><span>Por surtir</span><b>${cnt('POR_SURTIR')}</b></div><div class="kpi o"><span>En seguimiento</span><b>${cnt('SEGUIMIENTO')}</b></div><div class="kpi v"><span>Cortos (sin inventario)</span><b>${cnt('CORTO')}</b></div><div class="kpi b"><span>Heredados de turnos anteriores</span><b>${her}</b></div><div class="kpi g" data-a="segMontas" style="cursor:pointer" data-tip="Clic para ver el detalle por montacarguista"><span>Montacarguistas activos</span><b>${moK.length}</b><small>con tickets abiertos</small></div></div>
  <div class="card"><h3>Tickets abiertos <span class="right row"><input placeholder="Buscar folio, ítem, ubicación…" data-i="segQ" value="${esc(F.q)}" id="seg-q" style="width:220px"><select data-c="segEst"><option value="">Todos los estatus</option>${Object.keys(EST).map(e => `<option value="${e}" ${F.est === e ? 'selected' : ''}>${EST[e][0]}</option>`).join('')}</select><select data-c="segGrp"><option value="">Todas las líneas</option>${gs.map(g => `<option ${F.grp === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select><select data-c="segMon"><option value="">Todos los montacarguistas</option>${moK.map(g => `<option ${F.mon === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select><button class="btn s" data-a="montaBloque" ${puedeEditar() ? '' : 'disabled'}>Reasignar en bloque</button></span></h3>
  <div class="tw" id="seg-tw">${tablaSeg(rows)}</div><p class="sm mut">«Completo» cierra el ticket con la cantidad pedida. «Capturar» permite otra cantidad, comentarios y supervisor de cierre. El montacarguista se cambia en la lista de cada renglón y queda registrado. Escribe el folio y presiona Enter para capturarlo directo.</p></div>`;
}
function tablaSeg(rows) {
  const e = puedeEditar() ? '' : 'disabled', cat = usuariosRol('montacarguista').map(u => u.nombre);
  const selM = t => { const ops = cat.includes(t.monta) || !t.monta ? cat : [t.monta, ...cat]; return `<select class="selm" data-c="segMonta" data-f="${esc(t.folio)}" ${e}>${t.monta ? '' : '<option value="">—</option>'}${ops.map(o => `<option ${o === t.monta ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${(t.cambiosMonta || []).length ? ` <span class="tag k" data-tip="${esc(t.cambiosMonta.map(x => x.de + ' → ' + x.a + ' (' + x.fecha.slice(5, 16) + ', ' + x.por + ')').join(' · '))}">↪ ${t.cambiosMonta.length}</span>` : ''}`; };
  return `<table class="t seg"><tr><th>Folio</th><th>Estatus</th><th>Línea</th><th>Ítem</th><th>Descripción</th><th>Ubicación</th><th class="n">Pedido</th><th>Montacarguista</th><th>Req. · Impreso</th><th>Responsable</th><th></th></tr>${rows.slice(0, 400).map(t => `<tr><td class="b">${esc(t.folio)}</td><td><span class="tag ${EST[t.estado][1]}">${EST[t.estado][0]}</span>${heredado(t) ? ' <span class="tag k">heredado</span>' : ''}</td><td>${esc(t.linea)}${t.jaula ? ' <span class="tag o">JAULA</span>' : ''}</td><td class="b">${esc(t.item)}</td><td class="d" data-tip="${esc(t.desc)}">${esc(t.desc)}</td><td>${esc(t.loc)}</td><td class="n b">${nf(t.qty)}${t.pallets ? ` <span class="tag v">P×${t.pallets}</span>` : ''}</td><td>${t.tipo === 'TICKET' ? selM(t) : ''}</td><td>${esc(t.prioridad || '—')} · ${esc(t.fechaImp.slice(5, 16))} ${esc(t.turno)}</td><td>${esc(t.supSeg || t.encargado)}${t.transferencias.length ? ` <span class="tag k" data-tip="${esc(t.transferencias.map(x => x.de + ' → ' + x.a + ' (' + x.fecha.slice(5, 16) + ')').join(' · '))}">↪ ${t.transferencias.length}</span>` : ''}</td>
  <td>${t.tipo === 'TICKET' ? `<button class="btn s g" data-a="segOk" data-f="${esc(t.folio)}" ${e}>Completo</button> ` : ''}<button class="btn s p" data-a="segCap" data-f="${esc(t.folio)}" ${e}>Capturar</button> <button class="btn s" data-a="segTr" data-f="${esc(t.folio)}" data-tip="Pasar a seguimiento de otro supervisor" ${e}>Seguim.</button>${t.tipo === 'TICKET' ? ` <button class="btn s" data-a="segRe" data-f="${esc(t.folio)}" data-tip="Reimprimir etiqueta" ${e}>Reimp.</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="11" class="mut" style="padding:20px;text-align:center">Sin tickets abiertos.</td></tr>'}</table>${rows.length > 400 ? `<p class="sm mut" style="padding:8px">Mostrando 400 de ${rows.length}. Usa el buscador.</p>` : ''}`;
}
CHG.segQ = el => { V.segF.q = el.value; $('#seg-tw').innerHTML = tablaSeg(segFiltra()); };
CHG.segEst = el => { V.segF.est = el.value; renderTab(); }; CHG.segGrp = el => { V.segF.grp = el.value; renderTab(); }; CHG.segMon = el => { V.segF.mon = el.value; renderTab(); };
function cambiaMonta(t, nuevo) { const ant = t.monta || '—'; t.cambiosMonta = (t.cambiosMonta || []).concat({ de: ant, a: nuevo, fecha: nowIso(), por: S.user.nombre }); t.monta = nuevo; return ant; }
CHG.segMonta = async el => {
  if (!puedeEditar()) throw new Error('Estás en modo lectura.');
  const t = S.seg.tickets.find(x => x.folio === el.dataset.f), nuevo = el.value; if (!t || !nuevo || nuevo === t.monta) return;
  const ant = cambiaMonta(t, nuevo); await guardar('seg'); await evento('CAMBIO_MONTACARGUISTA', `${t.folio}: ${ant} → ${nuevo}`); render(); toast(`${t.folio}: montacarguista ${nuevo}`);
  if (await dlg({ titulo: 'Montacarguista cambiado', msg: `${t.folio}: ${ant} → ${nuevo}.\nLa etiqueta ya impresa conserva el nombre anterior. ¿Quieres reimprimirla con el nuevo?`, ok: 'Reimprimir etiqueta', cancel: 'Dejar como está' })) { await imprimir(htmlEtiqueta(t, true), 'label'); t.reimp = (t.reimp || 0) + 1; await guardar('seg'); await evento('REIMPRESION_TICKET', t.folio + ' (cambio de montacarguista)'); }
};
ACT.segMontas = () => {
  const mo = montasAbiertas(), ks = Object.keys(mo).sort((a, b) => mo[b].length - mo[a].length), mx = Math.max(1, ...ks.map(k => mo[k].length));
  modal(`<div class="row"><h3>Montacarguistas activos <span class="tag b">${ks.length}</span></h3><button class="btn right" data-a="cerrarModal">Cerrar</button></div><div class="tw" style="margin-top:10px"><table class="t"><tr><th>Montacarguista</th><th>Líneas</th><th class="n">Abiertos</th><th class="n">Por surtir</th><th class="n">En seguimiento</th><th class="n">Heredados</th><th style="width:26%">Carga</th><th></th></tr>${ks.map(k => { const a = mo[k]; return `<tr><td class="b">${esc(k)}</td><td>${esc([...new Set(a.map(t => t.grupo))].join(', '))}</td><td class="n b">${a.length}</td><td class="n">${a.filter(t => t.estado === 'POR_SURTIR').length}</td><td class="n">${a.filter(t => t.estado === 'SEGUIMIENTO').length}</td><td class="n">${a.filter(heredado).length}</td><td><div class="bar"><i style="width:${a.length / mx * 100}%"></i></div></td><td><button class="btn s" data-a="segVerMonta" data-m="${esc(k)}">Ver tickets</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="mut" style="padding:18px;text-align:center">Nadie tiene tickets abiertos.</td></tr>'}</table></div><p class="sm mut">Activo = montacarguista con al menos un ticket abierto en este momento.</p>`, true);
};
ACT.segVerMonta = el => { V.segF.mon = el.dataset.m; cerrarModal(); renderTab(); };
ACT.montaBloque = () => {
  const mo = montasAbiertas(), ks = Object.keys(mo).sort(), cat = usuariosRol('montacarguista').map(u => u.nombre); if (!ks.length) throw new Error('No hay tickets abiertos con montacarguista.');
  modal(`<h3>Reasignar tickets en bloque</h3><p class="mut sm">Pasa todos los tickets abiertos de un montacarguista a otro (cambio de turno o ausencia). Queda registrado en cada ticket.</p>
  <label class="f">De<select id="mb-de">${ks.map(k => `<option value="${esc(k)}" ${k === V.segF.mon ? 'selected' : ''}>${esc(k)} · ${mo[k].length} tickets</option>`).join('')}</select></label>
  <label class="f">A<select id="mb-a">${cat.map(k => `<option>${esc(k)}</option>`).join('')}</select></label>
  <div class="row" style="margin-top:14px"><button class="btn p" data-a="montaBloqueOk">Reasignar</button><button class="btn" data-a="cerrarModal">Cancelar</button></div><div class="err" id="mb-err"></div>`);
};
ACT.montaBloqueOk = async () => {
  const de = $('#mb-de').value, a = $('#mb-a').value; if (!a) throw new Error('No hay montacarguistas en el catálogo.'); if (de === a) { $('#mb-err').textContent = 'Elige un montacarguista distinto.'; return; }
  const ts = S.seg.tickets.filter(t => t.tipo === 'TICKET' && t.monta === de); ts.forEach(t => cambiaMonta(t, a));
  await guardar('seg'); await evento('CAMBIO_MONTACARGUISTA_BLOQUE', `${ts.length} tickets: ${de} → ${a}`); if (V.segF.mon === de) V.segF.mon = ''; cerrarModal(); render(); toast(`${ts.length} tickets pasaron de ${de} a ${a}.`);
};
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'seg-q') { const q = ev.target.value.trim().toUpperCase(), t = S.seg.tickets.find(x => x.folio === q); if (t && puedeEditar()) modalCaptura(t); } if (ev.key === 'Escape') cerrarModal(); });
const tkAbierto = f => { const t = S.seg.tickets.find(x => x.folio === f); if (!t) throw new Error('El ticket ' + f + ' ya no está abierto.'); return t; };
const HCOLS = ['folio', 'tipo', 'estadoFinal', 'fechaOp', 'turno', 'linea', 'grupo', 'almacen', 'wh', 'item', 'desc', 'router', 'prioridad', 'qtySolicitada', 'qty', 'qtySurtida', 'dif', 'alerta', 'loc', 'stock', 'pallets', 'jaula', 'solicitante', 'supCliente', 'creadoSS', 'corrida', 'fechaImp', 'capturista', 'encargado', 'monta', 'supSeg', 'supCierre', 'cerradoPor', 'fechaCierre', 'fechaOpCierre', 'turnoCierre', 'comentarios', 'notaCero', 'transferencias', 'reimp', 'cambiosMonta'];
async function cerrarTicket(t, { qty, com, sup, nota }) {
  if (!puedeEditar()) throw new Error('Estás en modo lectura.');
  qty = +qty; if (!(qty >= 0)) throw new Error('Cantidad inválida.');
  const corto = t.tipo === 'CORTO';
  if (qty === 0 && !corto) { if (!esSup()) throw new Error('Solo un supervisor o administrador puede cerrar un ticket en 0.'); if (QS.norm(nota).length < 10) throw new Error('Explica por qué se cierra en 0 (mínimo 10 caracteres).'); }
  if (corto && QS.norm(com).length < 3 && qty === 0) throw new Error('Escribe un comentario para cerrar el corto.');
  const dif = qty - t.qty, a = turnoActual();
  if (!corto && dif !== 0 && qty > 0 && S.config.notaDif && !QS.norm(com)) throw new Error('Hay diferencia contra lo pedido: el comentario es obligatorio.');
  const rec = { ...t, estadoFinal: corto ? (qty > 0 ? 'CORTO_SURTIDO' : 'CORTO_CERRADO') : qty === 0 ? 'CERRADO_CERO' : 'CONFIRMADO', qtySurtida: qty, dif, alerta: dif < 0 ? 'MENOS' : dif > 0 ? 'MAS' : '', comentarios: QS.norm(com), supCierre: sup || t.supSeg || t.encargado, cerradoPor: S.user.nombre, fechaCierre: nowIso(), fechaOpCierre: a.fechaOp, turnoCierre: a.turno.id, notaCero: qty === 0 ? QS.norm(nota) : '' };
  if (!(await verificaCandado())) throw new Error('Perdiste el control de edición. Otro usuario lo tomó.');
  await FS.append('historial/tickets_' + t.fechaOp.slice(0, 7) + '.txt', QS.tsvLine(rec, HCOLS) + '\n', HCOLS.join('\t'));
  if (rec.estadoFinal === 'CERRADO_CERO') {
    const ACOLS = ['fechaCierre', 'folio', 'linea', 'item', 'desc', 'loc', 'qty', 'cerradoPor', 'supCierre', 'encargado', 'capturista', 'monta', 'fechaImp', 'notaCero', 'comentarios'], line = QS.tsvLine(rec, ACOLS) + '\n';
    await FS.append(AUDIT, line, ACOLS.join('\t'));
    try { const ah = await IDB.get('audit'); if (ah && (await ah.queryPermission({ mode: 'readwrite' })) === 'granted') await FS.append('', line, ACOLS.join('\t'), ah); } catch (e) { console.warn('auditoría externa', e); }
  }
  S.seg.tickets = S.seg.tickets.filter(x => x.folio !== t.folio); HIST.cache = {};
  await guardar('seg'); await evento('CIERRE_' + rec.estadoFinal, `${t.folio} pedido ${t.qty} surtido ${qty}`);
  return rec;
}
ACT.segOk = async el => { const t = tkAbierto(el.dataset.f); await cerrarTicket(t, { qty: t.qty, com: '', sup: '' }); render(); toast(t.folio + ' cerrado completo.'); };
ACT.segCap = el => modalCaptura(tkAbierto(el.dataset.f));
function modalCaptura(t) {
  const sups = usuariosRol('supervisor', 'administrador'), corto = t.tipo === 'CORTO';
  modal(`<h3>${corto ? 'Cerrar corto' : 'Capturar surtido'} · ${esc(t.folio)}</h3><p class="mut sm">${esc(t.linea)} · <b>${esc(t.item)}</b> · ${esc(t.desc)}<br>Ubicación <b>${esc(t.loc)}</b> · Pedido <b>${nf(t.qty)}</b>${t.pallets ? ' (pallet completo ×' + t.pallets + ')' : ''}</p>
  <label class="f">Cantidad realmente surtida<input id="c-qty" type="number" min="0" step="any" value="${corto ? 0 : t.qty}" autofocus data-i="capQty" data-req="${t.qty}" data-corto="${corto ? 1 : ''}"></label><div id="c-al"></div>
  <label class="f">Comentarios<textarea id="c-com" rows="2"></textarea></label>
  <label class="f">Supervisor de cierre<select id="c-sup">${sups.map(u => `<option ${u.nombre === (t.supSeg || t.encargado) ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select></label>
  <div id="c-cero" class="hidden"><label class="f">¿Por qué quieres cerrar en 0 este ticket? (obligatorio, queda para auditoría)<textarea id="c-nota" rows="3"></textarea></label></div>
  <div class="row" style="margin-top:14px"><button class="btn p" data-a="capGuardar" data-f="${esc(t.folio)}">Guardar cierre</button><button class="btn" data-a="cerrarModal">Cancelar</button></div><div class="err" id="c-err"></div>`);
  CHG.capQty($('#c-qty'));
}
CHG.capQty = el => {
  const q = parseFloat(el.value), req = +el.dataset.req, al = $('#c-al'), corto = !!el.dataset.corto; if (!al) return;
  $('#c-cero').classList.toggle('hidden', !(q === 0 && !corto));
  al.innerHTML = isNaN(q) || corto ? '' : q === 0 ? `<div class="note" style="margin-top:8px">⚠ Cierre en 0. ${esSup() ? 'Requiere explicación obligatoria.' : '<b>Solo un supervisor o administrador puede hacerlo.</b>'}</div>` : q < req ? `<div class="note" style="margin-top:8px">⚠ Se entregó <b>de menos</b>: faltan ${nf(req - q)} de ${nf(req)}.</div>` : q > req ? `<div class="note" style="margin-top:8px">⚠ Se entregó <b>de más</b>: ${nf(q - req)} arriba de lo pedido.</div>` : '';
};
ACT.capGuardar = async el => { try { const t = tkAbierto(el.dataset.f); const r = await cerrarTicket(t, { qty: $('#c-qty').value, com: $('#c-com').value, sup: $('#c-sup').value, nota: $('#c-nota').value }); cerrarModal(); render(); toast(t.folio + ' cerrado' + (r.alerta ? ' con diferencia (' + (r.dif > 0 ? '+' : '') + nf(r.dif) + ').' : '.')); } catch (e) { const x = $('#c-err'); if (x) x.textContent = e.message; else throw e; } };
ACT.segTr = el => {
  const t = tkAbierto(el.dataset.f), sups = usuariosRol('supervisor', 'administrador'), act = t.supSeg || t.encargado;
  modal(`<h3>Pasar a seguimiento · ${esc(t.folio)}</h3><p class="mut sm">Responsable actual: <b>${esc(act)}</b>. Queda registro de quién lo dejó pendiente.</p>
  <label class="f">Supervisor de seguimiento<select id="t-sup">${sups.filter(u => u.nombre !== act).map(u => `<option>${esc(u.nombre)}</option>`).join('')}</select></label><label class="f">Motivo / nota<textarea id="t-mot" rows="2"></textarea></label>
  ${t.transferencias.length ? `<p class="sm mut">Historial: ${t.transferencias.map(x => esc(x.de + ' → ' + x.a + ' (' + x.fecha.slice(5, 16) + ')')).join(' · ')}</p>` : ''}
  <div class="row" style="margin-top:14px"><button class="btn p" data-a="trGuardar" data-f="${esc(t.folio)}">Transferir</button><button class="btn" data-a="cerrarModal">Cancelar</button></div>`);
};
ACT.trGuardar = async el => {
  const t = tkAbierto(el.dataset.f), a = $('#t-sup').value; if (!a) throw new Error('No hay otro supervisor en el catálogo.');
  t.transferencias.push({ de: t.supSeg || t.encargado, a, fecha: nowIso(), por: S.user.nombre, motivo: QS.norm($('#t-mot').value) }); t.supSeg = a; if (t.tipo === 'TICKET') t.estado = 'SEGUIMIENTO';
  await guardar('seg'); await evento('SEGUIMIENTO', `${t.folio} → ${a}`); cerrarModal(); render();
};
ACT.segRe = async el => { const t = tkAbierto(el.dataset.f); await imprimir(htmlEtiqueta(t, true), 'label'); t.reimp = (t.reimp || 0) + 1; await guardar('seg'); await evento('REIMPRESION_TICKET', t.folio); };

/* =================== HISTORIAL =================== */
const HIST = {
  cache: {},
  async meses() { const out = []; try { const d = await FS.dir.getDirectoryHandle('historial'); for await (const n of d.keys()) { const m = /^tickets_(\d{4}-\d{2})\.txt$/.exec(n); if (m) out.push(m[1]); } } catch (e) { } return out.sort().reverse(); },
  async mes(m) { const name = 'historial/tickets_' + m + '.txt', mod = await FS.mod(name); if (!mod) return []; const c = this.cache[m]; if (c && c.mod === mod) return c.rows; const rows = QS.tsvParse(await FS.read(name)).map(r => ({ ...r, qty: +r.qty, qtySurtida: +r.qtySurtida, dif: +r.dif, qtySolicitada: +r.qtySolicitada, pallets: +r.pallets || 0, jaula: r.jaula === 'true' })); this.cache[m] = { mod, rows }; return rows; },
  async rango(desde, hasta) { // tickets (cerrados + abiertos) con fechaOp en [desde,hasta]
    const ms = new Set(); const d = new Date(desde + 'T12:00'); d.setDate(1); const fin = hasta.slice(0, 7);
    while (QS.ymd(d).slice(0, 7) <= fin) { ms.add(QS.ymd(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
    const map = new Map();
    for (const t of S.seg.tickets) if (t.fechaOp >= desde && t.fechaOp <= hasta) map.set(t.folio, t);
    for (const m of ms) for (const r of await this.mes(m)) if (r.fechaOp >= desde && r.fechaOp <= hasta) map.set(r.folio, r);
    return [...map.values()];
  }
};
const EF = { CONFIRMADO: ['Confirmado', 'g'], CERRADO_CERO: ['Cerrado en 0', 'v'], CORTO_CERRADO: ['Corto cerrado', 'k'], CORTO_SURTIDO: ['Corto surtido', 'b'] };
async function vHistorial() {
  const H = V.hist, meses = await HIST.meses(); if (!H.mes || !meses.includes(H.mes)) H.mes = meses[0] || QS.ymd(new Date()).slice(0, 7);
  const subs = [['tickets', 'Tickets cerrados'], ['cero', 'Cierres en 0'], ['dif', 'Con diferencia'], ['eventos', 'Bitácora de eventos']];
  if (esAdmin()) subs.push(['exp0', 'Exportar cierres en 0']);
  if (H.sub === 'exp0' && !esAdmin()) H.sub = 'tickets';
  let body = '';
  if (H.sub === 'exp0') {
    body = await zeroForm(H);
  } else if (H.sub === 'eventos') {
    const t = await FS.read('historial/eventos_' + H.mes + '.txt'); const ev = t ? QS.tsvParse(t).reverse() : [];
    body = `<table class="t"><tr><th>Fecha</th><th>Usuario</th><th>Evento</th><th>Detalle</th></tr>${ev.slice(0, 500).map(e => `<tr><td>${esc(e.fecha)}</td><td>${esc(e.usuario)}</td><td><span class="tag k">${esc(e.evento)}</span></td><td>${esc(e.detalle)}</td></tr>`).join('')}</table>`;
  } else {
    let rows = (await HIST.mes(H.mes)).slice().reverse(); const q = H.q.toUpperCase();
    if (H.sub === 'cero') rows = rows.filter(r => r.estadoFinal === 'CERRADO_CERO'); if (H.sub === 'dif') rows = rows.filter(r => r.alerta && r.estadoFinal === 'CONFIRMADO');
    if (q) rows = rows.filter(r => (r.folio + ' ' + r.item + ' ' + r.linea + ' ' + r.loc + ' ' + r.cerradoPor + ' ' + r.supCierre).toUpperCase().includes(q));
    H.rows = rows;
    body = `<table class="t"><tr><th>Folio</th><th>Resultado</th><th>Línea</th><th>Ítem</th><th>Ubicación</th><th class="n">Pedido</th><th class="n">Surtido</th><th class="n">Dif.</th><th>Impreso</th><th>Cerrado</th><th>Cerró</th><th>Sup. cierre</th><th>Comentarios / nota</th></tr>${rows.slice(0, 500).map(r => `<tr><td class="b">${esc(r.folio)}</td><td><span class="tag ${(EF[r.estadoFinal] || ['', 'k'])[1]}">${esc((EF[r.estadoFinal] || [r.estadoFinal])[0])}</span></td><td>${esc(r.linea)}</td><td class="b">${esc(r.item)}</td><td>${esc(r.loc)}</td><td class="n">${nf(r.qty)}</td><td class="n b">${nf(r.qtySurtida)}</td><td class="n">${r.dif ? `<span class="tag ${r.dif < 0 ? 'r' : 'o'}">${r.dif > 0 ? '+' : ''}${nf(r.dif)}</span>` : ''}</td><td>${esc(r.fechaImp.slice(5, 16))}</td><td>${esc(r.fechaCierre.slice(5, 16))}</td><td>${esc(r.cerradoPor)}</td><td>${esc(r.supCierre)}</td><td>${esc(r.notaCero ? '⛔ ' + r.notaCero : r.comentarios)}${r.transferencias && r.transferencias !== '[]' ? ' <span class="tag k">con transferencia</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="13" class="mut" style="padding:20px;text-align:center">Sin registros.</td></tr>'}</table>${rows.length > 500 ? `<p class="sm mut" style="padding:8px">Mostrando 500 de ${rows.length}. Exporta para ver todo.</p>` : ''}`;
  }
  return `<div class="card"><h3>Historial <span class="row">${subs.map(s => `<button class="btn s ${H.sub === s[0] ? 'n' : ''}" data-a="histSub" data-s="${s[0]}">${s[1]}</button>`).join('')}</span>
  <span class="right row"><select data-c="histMes">${(meses.length ? meses : [H.mes]).map(m => `<option ${m === H.mes ? 'selected' : ''}>${m}</option>`).join('')}</select>${H.sub !== 'eventos' && H.sub !== 'exp0' ? `<input placeholder="Buscar…" value="${esc(H.q)}" data-c="histQ" style="width:200px"><button class="btn" data-a="histCsv">Exportar CSV</button>` : ''}</span></h3>
  <div class="tw">${body}</div><p class="sm mut">Archivos: <code>historial/tickets_${H.mes}.txt</code> · <code>historial/eventos_${H.mes}.txt</code> · <code>${AUDIT}</code> (texto separado por tabuladores, se abre en Excel o Bloc de notas).</p></div>`;
}
ACT.histSub = el => { V.hist.sub = el.dataset.s; renderTab(); }; CHG.histMes = el => { V.hist.mes = el.value; renderTab(); }; CHG.histQ = el => { V.hist.q = el.value; renderTab(); };
function descargar(nombre, texto) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv' })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
// Exportación de cierres en 0 (solo administrador): rango por fecha de cierre o historial completo
async function zeroRows(d1, d2) {
  const out = [];
  for (const m of await HIST.meses()) for (const r of await HIST.mes(m)) {
    if (r.estadoFinal !== 'CERRADO_CERO') continue;
    const f = (r.fechaCierre || '').slice(0, 10);
    if ((!d1 || f >= d1) && (!d2 || f <= d2)) out.push(r);
  }
  return out.sort((a, b) => (a.fechaCierre || '').localeCompare(b.fechaCierre || ''));
}
async function zeroForm(H) {
  if (!H.zDesde) H.zDesde = QS.ymd(new Date()).slice(0, 8) + '01';
  if (!H.zHasta) H.zHasta = QS.ymd(new Date());
  const rows = await zeroRows(H.zTodo ? '' : H.zDesde, H.zTodo ? '' : H.zHasta);
  H.zRows = rows;
  return `<div style="padding:12px;display:grid;gap:12px;max-width:520px">
    <p>Exporta a CSV los tickets cerrados en 0 según su fecha de cierre. El archivo incluye la nota de cierre y quién cerró.</p>
    <label class="row"><input type="checkbox" data-c="zTodo" ${H.zTodo ? 'checked' : ''}> Todo el historial</label>
    <label class="row">Desde <input type="date" data-c="zDesde" value="${H.zDesde}" ${H.zTodo ? 'disabled' : ''}></label>
    <label class="row">Hasta <input type="date" data-c="zHasta" value="${H.zHasta}" ${H.zTodo ? 'disabled' : ''}></label>
    <p class="mut">Coinciden <b>${rows.length}</b> cierres en 0 con este criterio.</p>
    <div><button class="btn n" data-a="zExp" ${rows.length ? '' : 'disabled'}>Exportar CSV</button></div>
  </div>`;
}
CHG.zTodo = el => { V.hist.zTodo = el.checked; renderTab(); };
CHG.zDesde = el => { V.hist.zDesde = el.value; renderTab(); };
CHG.zHasta = el => { V.hist.zHasta = el.value; renderTab(); };
ACT.zExp = async () => {
  soloAdmin();
  const H = V.hist, d1 = H.zTodo ? '' : H.zDesde, d2 = H.zTodo ? '' : H.zHasta;
  if (!H.zTodo && (!d1 || !d2)) throw new Error('Elige las fechas desde y hasta, o marca Todo el historial.');
  if (d1 && d2 && d1 > d2) throw new Error('La fecha "Desde" es posterior a "Hasta".');
  const rows = await zeroRows(d1, d2);
  if (!rows.length) { toast('No hay cierres en 0 en ese criterio.'); return; }
  const c = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  descargar(`cierres_cero_${d1 || 'inicio'}_${d2 || 'hoy'}.csv`, HCOLS.map(c).join(',') + '\n' + rows.map(o => HCOLS.map(k => c(o[k])).join(',')).join('\n'));
};
ACT.histCsv = () => { const r = V.hist.rows || []; const c = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; descargar(`historial_${V.hist.mes}_${V.hist.sub}.csv`, HCOLS.map(c).join(',') + '\n' + r.map(o => HCOLS.map(k => c(o[k])).join(',')).join('\n')); };

/* =================== INVENTARIOS Y CATÁLOGOS =================== */
function vInventarios() {
  const card = k => { const v = S.inv[k], n = k.toUpperCase(); return `<div class="card"><h3>Inventario ${n} ${v ? `<span class="tag g">${v.rows.length.toLocaleString()} ubicaciones con stock</span>` : '<span class="tag r">sin cargar</span>'}</h3>
   ${v ? `<p class="sm mut">Archivo <b>${esc(v.archivo)}</b> · cargado ${esc(v.cargado)} por ${esc(v.por)} · ${nf(v.rows.reduce((a, r) => a + r.qty, 0))} piezas disponibles (ya descontado lo asignado en tickets).</p>` : '<p class="sm mut">Carga el reporte en Excel (.xlsx).</p>'}
   <p class="sm mut">${k === 'baan' ? 'Reporte BAAN pdsinv001: los espacios de todas las celdas se limpian solos.' : 'Reporte LN whinr1540m000.'} Se excluye la ubicación Z000INS y lo que esté en 0. <b>Cargar un inventario nuevo reemplaza el anterior y borra los descuentos acumulados.</b></p>
   <input type="file" accept=".xlsx,.xlsm" data-c="invFile" data-k="${k}" ${puedeEditar() ? '' : 'disabled'}></div>`; };
  const q = QS.key(V.invQ); let cons = '';
  if (q.length >= 3) { const rs = []; for (const k of ['ln', 'baan']) if (S.inv[k]) for (const r of S.inv[k].rows) if (r.item.includes(q)) rs.push({ ...r, k, p: S.cat.prio[k][r.loc] != null ? S.cat.prio[k][r.loc] : (k === 'ln' ? 9 : 5) }); rs.sort((a, b) => a.item.localeCompare(b.item) || a.k.localeCompare(b.k) || a.p - b.p); cons = `<div class="tw" style="max-height:300px;margin-top:10px"><table class="t"><tr><th>Sistema</th><th>Ítem</th><th>Descripción</th><th>Ubicación</th><th class="n">Disponible</th><th class="n">Prioridad</th><th></th></tr>${rs.slice(0, 200).map(r => `<tr><td>${r.k.toUpperCase()}</td><td class="b">${esc(r.item)}</td><td>${esc(r.desc)}</td><td class="b">${esc(r.loc)}</td><td class="n">${nf(r.qty)}</td><td class="n">${r.p}</td><td>${r.k === 'ln' && S.cat.jaula.includes(r.item) ? '<span class="tag o">JAULA</span>' : ''}${S.cat.pallets[r.item] ? `<span class="tag v">Pallet ${S.cat.pallets[r.item]}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="mut">Sin existencias.</td></tr>'}</table></div>`; }
  const e = puedeEditar() && esSup() ? '' : 'disabled', I = S.cat.info || {};
  return roNote() + `<div class="grid g2">${card('ln')}${card('baan')}</div>
  <div class="card"><h3>Consulta de existencias</h3><input placeholder="Número de parte (mínimo 3 caracteres)" value="${esc(V.invQ)}" data-c="invQ" style="width:320px">${cons}</div>
  <div class="grid g3"><div class="card"><h3>Jaula (solo LN) <span class="tag o">${S.cat.jaula.length} ítems</span></h3><p class="sm mut">Excel o CSV con el número de parte en la columna A. Sus tickets y hoja salen aparte. ${I.jaula ? 'Última carga: ' + esc(I.jaula) : ''}</p><input type="file" accept=".xlsx,.xlsm,.csv,.txt" data-c="catFile" data-k="jaula" ${e}><div class="row" style="margin-top:8px"><button class="btn s" data-a="catEdit" data-k="jaula" ${e}>Ver / editar lista</button></div></div>
  <div class="card"><h3>Pallet completo <span class="tag v">${Object.keys(S.cat.pallets).length} ítems</span></h3><p class="sm mut">Excel o CSV: columna A número de parte, columna B cantidad estándar del pallet. ${I.pallets ? 'Última carga: ' + esc(I.pallets) : ''}</p><input type="file" accept=".xlsx,.xlsm,.csv,.txt" data-c="catFile" data-k="pallets" ${e}><div class="row" style="margin-top:8px"><button class="btn s" data-a="catEdit" data-k="pallets" ${e}>Ver / editar lista</button></div></div>
  <div class="card"><h3>Prioridad de ubicaciones <span class="tag k">LN ${Object.keys(S.cat.prio.ln).length} · BAAN ${Object.keys(S.cat.prio.baan).length}</span></h3><p class="sm mut">Número menor se surte primero. Ubicación que no esté en la lista: LN = 9, BAAN = 5 (igual que la macro).</p><div class="row"><button class="btn s" data-a="catEdit" data-k="prio-ln" ${e}>Editar LN</button><button class="btn s" data-a="catEdit" data-k="prio-baan" ${e}>Editar BAAN</button></div></div></div>
  <p class="sm mut">Catálogos: solo supervisor o administrador.</p>`;
}
CHG.invQ = el => { V.invQ = el.value; renderTab(); };
CHG.invFile = async el => {
  const f = el.files[0], k = el.dataset.k; if (!f) return;
  const listo = await ocupado('Leyendo ' + f.name + '…'); let p; try { p = QS.parseInventario(await QS.readXlsx(await f.arrayBuffer()), k.toUpperCase()); } finally { listo(); }
  const otro = k === 'ln' ? /^ORW$/ : /^ELCM/; if (p.rows.filter(r => otro.test(r.wh)).length > p.rows.length / 2 && !(await dlg({ titulo: 'Revisa el archivo', msg: 'Este archivo parece ser del otro sistema. ¿Cargarlo de todos modos como ' + k.toUpperCase() + '?', ok: 'Cargar de todos modos', peligro: true }))) { el.value = ''; return; }
  if (S.inv[k] && !(await dlg({ titulo: 'Reemplazar inventario ' + k.toUpperCase(), msg: 'Se reemplaza el inventario actual y se borran los descuentos acumulados.', ok: 'Reemplazar' }))) { el.value = ''; return; }
  S.inv[k] = { archivo: f.name, cargado: nowIso(), por: S.user.nombre, rows: p.rows };
  await guardar('inv' + k); await evento('INVENTARIO_' + k.toUpperCase(), `${f.name}: ${p.rows.length} ubicaciones, ${p.omitidos} omitidas`); render(); toast(`Inventario ${k.toUpperCase()} cargado: ${p.rows.length.toLocaleString()} ubicaciones.`);
};
function aplicarCatalogo(k, rows) {
  if (k === 'jaula') { const s = new Set(); for (const r of rows) { const v = QS.key(r[0]); if (v && !/PARTE|ITEM|SKU|NUMERO|NÚMERO/.test(v)) s.add(v); } S.cat.jaula = [...s]; return s.size; }
  if (k === 'pallets') { const o = {}; for (const r of rows) { const v = QS.key(r[0]), n = parseFloat(String(r[1] == null ? '' : r[1]).replace(/,/g, '')); if (v && n > 0) o[v] = n; } S.cat.pallets = o; return Object.keys(o).length; }
  const o = {}; for (const r of rows) { const v = QS.key(r[0]), n = parseInt(r[1], 10); if (v && n >= 0) o[v] = n; } S.cat.prio = { ...S.cat.prio, [k.slice(5)]: o }; return Object.keys(o).length;
}
CHG.catFile = async el => {
  const f = el.files[0], k = el.dataset.k; if (!f) return;
  const rows = /\.(csv|txt)$/i.test(f.name) ? QS.parseDelim(await f.text()) : await QS.readXlsx(await f.arrayBuffer());
  const n = aplicarCatalogo(k, rows); if (!n) throw new Error('No se reconoció ningún renglón en el archivo.');
  S.cat.info = { ...(S.cat.info || {}), [k]: nowIso().slice(0, 16) + ' · ' + f.name }; await guardar('cat'); await evento('CATALOGO_' + k.toUpperCase(), `${f.name}: ${n} ítems`); render(); toast(`Catálogo actualizado: ${n} ítems.`);
};
ACT.catEdit = el => {
  const k = el.dataset.k, txt = k === 'jaula' ? S.cat.jaula.join('\n') : Object.entries(k === 'pallets' ? S.cat.pallets : S.cat.prio[k.slice(5)]).map(e => e[0] + '\t' + e[1]).join('\n');
  modal(`<h3>${{ jaula: 'Ítems de jaula', pallets: 'Pallet completo', 'prio-ln': 'Prioridad de ubicaciones LN', 'prio-baan': 'Prioridad de ubicaciones BAAN' }[k]}</h3><p class="sm mut">${k === 'jaula' ? 'Un número de parte por renglón.' : 'Un renglón por registro: ' + (k === 'pallets' ? 'número de parte' : 'ubicación') + ', tabulador o coma, ' + (k === 'pallets' ? 'cantidad estándar' : 'prioridad') + '. Puedes pegar desde Excel.'}</p><textarea id="ce-t" rows="16" style="width:100%;font-family:Consolas,monospace">${esc(txt)}</textarea><div class="row" style="margin-top:12px"><button class="btn p" data-a="catSave" data-k="${k}">Guardar</button><button class="btn" data-a="cerrarModal">Cancelar</button></div>`);
};
ACT.catSave = async el => { const k = el.dataset.k, n = aplicarCatalogo(k, $('#ce-t').value.split('\n').map(l => l.split(/[\t,;]/))); S.cat.info = { ...(S.cat.info || {}), [k]: nowIso().slice(0, 16) + ' · edición manual' }; await guardar('cat'); await evento('CATALOGO_' + k.toUpperCase(), n + ' registros (manual)'); cerrarModal(); render(); toast('Guardado: ' + n + ' registros.'); };
