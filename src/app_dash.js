/* ===== QORVEX Surtido · Dashboards y configuración ===== */
const COL = { conf: '#16a34a', seg: '#f59e0b', por: '#e5484d', cero: '#7c5cd6', blue: '#1f6feb', teal: '#14b8a6' };
const D = { per: 7, grp: '', turno: '', sup: '', fecha: '' };
const addDias = (f, n) => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() + n); return QS.ymd(d); };
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaLbl = f => { const d = new Date(f + 'T12:00'); return DOW[d.getDay()] + ' ' + d.getDate(); };
function clase(fecha, turno) { // 'N' no laborable (fuera del métrico) · 'F' festivo laborado (cuenta, sin meta) · '' normal
  const c = S.config, f = c.festivos.find(x => x.fecha === fecha); if (f) return f.laborable ? 'F' : 'N';
  if ((c.noLab.semanal[new Date(fecha + 'T12:00').getDay()] || []).includes(turno)) return 'N';
  if (c.noLab.fechas.some(x => x.fecha === fecha && (x.turno === '*' || x.turno === turno))) return 'N';
  return '';
}
const st = t => t.estadoFinal === 'CONFIRMADO' ? 'conf' : t.estadoFinal === 'CERRADO_CERO' ? 'cero' : t.estado === 'SEGUIMIENTO' ? 'seg' : 'por';
const soloTk = a => a.filter(t => t.tipo === 'TICKET');
const filtra = a => a.filter(t => (!D.grp || t.grupo === D.grp) && (!D.turno || t.turno === D.turno) && (!D.sup || t.encargado === D.sup));
const cuenta = a => { const c = { conf: 0, seg: 0, por: 0, cero: 0, n: a.length }; for (const t of a) c[st(t)]++; return c; };
const moda = a => { const m = {}; let b = '', n = 0; for (const x of a) { m[x] = (m[x] || 0) + 1; if (m[x] > n) { n = m[x]; b = x; } } return b; };

/* ---------- gráficas SVG ---------- */
function donut(segs, centro, sub) {
  const tot = segs.reduce((a, s) => a + s.v, 0), R = 54, C = 2 * Math.PI * R; let off = 0;
  const arcs = tot ? segs.filter(s => s.v).map(s => { const l = s.v / tot * C, a = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${s.c}" stroke-width="24" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)" data-tip="${esc(s.n || '')} ${s.v} (${Math.round(s.v / tot * 100)}%)"/>`; off += l; return a; }).join('') : `<circle cx="75" cy="75" r="${R}" fill="none" stroke="#e6ebf3" stroke-width="24"/>`;
  return `<svg class="ch" viewBox="0 0 150 150" style="width:150px;flex:none">${arcs}<text x="75" y="74" text-anchor="middle" font-size="26" font-weight="800" fill="#14213d">${centro}</text><text x="75" y="92" text-anchor="middle" font-size="11" fill="#64748b">${sub}</text></svg>`;
}
function lineas(labels, series, opt = {}) {
  const W = 640, H = opt.h || 230, L = 38, Rm = 14, T = 14, B = 28, n = labels.length;
  const max = Math.max(1, ...series.flatMap(s => s.data)), top = Math.ceil(max / 4) * 4 || 4;
  const x = i => L + (n > 1 ? i * (W - L - Rm) / (n - 1) : (W - L - Rm) / 2), y = v => T + (H - T - B) * (1 - v / top);
  let g = ''; for (let k = 0; k <= 4; k++) { const v = top * k / 4; g += `<line x1="${L}" x2="${W - Rm}" y1="${y(v)}" y2="${y(v)}" stroke="#e6ebf3"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#64748b">${Math.round(v)}</text>`; }
  const step = Math.ceil(n / 12);
  labels.forEach((l, i) => { if (i % step === 0) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="${(opt.gris || [])[i] ? '#b6bfcc' : '#475569'}">${esc(l)}</text>`; });
  for (const s of series) {
    const pts = s.data.map((v, i) => x(i) + ',' + y(v)).join(' ');
    if (opt.area) g += `<polygon points="${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}" fill="${s.c}" opacity=".15"/>`;
    g += `<polyline points="${pts}" fill="none" stroke="${s.c}" stroke-width="2.5"/>` + s.data.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${s.c}" stroke="#fff" stroke-width="1.5" data-tip="${esc(labels[i])} · ${esc(s.n)}: ${v}"/>`).join('');
  }
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" style="width:100%;max-height:${H + 40}px">${g}</svg>`;
}
function barras(labels, vals, cols, h = 200) {
  const W = 420, L = 30, T = 20, B = 26, n = labels.length || 1, max = Math.max(1, ...vals), bw = Math.min(56, (W - L) / n * .6);
  let g = `<line x1="${L}" x2="${W}" y1="${h - B}" y2="${h - B}" stroke="#cbd5e1"/>`;
  labels.forEach((l, i) => { const cx = L + (i + .5) * (W - L) / n, bh = (h - T - B) * vals[i] / max; g += `<rect x="${cx - bw / 2}" y="${h - B - bh}" width="${bw}" height="${bh}" rx="4" fill="${cols[i % cols.length]}" data-tip="${esc(l)}: ${vals[i]}"/><text x="${cx}" y="${h - B - bh - 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#14213d">${vals[i]}</text><text x="${cx}" y="${h - 8}" text-anchor="middle" font-size="10.5" fill="#475569">${esc(String(l).slice(0, 12))}</text>`; });
  return `<svg class="ch" viewBox="0 0 ${W} ${h}" style="width:100%;max-height:${h + 40}px">${g}</svg>`;
}
function barrasMeta(labels, vals, metas, keys, h = 250) {
  const W = 900, L = 8, T = 24, B = 28, n = labels.length, max = Math.max(1, ...vals, ...metas) * 1.12, slot = (W - L) / n, bw = slot - 10, y = v => T + (h - T - B) * (1 - v / max);
  let g = `<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c1dc"/><stop offset="1" stop-color="#1d6fe0"/></linearGradient><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34c77b"/><stop offset="1" stop-color="#178a47"/></linearGradient></defs><line x1="${L}" x2="${W}" y1="${h - B}" y2="${h - B}" stroke="#c9d3e0" stroke-width="2"/>`;
  labels.forEach((l, i) => { const x = L + i * slot + 5, v = vals[i], m = metas[i], bh = v ? Math.max(h - B - y(v), 3) : 2;
    g += `<rect x="${x}" y="${h - B - bh}" width="${bw}" height="${bh}" rx="5" fill="${!v ? (m ? '#f59e0b' : '#dbe3ee') : m && v >= m ? 'url(#gg)' : 'url(#gb)'}" ${keys ? keys[i] : ''} data-tip="${esc(l)} h · ${v} cerrados${m ? ' · meta ' + m : ''}"/>${v ? `<text x="${x + bw / 2}" y="${h - B - bh - 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f1e3d">${v}</text>` : ''}<text x="${x + bw / 2}" y="${h - 9}" text-anchor="middle" font-size="11" fill="#64748b">${esc(l)}</text>`;
    if (m) g += `<line x1="${x - 5}" x2="${x + bw + 5}" y1="${y(m)}" y2="${y(m)}" stroke="#0f1e3d" stroke-width="2" stroke-dasharray="7 5"/>`; });
  return `<svg class="ch" viewBox="0 0 ${W} ${h}" style="width:100%;max-height:${h + 60}px">${g}</svg>`;
}
const hb = (n, p, v, g, dk = '') => `<div class="hb" ${dk}><span data-tip="${esc(n)}">${esc(n)}</span><div class="bar"><i class="${g ? 'g' : ''}" style="width:${Math.min(100, Math.max(0, p))}%"></i></div><b>${v}</b></div>`;
const hero = (t, r, big, col, small, p, g, mark, sub) => `<div class="card"><div class="row"><b>${t}</b><span class="right sm mut">${r}</span></div><div class="hbig" style="color:${col}">${big} <small>${small}</small></div><div class="bar lg"><i class="${g ? 'g' : ''}" style="width:${Math.min(100, p)}%"></i>${mark != null ? `<u style="left:${Math.min(100, mark)}%" title="esperado a esta hora"></u>` : ''}</div><div class="sm mut">${sub}</div></div>`;
const cerrado = t => !!t.estadoFinal;
const metaTurno = (f, t) => clase(f, t.id) ? 0 : Math.round((S.config.metas.ticketsHora[t.id] || 0) * QS.horasTurno(t));
const avanceTurno = () => { const a = turnoActual(), d = new Date(), h = QS.horasTurno(a.turno); return Math.min(1, ((d.getHours() * 60 + d.getMinutes() - QS.toMin(a.turno.inicio) + 1440) % 1440) / 60 / h); };
const agrupa = (a, f) => { const m = {}; for (const t of a) { const k = f(t) || '—'; (m[k] = m[k] || []).push(t); } return m; };
const leyenda = (c) => `<div class="legend grow">${[['Confirmados', 'conf'], ['Seguimiento', 'seg'], ['Por surtir', 'por'], ['Cero', 'cero']].map(x => `<span><i style="background:${COL[x[1]]}"></i>${x[0]}<em>${c[x[1]]} (${pct(c[x[1]], c.n)}%)</em></span>`).join('')}</div>`;
const segsDe = c => [['conf', 'Confirmados'], ['seg', 'Seguimiento'], ['por', 'Por surtir'], ['cero', 'Cero']].map(k => ({ v: c[k[0]], c: COL[k[0]], n: k[1] }));

function filtros(ops) {
  const gs = [...new Set(Object.values(S.config.grupos))], sups = usuariosRol('supervisor', 'administrador');
  return `<div class="row" style="margin-bottom:14px">${ops.per ? `<select data-c="dPer">${[[1, 'Hoy'], [7, 'Últimos 7 días'], [14, 'Últimos 14 días'], [30, 'Últimos 30 días']].map(p => `<option value="${p[0]}" ${D.per === p[0] ? 'selected' : ''}>${p[1]}</option>`).join('')}</select>` : ''}
  ${ops.fecha ? `<input type="date" data-c="dFecha" value="${D.fecha || turnoActual().fechaOp}">` : ''}
  ${ops.f ? `<select data-c="dGrp"><option value="">Todas las líneas</option>${gs.map(g => `<option ${D.grp === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}<option ${D.grp === 'JAULA' ? 'selected' : ''}>JAULA</option></select>
  <select data-c="dTurno"><option value="">Todos los turnos</option>${S.config.turnos.map(t => `<option value="${t.id}" ${D.turno === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select>
  <select data-c="dSup"><option value="">Todos los supervisores</option>${sups.map(u => `<option ${D.sup === u.nombre ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select>` : ''}
  <button class="btn right" data-a="dRef">↻ Actualizar</button></div>`;
}
CHG.dPer = el => { D.per = +el.value; renderTab(); }; CHG.dGrp = el => { D.grp = el.value; renderTab(); }; CHG.dTurno = el => { D.turno = el.value; renderTab(); }; CHG.dSup = el => { D.sup = el.value; renderTab(); }; CHG.dFecha = el => { D.fecha = el.value; renderTab(); };
ACT.dRef = async () => { HIST.cache = {}; if (!S.edit) await cargarDatos(); renderTab(); };
ACT.irSeg = () => { S.tab = 'seguimiento'; render(); };

/* ---------- 1. En curso ---------- */
async function vDash1() {
  DR = {};
  const a = turnoActual(), hoy = a.fechaOp, T = a.turno, desde = addDias(hoy, -(D.per - 1));
  const base = soloTk(await HIST.rango(addDias(hoy, -Math.max(D.per * 2, 14)), hoy));
  const tk = filtra(base.filter(t => t.fechaOp >= desde)), prev = filtra(base.filter(t => t.fechaOp >= addDias(desde, -D.per) && t.fechaOp < desde));
  const c = cuenta(tk), dlt = prev.length ? Math.round((tk.length - prev.length) / prev.length * 100) : null;
  const her = soloTk(S.seg.tickets).filter(heredado), cortos = S.seg.tickets.filter(t => t.tipo === 'CORTO').length;
  // turno en curso (toda la operación, sin filtros)
  const cerT = base.filter(t => cerrado(t) && t.fechaOpCierre === hoy && t.turnoCierre === T.id).length, impT = base.filter(t => t.fechaOp === hoy && t.turno === T.id), cerImp = impT.filter(cerrado).length;
  const mT = metaTurno(hoy, T), esp = Math.round(mT * avanceTurno()), cl = clase(hoy, T.id), mh = S.config.metas.ticketsHora[T.id] || 0;
  const h1 = mT ? hero('Turno en curso: ' + esc(T.nombre).toUpperCase(), `desde ${T.inicio} · meta ${mT} cerrados (${mh}/h)`, cerT, cerT >= esp ? '#178a47' : '#b3232a', `cerrados de ${esp} esperados a esta hora`, pct(cerT, mT), cerT >= esp, mT ? esp / mT * 100 : null, `${pct(cerT, mT)}% de la meta del turno · ${cerT >= esp ? 'en ritmo ✓' : 'debajo del ritmo'}`)
    : hero('Turno en curso: ' + esc(T.nombre).toUpperCase(), cl === 'F' ? 'festivo laborado · sin meta' : cl === 'N' ? 'turno no laborable · fuera del métrico' : 'sin meta definida', cerT, 'var(--ink)', 'tickets cerrados en el turno', 0, false, null, 'Solo se cuenta la producción; define la meta en Configuración.');
  const h2 = hero('Impresos contra cerrados', 'turno ' + esc(T.nombre), pct(cerImp, impT.length) + '%', 'var(--ink)', `${cerImp} cerrados de ${impT.length} impresos`, pct(cerImp, impT.length), false, null, `${impT.length - cerImp} tickets abiertos de este turno${cortos ? ' · ' + cortos + ' cortos sin inventario' : ''}`);
  const grp = agrupa(tk, t => t.grupo + ' · ' + t.turno), oi = k => { const i = S.config.grupoOrden.indexOf(k.split(' · ')[0]); return i < 0 ? 99 : i; };
  const ord = Object.keys(grp).sort((x, y) => oi(x) - oi(y) || x.localeCompare(y));
  const men = tk.filter(t => t.alerta === 'MENOS' && t.estadoFinal === 'CONFIRMADO').length, mas = tk.filter(t => t.alerta === 'MAS').length, mx = Math.max(1, men, mas, c.cero);
  return filtros({ per: 1, f: 1 }) + `<div class="grid g2">${h1}${h2}</div>
  <div class="grid g5"><div class="kpi b" ${drK('imp', 'Tickets impresos', tk)}><span>Tickets impresos</span><b>${c.n}</b><small>${dlt == null ? 'sin periodo previo' : (dlt >= 0 ? '+' : '') + dlt + '% vs. periodo anterior'}</small></div>
  <div class="kpi g" ${drK('conf', 'Confirmados', tk.filter(t => st(t) === 'conf'))}><span>Confirmados</span><b>${c.conf}</b><small>${pct(c.conf, c.n)}% del total</small></div>
  <div class="kpi o" ${drK('seg', 'En seguimiento', tk.filter(t => st(t) === 'seg'))}><span>En seguimiento</span><b>${c.seg}</b><small>${pct(c.seg, c.n)}% del total</small></div>
  <div class="kpi r" ${drK('por', 'Por surtir', tk.filter(t => st(t) === 'por'))}><span>Por surtir</span><b>${c.por}</b><small>${pct(c.por, c.n)}% del total</small></div>
  <div class="kpi v" ${drK('cero', 'Cerrados en cero', tk.filter(t => st(t) === 'cero'))}><span>Cerrados en cero</span><b>${c.cero}</b><small>${pct(c.cero, c.n)}% · con nota de auditoría</small></div></div>
  <div class="grid g21"><div class="card"><h3>Control por línea y turno</h3><div class="tw"><table class="t"><tr><th>Línea · turno</th><th>Montacarguista</th><th class="n">Impresos</th><th class="n">Cerrados</th><th class="n">Por surtir</th><th class="n">Heredados</th><th style="width:28%">Avance</th></tr>
  ${ord.map(k => { const g = grp[k], x = cuenta(g), h = g.filter(t => !t.estadoFinal && heredado(t)).length, av = pct(x.conf + x.cero, x.n); return `<tr ${drK('g' + k, 'Línea · turno ' + k, g)}><td class="b">${esc(k)}</td><td>${esc(moda(g.map(t => t.monta)))}</td><td class="n">${x.n}</td><td class="n">${x.conf + x.cero}</td><td class="n" style="color:${x.por + x.seg ? '#b3232a' : 'inherit'}">${x.por + x.seg}</td><td class="n">${h}</td><td><div class="row" style="flex-wrap:nowrap"><div class="bar grow"><i style="width:${av}%"></i></div><b>${av}%</b></div></td></tr>`; }).join('') || '<tr><td colspan="7" class="mut" style="padding:18px;text-align:center">Sin tickets en el periodo.</td></tr>'}</table></div></div>
  <div class="card"><div class="lbl">Pendientes de turnos anteriores</div><div class="hbig">${her.length} <small>tickets heredados</small></div><div class="sm mut">Impresos en un turno anterior y todavía abiertos.</div><div style="margin-top:12px"><button class="btn n" data-a="irSeg">Ver detalle →</button></div>
  <div class="lbl">Alertas de cierre</div>${hb('Entrega de menos', men / mx * 100, men, false, drK('men', 'Entrega de menos', tk.filter(t => t.alerta === 'MENOS' && t.estadoFinal === 'CONFIRMADO')))}${hb('Entrega de más', mas / mx * 100, mas, false, drK('mas', 'Entrega de más', tk.filter(t => t.alerta === 'MAS')))}${hb('Cierre en cero', c.cero / mx * 100, c.cero, false, drK('cero2', 'Cierre en cero', tk.filter(t => st(t) === 'cero')))}
  <div class="lbl">Distribución</div><div class="row" style="margin-top:8px">${donut(segsDe(c), c.n, 'Total')}${leyenda(c)}</div></div></div>`;
}

/* ---------- 2. Tendencias ---------- */
async function vDash2() {
  const per = Math.max(D.per, 7), hoy = turnoActual().fechaOp, desde = addDias(hoy, -(per - 1));
  const todo = soloTk(await HIST.rango(addDias(desde, -62), hoy)), enMet = t => clase(t.fechaOp, t.turno) !== 'N';
  const tk = todo.filter(t => t.fechaOp >= desde), dias = Array.from({ length: per }, (_, i) => addDias(desde, i));
  const gen = dias.map(d => tk.filter(t => t.fechaOp === d).length), cer = dias.map(d => todo.filter(t => t.fechaOpCierre === d).length);
  const back = dias.map(d => todo.filter(t => t.fechaOp <= d && (!t.estadoFinal || t.fechaOpCierre > d)).length);
  const gris = dias.map(d => S.config.turnos.every(t => clase(d, t.id) === 'N'));
  const c = cuenta(tk), gs = [...new Set(tk.map(t => t.grupo))].sort((a, b) => { const i = x => { const k = S.config.grupoOrden.indexOf(x); return k < 0 ? 99 : k; }; return i(a) - i(b); });
  const prev = todo.filter(t => t.fechaOp >= addDias(desde, -per) && t.fechaOp < desde).length, dlt = prev ? Math.round((tk.length - prev) / prev * 100) : null;
  const cerr = todo.filter(t => t.estadoFinal && t.fechaOpCierre >= desde && clase(t.fechaOpCierre, t.turnoCierre) !== 'N');
  const horas = [...new Set(cerr.map(t => t.fechaOpCierre + '|' + t.turnoCierre))].reduce((a, k) => a + QS.horasTurno(turnoPorId(k.split('|')[1])), 0);
  const met = tk.filter(enMet), cm = cuenta(met), fuera = tk.length - met.length, abiertos = soloTk(S.seg.tickets).length;
  return `<div class="row" style="margin-bottom:14px"><b>Periodo:</b><select data-c="dPer">${[[7, 'Últimos 7 días'], [14, 'Últimos 14 días'], [30, 'Últimos 30 días']].map(p => `<option value="${p[0]}" ${per === p[0] ? 'selected' : ''}>${p[1]}</option>`).join('')}</select><button class="btn right" data-a="dRef">↻ Actualizar</button></div>
  <div class="card"><h3>Tendencia de tickets <span class="right legend" style="grid-auto-flow:column;gap:16px"><span><i style="background:${COL.blue}"></i>Generados</span><span><i style="background:${COL.conf}"></i>Cerrados</span></span></h3>${lineas(dias.map(diaLbl), [{ n: 'Generados', c: COL.blue, data: gen }, { n: 'Cerrados', c: COL.conf, data: cer }], { gris })}<p class="sm mut">Días en gris: no laborables según Configuración (no entran al métrico).</p></div>
  <div class="grid g2"><div class="card"><h3>Carga por línea</h3>${barras(gs, gs.map(g => tk.filter(t => t.grupo === g).length), [COL.blue, COL.blue, COL.teal, COL.seg, COL.cero, '#64748b'])}</div>
  <div class="card"><h3>Distribución por estatus</h3><div class="row">${donut(segsDe(c), c.n, 'Total')}${leyenda(c)}</div></div></div>
  <div class="card"><h3>Evolución del backlog <span class="tag b right">Actual ${abiertos}</span></h3>${lineas(dias.map(diaLbl), [{ n: 'Backlog', c: COL.blue, data: back }], { area: 1, h: 190, gris })}<p class="sm mut">Tickets abiertos al cierre de cada día.</p></div>
  <div class="card" style="padding:0;overflow:hidden"><div style="background:var(--navy);color:#fff;padding:8px 16px;font-weight:700">Resumen de tendencias</div><div class="grid g4" style="padding:14px;text-align:center">
  <div><b style="font-size:22px">${dlt == null ? '—' : (dlt >= 0 ? '+' : '') + dlt + '%'}</b><div class="sm mut">vs. periodo anterior</div></div>
  <div><b style="font-size:22px">${horas ? nf(cerr.length / horas) : '—'}</b><div class="sm mut">Tickets/hora (turnos con cierres)</div></div>
  <div><b style="font-size:22px;color:${pct(cm.conf, cm.n) >= S.config.metas.cumplimiento ? COL.conf : COL.por}">${pct(cm.conf, cm.n)}%</b><div class="sm mut">Cumplimiento · meta ${S.config.metas.cumplimiento}%</div></div>
  <div><b style="font-size:22px">${abiertos}</b><div class="sm mut">Backlog actual</div></div></div></div>
  ${fuera ? `<p class="sm mut">${fuera} tickets generados en turnos no laborables: se cuentan en las gráficas pero no en el cumplimiento.</p>` : ''}`;
}

/* ---------- 3. Productividad ---------- */
CHG.dDesde = el => { D.desde = el.value; if (D.hasta < D.desde) D.hasta = D.desde; renderTab(); }; CHG.dHasta = el => { D.hasta = el.value; if (D.hasta < D.desde) D.desde = D.hasta; renderTab(); };
ACT.dQuick = el => { const h = turnoActual().fechaOp; D.hasta = h; D.desde = addDias(h, -(+el.dataset.n - 1)); renderTab(); };
async function vDash3() {
  DR = {}; const a = turnoActual(), M = S.config.metas, TS = S.config.turnos; if (!D.desde) D.desde = D.hasta = a.fechaOp;
  const desde = D.desde, hasta = D.hasta, base = soloTk(await HIST.rango(addDias(desde, -31), hasta)), fg = t => !D.grp || t.grupo === D.grp;
  const imp = base.filter(t => t.fechaOp >= desde && t.fechaOp <= hasta && fg(t) && (!D.turno || t.turno === D.turno));
  const cer = base.filter(t => cerrado(t) && t.fechaOpCierre >= desde && t.fechaOpCierre <= hasta && fg(t) && (!D.turno || t.turnoCierre === D.turno));
  const dias = []; for (let d = desde; d <= hasta && dias.length < 400; d = addDias(d, 1)) dias.push(d);
  const turnos = TS.filter(t => !D.turno || t.id === D.turno), ix = id => TS.findIndex(t => t.id === id);
  let metaTot = 0, esp = 0; const mPor = {};
  for (const d of dias) for (const t of turnos) { const m = metaTurno(d, t); metaTot += m; mPor[t.id] = (mPor[t.id] || 0) + m; if (d < a.fechaOp || (d === a.fechaOp && ix(t.id) < ix(a.turno.id))) esp += m; else if (d === a.fechaOp && t.id === a.turno.id) esp += Math.round(m * avanceTurno()); }
  const enCurso = hasta >= a.fechaOp, cImp = imp.filter(cerrado).length;
  // por hora
  const h0 = Math.floor(QS.toMin(TS[0].inicio) / 60), horas = Array.from({ length: 24 }, (_, i) => (h0 + i) % 24), vals = horas.map(() => 0), porH = horas.map(() => []);
  for (const t of cer) { const h = +String(t.fechaCierre).slice(11, 13), i = horas.indexOf(h); if (i >= 0) { vals[i]++; porH[i].push(t); } }
  const turnoDeHora = h => { const m = h * 60 + 30; return TS.find(t => { const x = QS.toMin(t.inicio), y = QS.toMin(t.fin); return x < y ? m >= x && m < y : m >= x || m < y; }); };
  const metas = horas.map(h => { const t = turnoDeHora(h); if (!t || (D.turno && t.id !== D.turno)) return 0; return (M.ticketsHora[t.id] || 0) * dias.filter(d => !clase(d, t.id)).length; });
  const enc = agrupa(cer, t => t.encargado), encK = Object.keys(enc).sort((x, y) => enc[y].length - enc[x].length), encMx = Math.max(1, ...encK.map(k => enc[k].length));
  const mon = agrupa(imp, t => t.monta), monK = Object.keys(mon).sort((x, y) => mon[y].length - mon[x].length);
  const grp = agrupa(imp, t => t.grupo + '|' + t.turno), oi = k => { const i = S.config.grupoOrden.indexOf(k.split('|')[0]); return i < 0 ? 99 : i; };
  const ord = Object.keys(grp).sort((x, y) => oi(x) - oi(y) || ix(x.split('|')[1]) - ix(y.split('|')[1]));
  const gs = [...new Set(Object.values(S.config.grupos))], cum = pct(cer.length, metaTot);
  return `<div class="card row" style="padding:12px 20px"><span class="lbl" style="margin:0">Desde</span><input type="date" data-c="dDesde" value="${desde}"><span class="lbl" style="margin:0">Hasta</span><input type="date" data-c="dHasta" value="${hasta}">
  <span class="lbl" style="margin:0">Turno</span><select data-c="dTurno"><option value="">Todos</option>${TS.map(t => `<option value="${t.id}" ${D.turno === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select>
  <span class="lbl" style="margin:0">Línea</span><select data-c="dGrp"><option value="">Todas</option>${gs.map(g => `<option ${D.grp === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}<option ${D.grp === 'JAULA' ? 'selected' : ''}>JAULA</option></select>
  <button class="btn" data-a="dQuick" data-n="1">Hoy</button><button class="btn" data-a="dQuick" data-n="7">7 días</button><button class="btn" data-a="dQuick" data-n="30">30 días</button><button class="btn right" data-a="dRef">↻ Actualizar</button></div>
  <div class="grid g2">${metaTot ? hero('Cerrados contra meta', `meta ${metaTot} tickets`, cer.length, cer.length >= esp ? '#178a47' : '#b3232a', enCurso ? `de ${esp} esperados a esta hora` : `de ${metaTot} de meta`, cum, cer.length >= esp, enCurso ? esp / metaTot * 100 : null, `${cum}% de la meta del periodo · ${cer.length >= esp ? 'en ritmo ✓' : 'debajo del ritmo'}`) : hero('Cerrados', 'sin meta en el periodo (festivo, no laborable o meta en 0)', cer.length, 'var(--ink)', 'tickets cerrados', 0, false, null, 'Solo se cuenta la producción.')}
  ${hero('Impresos contra cerrados', 'periodo seleccionado', pct(cImp, imp.length) + '%', 'var(--ink)', `${cImp} de ${imp.length}`, pct(cImp, imp.length), false, null, enCurso ? 'Incluye el turno en curso, que aún no termina' : `${imp.length - cImp} tickets del periodo siguen abiertos`)}</div>
  <div class="grid g21"><div class="card"><h3>Tickets cerrados por hora <span class="right sm mut" style="letter-spacing:0;text-transform:none;font-weight:500">- - Meta por hora &nbsp; <span style="color:#178a47">■</span> Cumple &nbsp; <span style="color:#1d6fe0">■</span> Debajo</span></h3>${barrasMeta(horas.map(String), vals, metas, horas.map((h, i) => vals[i] ? drK('h' + h, 'Cerrados a las ' + h + ' h', porH[i]) : ''))}
  <div class="lbl">Por turno · real / meta</div>${TS.map(t => { const r = cer.filter(x => x.turnoCierre === t.id).length, m = D.turno && D.turno !== t.id ? 0 : (mPor[t.id] || 0); return hb(t.nombre, m ? r / m * 100 : (r ? 100 : 0), m ? `${r} / ${m}` : String(r), m && r >= m, drK('t' + t.id, 'Cerrados en turno ' + t.nombre, cer.filter(x => x.turnoCierre === t.id))); }).join('')}</div>
  <div class="card"><div class="lbl">Por encargado · cerrados</div>${encK.map(k => hb(k, enc[k].length / encMx * 100, enc[k].length, false, drK('e' + k, 'Cerrados · encargado ' + k, enc[k]))).join('') || '<div class="sm mut">Sin cierres en el periodo.</div>'}
  <div class="lbl">Por montacarguista · cerrados / asignados</div>${monK.map(k => { const c = mon[k].filter(cerrado).length; return hb(k, pct(c, mon[k].length), `${c} / ${mon[k].length}`, false, drK('m' + k, 'Asignados a ' + k, mon[k])); }).join('') || '<div class="sm mut">Sin tickets en el periodo.</div>'}
  <div class="lbl">Cumplimiento del periodo</div><div class="hbig" style="color:${!metaTot ? 'var(--ink)' : cum >= M.cumplimiento ? '#178a47' : '#b3232a'}">${metaTot ? cum + '%' : '—'} <small>meta ${M.cumplimiento}%</small></div></div></div>
  <div class="card"><h3>Productividad por línea y turno</h3><div class="tw"><table class="t"><tr><th>Línea</th><th>Turno</th><th class="n">Impresos</th><th class="n">Cerrados</th><th class="n">En cero</th><th style="width:30%">% Cerrado</th><th class="n">Tickets/h</th><th class="n">Meta t/h</th></tr>
  ${ord.map(k => { const [g, t] = k.split('|'), x = cuenta(grp[k]), cu = pct(x.conf + x.cero, x.n), tt = turnoPorId(t), th = (x.conf + x.cero) / QS.horasTurno(tt) / dias.length, sinMeta = dias.every(d => clase(d, t)); const col = sinMeta ? '' : cu >= M.cumplimiento ? 'g' : cu >= M.cumplimiento - 15 ? 'o' : 'r'; return `<tr ${drK('p' + k, g + ' · ' + tt.nombre, grp[k])}><td class="b">${esc(g)}</td><td>${esc(tt.nombre)}</td><td class="n">${x.n}</td><td class="n">${x.conf + x.cero}</td><td class="n">${x.cero}</td><td><div class="row" style="flex-wrap:nowrap"><b style="width:42px">${cu}%</b><div class="bar grow"><i class="${col}" style="width:${cu}%"></i></div>${sinMeta ? '<span class="tag k">sin meta</span>' : ''}</div></td><td class="n b">${nf(Math.round(th * 10) / 10)}</td><td class="n mut">${sinMeta ? '—' : M.ticketsHora[t] || '—'}</td></tr>`; }).join('') || '<tr><td colspan="8" class="mut" style="padding:18px;text-align:center">Sin tickets en el periodo.</td></tr>'}</table></div><p class="sm mut">La meta de tickets por hora se define por turno en Configuración y aplica a toda la operación. Los turnos no laborables y festivos no suman meta.</p></div>`;
}

/* =================== CONFIGURACIÓN =================== */
async function vConfig() {
  const c = S.config, ad = esAdmin() && S.edit, e = ad ? '' : 'disabled'; let aud = null; try { aud = await IDB.get('audit'); } catch (x) { }
  return roNote() + (esAdmin() ? '' : '<div class="note i" style="margin-bottom:14px">Solo el administrador puede cambiar la configuración.</div>') + `<div class="grid g2">
  <div class="card"><h3>Turnos</h3><table class="t"><tr><th>Prefijo de folio</th><th>Nombre</th><th>Inicio</th><th>Fin</th></tr>${c.turnos.map((t, i) => `<tr><td class="b">${t.id}-000001</td><td><input id="tn${i}" value="${esc(t.nombre)}" ${e}></td><td><input type="time" id="ti${i}" value="${t.inicio}" ${e}></td><td><input type="time" id="tf${i}" value="${t.fin}" ${e}></td></tr>`).join('')}</table>
  <p class="sm mut">El folio del ticket lleva el prefijo del turno en que se confirma la corrida. Consecutivos actuales: ${c.turnos.map(t => t.id + '-' + QS.pad(S.estado.folios[t.id] || 0, 6)).join(' · ')}. El turno de noche después de medianoche cuenta para el día en que empezó.</p></div>
  <div class="card"><h3>Metas del métrico</h3><div class="row"><label class="f">% Cumplimiento<input type="number" id="m-cu" value="${c.metas.cumplimiento}" style="width:110px" ${e}></label>${c.turnos.map(t => `<label class="f">Tickets/h ${esc(t.nombre)}<input type="number" id="m-th${t.id}" value="${c.metas.ticketsHora[t.id] || 0}" style="width:110px" ${e}></label>`).join('')}</div>
  <div class="row" style="margin-top:10px"><label class="f">Renglones por hoja de surtido<input type="number" id="m-rh" value="${c.renglonesHoja}" style="width:110px" ${e}></label><label class="f"><span><input type="checkbox" id="m-nd" style="display:inline;width:auto" ${c.notaDif ? 'checked' : ''} ${e}> Comentario obligatorio cuando lo surtido difiere de lo pedido</span></label></div></div>
  <div class="card"><h3>Líneas y agrupación</h3><p class="sm mut">Una línea por renglón: <code>LÍNEA=GRUPO</code>. Las líneas del mismo grupo comparten hoja y montacarguista. Línea que no esté aquí forma su propio grupo.</p><textarea id="g-map" rows="7" style="width:100%;font-family:Consolas,monospace" ${e}>${esc(Object.entries(c.grupos).map(x => x[0] + '=' + x[1]).join('\n'))}</textarea>
  <label class="f">Orden de impresión de los grupos (separados por coma)<input id="g-ord" value="${esc(c.grupoOrden.join(', '))}" ${e}></label></div>
  <div class="card"><h3>Turnos no laborables (cada semana)</h3><table class="t"><tr><th></th>${c.turnos.map(t => `<th>${esc(t.nombre)}</th>`).join('')}</tr>${[1, 2, 3, 4, 5, 6, 0].map(d => `<tr><td class="b">${DOW[d]}</td>${c.turnos.map(t => `<td><input type="checkbox" class="nl" data-d="${d}" data-t="${t.id}" ${(c.noLab.semanal[d] || []).includes(t.id) ? 'checked' : ''} ${e}></td>`).join('')}</tr>`).join('')}</table><p class="sm mut">Marcado = no se trabaja; el métrico no lo toma en cuenta.</p></div></div>
  <div class="row" style="margin-bottom:14px"><button class="btn p" data-a="cfgSave" ${e}>Guardar turnos, metas, líneas y no laborables</button></div>
  <div class="grid g2"><div class="card"><h3>Días festivos</h3><table class="t"><tr><th>Fecha</th><th>Nombre</th><th>¿Se trabajó?</th><th></th></tr>${c.festivos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(f => `<tr><td>${f.fecha}</td><td>${esc(f.nombre)}</td><td>${f.laborable ? '<span class="tag o">Laborado · cuenta sin meta</span>' : '<span class="tag k">No laborable · fuera del métrico</span>'}</td><td><button class="btn s" data-a="festDel" data-f="${f.fecha}" ${e}>Quitar</button></td></tr>`).join('') || '<tr><td colspan="4" class="mut">Sin festivos.</td></tr>'}</table>
  <div class="row" style="margin-top:10px"><input type="date" id="fe-f" ${e}><input id="fe-n" placeholder="Nombre" ${e}><label><input type="checkbox" id="fe-l" ${e}> Se trabaja</label><button class="btn" data-a="festAdd" ${e}>Agregar</button></div></div>
  <div class="card"><h3>Turnos no laborables por fecha</h3><table class="t"><tr><th>Fecha</th><th>Turno</th><th></th></tr>${c.noLab.fechas.map((f, i) => `<tr><td>${f.fecha}</td><td>${f.turno === '*' ? 'Todos' : esc(turnoPorId(f.turno).nombre)}</td><td><button class="btn s" data-a="nlDel" data-i3="${i}" ${e}>Quitar</button></td></tr>`).join('') || '<tr><td colspan="3" class="mut">Sin registros.</td></tr>'}</table>
  <div class="row" style="margin-top:10px"><input type="date" id="nl-f" ${e}><select id="nl-t" ${e}><option value="*">Todos los turnos</option>${c.turnos.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')}</select><button class="btn" data-a="nlAdd" ${e}>Agregar</button></div></div></div>
  <div class="card"><h3>Usuarios <span class="tag k">${S.usuarios.length}</span></h3><div class="tw" style="max-height:340px"><table class="t"><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr>${S.usuarios.map(u => `<tr><td class="b">${esc(u.nombre)}</td><td>${esc(u.usuario)}</td><td><select data-c="usrRol" data-u="${u.id}" ${e}>${Object.keys(ROLES).map(r => `<option value="${r}" ${u.rol === r ? 'selected' : ''}>${ROLES[r]}</option>`).join('')}</select></td><td>${u.activo === false ? '<span class="tag r">Inactivo</span>' : '<span class="tag g">Activo</span>'}</td><td class="row"><button class="btn s" data-a="usrAct" data-u="${u.id}" ${e}>${u.activo === false ? 'Activar' : 'Desactivar'}</button><button class="btn s" data-a="usrPw" data-u="${u.id}" ${e}>Cambiar contraseña</button></td></tr>`).join('')}</table></div>
  <div class="row" style="margin-top:10px"><input id="u-nom" placeholder="Nombre completo" ${e}><input id="u-usr" placeholder="Usuario" ${e}><input id="u-pw" type="password" placeholder="Contraseña" ${e}><select id="u-rol" ${e}>${Object.keys(ROLES).map(r => `<option value="${r}">${ROLES[r]}</option>`).join('')}</select><button class="btn p" data-a="usrAdd" ${e}>Agregar usuario</button></div><p class="sm mut">Los montacarguistas no necesitan contraseña: solo aparecen en la lista para asignarlos a una línea.</p></div>
  <div class="grid g2"><div class="card"><h3>Auditoría de cierres en 0</h3><p class="sm mut">Cada cierre en 0 se guarda siempre en <code>${AUDIT}</code> dentro de la carpeta. Además puedes elegir un archivo externo; en esta computadora: <b>${aud ? esc(aud.name) : 'ninguno'}</b>. El archivo externo se configura en cada computadora que cierre tickets.</p><div class="row"><button class="btn" data-a="audSel" ${esAdmin() ? '' : 'disabled'}>Elegir archivo externo</button>${aud ? `<button class="btn" data-a="audDel" ${esAdmin() ? '' : 'disabled'}>Quitar</button>` : ''}</div></div>
  <div class="card"><h3>Hoja de surtido</h3><div class="row"><label class="f">Número de formato<input id="hs-fmt" value="${esc(c.formato || '')}" placeholder="Ej. FO-ESC-000" style="width:220px" ${e}></label><button class="btn p" data-a="fmtSave" style="align-self:flex-end" ${e}>Guardar</button></div>
  <p class="sm mut">Sale arriba a la derecha de cada hoja. La hoja se imprime en carta horizontal con título «Surtido ESC + línea» y «Página 1 de X» por línea.</p>
  <div class="lbl">Logos del encabezado</div><p class="sm mut">Se toman de la carpeta de trabajo. Guarda ahí los archivos con estos nombres, o elígelos aquí y el sistema los copia con ese nombre:</p>
  ${[['sese', 'SESE'], ['international', 'International']].map(l => `<div class="row" style="margin-top:8px"><code>logo_${l[0]}.png</code>${S.logos[l[0]] ? `<img src="${S.logos[l[0]]}" style="max-height:34px;max-width:120px;border:1px solid var(--line);border-radius:6px;padding:3px"><span class="tag g">Encontrado</span>` : '<span class="tag k">No está en la carpeta</span>'}<label class="btn s" ${ad ? '' : 'style="opacity:.45;pointer-events:none"'}>Elegir logo ${l[1]}<input type="file" accept=".png,.jpg,.jpeg,.svg" data-c="logoHoja" data-k="${l[0]}" hidden></label></div>`).join('')}
  <p class="sm mut">También se aceptan .jpg y .svg con el mismo nombre. Mientras no existan, la hoja sale sin logos.</p></div>
  <div class="card"><h3>Logo oficial</h3><p class="sm mut">Imagen PNG, JPG o SVG (máx. 400 KB). Se muestra en el menú lateral y en la pantalla de acceso de todas las computadoras que usen esta carpeta.</p><div class="row"><img src="${c.logo || LOGO_CH}" style="max-height:44px;max-width:160px;border:1px solid var(--line);border-radius:8px;padding:4px;background:#fff">${c.logo ? '' : '<span class="tag k">Logo CH incluido</span>'}<label class="btn" ${ad ? '' : 'style="opacity:.45;pointer-events:none"'}>Elegir imagen<input type="file" accept="image/*" data-c="logoFile" hidden></label>${c.logo ? `<button class="btn" data-a="logoDel" ${e}>Quitar</button>` : ''}</div></div>
  <div class="card"><h3>Carpeta de trabajo</h3><p class="sm mut">Carpeta actual: <b>${esc(FS.dir.name || 'demo')}</b> · Versión ${VERSION}. Para cambiarla, cierra sesión y usa «Cambiar carpeta».</p></div></div>`;
}
const soloAdmin = () => { if (!esAdmin()) throw new Error('Solo el administrador.'); };
ACT.cfgSave = async () => {
  soloAdmin(); const c = S.config;
  c.turnos.forEach((t, i) => { t.nombre = QS.norm($('#tn' + i).value) || t.nombre; t.inicio = $('#ti' + i).value || t.inicio; t.fin = $('#tf' + i).value || t.fin; c.metas.ticketsHora[t.id] = +$('#m-th' + t.id).value || 0; });
  c.metas.cumplimiento = +$('#m-cu').value || 0; c.renglonesHoja = Math.min(27, Math.max(5, +$('#m-rh').value || 25)); c.notaDif = $('#m-nd').checked;
  const g = {}; for (const l of $('#g-map').value.split('\n')) { const [a, b] = l.split('='); if (QS.norm(a) && QS.norm(b)) g[QS.norm(a).toUpperCase()] = QS.norm(b).toUpperCase(); } c.grupos = g;
  c.grupoOrden = $('#g-ord').value.split(',').map(x => QS.norm(x).toUpperCase()).filter(Boolean);
  const s = {}; document.querySelectorAll('input.nl:checked').forEach(x => (s[x.dataset.d] = s[x.dataset.d] || []).push(x.dataset.t)); c.noLab.semanal = s;
  await guardar('config'); await evento('CONFIGURACION', 'Turnos, metas, líneas'); render(); toast('Configuración guardada.');
};
ACT.festAdd = async () => { soloAdmin(); const f = $('#fe-f').value; if (!f) throw new Error('Elige la fecha.'); S.config.festivos = S.config.festivos.filter(x => x.fecha !== f).concat({ fecha: f, nombre: QS.norm($('#fe-n').value) || 'Festivo', laborable: $('#fe-l').checked }); await guardar('config'); renderTab(); };
ACT.festDel = async el => { soloAdmin(); S.config.festivos = S.config.festivos.filter(x => x.fecha !== el.dataset.f); await guardar('config'); renderTab(); };
ACT.nlAdd = async () => { soloAdmin(); const f = $('#nl-f').value; if (!f) throw new Error('Elige la fecha.'); S.config.noLab.fechas.push({ fecha: f, turno: $('#nl-t').value }); await guardar('config'); renderTab(); };
ACT.nlDel = async el => { soloAdmin(); S.config.noLab.fechas.splice(+el.dataset.i3, 1); await guardar('config'); renderTab(); };
const usr = id => S.usuarios.find(u => u.id === id);
const quedaAdmin = () => { if (!S.usuarios.some(u => u.rol === 'administrador' && u.activo !== false)) throw new Error('Debe quedar al menos un administrador activo.'); };
CHG.usrRol = async el => { soloAdmin(); const u = usr(el.dataset.u), ant = u.rol; u.rol = el.value; try { quedaAdmin(); if (u.rol !== 'montacarguista' && !u.hash) throw new Error('Asígnale una contraseña antes de darle ese rol.'); } catch (e) { u.rol = ant; renderTab(); throw e; } await guardar('usuarios'); await evento('USUARIO_ROL', u.usuario + ' → ' + u.rol); renderTab(); };
ACT.usrAct = async el => { soloAdmin(); const u = usr(el.dataset.u); u.activo = u.activo === false; try { quedaAdmin(); } catch (e) { u.activo = true; throw e; } await guardar('usuarios'); renderTab(); };
ACT.usrPw = async el => { soloAdmin(); const u = usr(el.dataset.u), p = await dlg({ titulo: 'Cambiar contraseña', msg: 'Nueva contraseña para ' + u.nombre + ' (mínimo 4 caracteres).', input: 'password', ok: 'Guardar' }); if (p == null) return; if (p.length < 4) throw new Error('Mínimo 4 caracteres.'); u.salt = Math.random().toString(36).slice(2); u.hash = await hash(u.salt, p); await guardar('usuarios'); await evento('USUARIO_PASS', u.usuario); toast('Contraseña actualizada.'); };
ACT.usrAdd = async () => { soloAdmin(); const u = await crearUsuario({ nombre: $('#u-nom').value, usuario: $('#u-usr').value, pass: $('#u-pw').value, rol: $('#u-rol').value }); try { await guardar('usuarios'); } catch (e) { S.usuarios.pop(); throw e; } await evento('USUARIO_ALTA', u.usuario + ' (' + u.rol + ')'); renderTab(); toast('Usuario agregado.'); };
ACT.fmtSave = async () => { soloAdmin(); S.config.formato = QS.norm($('#hs-fmt').value); await guardar('config'); await evento('CONFIGURACION', 'Formato de hoja: ' + S.config.formato); renderTab(); toast('Número de formato guardado.'); };
CHG.logoHoja = async el => { soloAdmin(); if (!S.edit) throw new Error('Estás en modo lectura.'); const f = el.files[0], k = el.dataset.k; if (!f) return; const ext = (f.name.split('.').pop() || '').toLowerCase(); if (!LOGO_EXT.includes(ext)) throw new Error('Usa PNG, JPG o SVG.'); if (f.size > 1024 * 1024) throw new Error('La imagen pesa más de 1 MB.');
  for (const x of LOGO_EXT) { try { await FS.dir.removeEntry('logo_' + k + '.' + x); } catch (err) { } }
  await FS.writeBlob('logo_' + k + '.' + ext, f); S.logos[k] = await leerLogo(k); await evento('CONFIGURACION', 'Logo de hoja: ' + k); renderTab(); toast('Logo guardado en la carpeta como logo_' + k + '.' + ext); };
CHG.logoFile = async el => { soloAdmin(); const f = el.files[0]; if (!f) return; if (f.size > 400 * 1024) throw new Error('La imagen pesa más de 400 KB.'); const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); }); S.config.logo = url; await guardar('config'); await evento('CONFIGURACION', 'Logo actualizado'); render(); toast('Logo actualizado.'); };
ACT.logoDel = async () => { soloAdmin(); delete S.config.logo; await guardar('config'); render(); };
ACT.audSel = async () => { soloAdmin(); try { const h = await window.showSaveFilePicker({ suggestedName: 'auditoria_cierres_cero.txt', types: [{ description: 'Texto', accept: { 'text/plain': ['.txt'] } }] }); await IDB.set('audit', h); renderTab(); toast('Archivo de auditoría externo configurado.'); } catch (e) { if (e.name !== 'AbortError') throw e; } };
ACT.audDel = async () => { soloAdmin(); await IDB.del('audit'); renderTab(); };

boot();

// ---- Aviso legal y condiciones de uso ----
const LEGAL_CONTACTO = 'CH Industrial Solutions · Ing. Carlos Alberto Hernández Hernández · Correo: charliealberth290116@outlook.es · Teléfono: 8115377033 · General Escobedo, Nuevo León, México';
const LEGAL_SECC = [
 ['1. Propiedad intelectual y derechos de autor', 'QORVEX Surtido es una obra de software creada por el Ing. Carlos Alberto Hernández Hernández, titular de los derechos patrimoniales. Su código fuente, diseño, textos, nombre y logotipos están protegidos por la legislación de derechos de autor y propiedad intelectual aplicable. Queda prohibido copiar, modificar, distribuir, descompilar o usar el software total o parcialmente sin autorización escrita del titular. El logotipo de CH Industrial Solutions es propiedad de su titular.'],
 ['2. Licencias de terceros', 'El software incluye la biblioteca qrcode-generator, versión 1.4.4, de Kazuhiko Arase, distribuida bajo licencia MIT. Su aviso de copyright y de licencia se conserva dentro del código. Hasta esta versión no se identifican otros componentes de terceros; si se agregan, se documentarán en este apartado.'],
 ['3. Protección de datos personales', 'Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México, el sistema trata nombre completo, nombre de usuario, rol y datos de operación de surtido asociados a usuarios y personal. Estos datos se usan solo para operar el proceso de surtido, el control de tickets, la asignación de montacarguistas, la trazabilidad y los reportes. Los titulares pueden ejercer derechos de acceso, rectificación, cancelación y oposición (ARCO) mediante el contacto indicado al final de este aviso.'],
 ['4. Privacidad y confidencialidad', 'La información de inventarios, pedidos, cierres, reportes y datos del personal es confidencial. Las contraseñas se guardan como resumen criptográfico con sal y nunca en texto plano. El sistema no envía información a servidores externos: los datos permanecen en la carpeta compartida que selecciona la organización que lo opera.'],
 ['5. Autenticación y control de usuarios', 'El acceso requiere usuario y contraseña. Los roles (capturista, supervisor, administrador y montacarguista) determinan las acciones permitidas; solo el administrador asigna roles y autoriza cierres en cero. Los cambios de configuración y las acciones sensibles quedan registrados en la bitácora de eventos. Cada persona debe usar su propia cuenta y no compartirla.'],
 ['6. Seguridad informática', 'Solo una sesión puede modificar los datos a la vez, mediante un control de edición que se verifica de forma periódica. Se recomienda restringir los permisos de la carpeta compartida al personal autorizado, realizar respaldos periódicos y mantener el equipo con antivirus y actualizaciones. El titular no garantiza la seguridad frente a equipos comprometidos o accesos físicos no autorizados.'],
 ['7. Términos de uso y responsabilidades', 'El uso del sistema está limitado al personal autorizado por la organización operadora y a los fines de surtido. El usuario es responsable de la veracidad de los datos que captura, de sus credenciales y de los cierres que confirma. El software se entrega tal cual. El titular no responde por pérdidas derivadas de un uso indebido, de datos incorrectos capturados, de configuraciones erróneas o de fallas de equipos o redes ajenos al sistema.'],
 ['8. Propiedad de la información y bases de datos', 'Los datos de operación que el usuario captura o genera (tickets, historial, bitácoras e inventarios cargados) son propiedad de la organización que los opera. El titular conserva los derechos sobre el software, su estructura y su documentación.'],
 ['9. Cumplimiento normativo', 'El sistema se diseñó considerando la LFPDPPP y buenas prácticas de trazabilidad operativa. El cumplimiento final depende de la organización que lo opere, incluidas sus políticas internas, contratos laborales y normas sindicales aplicables. Este aviso no sustituye una asesoría legal.'],
 ['10. Documentación, mantenimiento y trazabilidad', 'Los cambios relevantes (cierres, cambios de montacarguista, reasignaciones, cierres en cero y cambios de configuración) quedan registrados en el historial y la bitácora con fecha y usuario. El software se identifica con número de versión; esta es la versión 1.6.0. El mantenimiento y las actualizaciones se acuerdan por separado.'],
];
function abrirLegal() {
  const o = document.createElement('div'); o.className = 'lg-ov';
  o.innerHTML = `<div class="lg-box"><div class="lg-h"><b>Aviso legal y condiciones de uso · QORVEX Surtido v${VERSION}</b><button class="btn s" data-lgx="1">Cerrar</button></div><div class="lg-body">${LEGAL_SECC.map(([t, x]) => `<h4>${esc(t)}</h4><p>${esc(x)}</p>`).join('')}<h4>Contacto</h4><p>${esc(LEGAL_CONTACTO)}</p><p class="sm">Última actualización: 16 de noviembre de 2026. © 2026 Ing. Carlos Alberto Hernández Hernández. Todos los derechos reservados.</p></div></div>`;
  document.body.appendChild(o);
  const cerrar = () => o.remove();
  o.onclick = e => { if (e.target === o || e.target.dataset.lgx) cerrar(); };
}
ACT.legal = () => abrirLegal();
