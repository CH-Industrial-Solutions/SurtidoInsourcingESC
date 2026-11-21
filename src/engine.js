/* ===== QORVEX Surtido · Motor (funciones puras) ===== */
const QS = (() => {
  const norm = s => String(s == null ? '' : s).replace(/[ \t\r\n]+/g, ' ').trim();
  const key = s => norm(s).toUpperCase().replace(/\s+/g, '');
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };

  /* ---------- Lector XLSX mínimo (zip + xml), sin dependencias ---------- */
  async function inflate(u8) {
    const ds = new DecompressionStream('deflate-raw');
    const buf = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(buf);
  }
  async function unzip(ab, wanted) {
    const u8 = new Uint8Array(ab), dv = new DataView(ab);
    let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('El archivo no es un Excel .xlsx válido');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const out = {}, td = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
      if (wanted(name)) {
        const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true);
        const data = u8.subarray(off + 30 + lnl + lel, off + 30 + lnl + lel + csize);
        out[name] = td.decode(method === 0 ? data : await inflate(data));
      }
      p += 46 + nl + el + cl;
    }
    return out;
  }
  const xmlDec = s => s.indexOf('&') < 0 ? s : s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, c) =>
    c === 'amp' ? '&' : c === 'lt' ? '<' : c === 'gt' ? '>' : c === 'quot' ? '"' : c === 'apos' ? "'" :
      String.fromCodePoint(c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)));
  const colIdx = ref => { let n = 0; for (let i = 0; i < ref.length; i++) { const c = ref.charCodeAt(i); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); } return n - 1; };
  async function readXlsx(ab) {
    const files = await unzip(ab, n => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(n));
    let sheetPath = null;
    const wb = files['xl/workbook.xml'], rels = files['xl/_rels/workbook.xml.rels'];
    if (wb && rels) {
      const m = /<sheet\b[^>]*?r:id="([^"]+)"/.exec(wb);
      if (m) {
        const re = /<Relationship\b[^>]*>/g; let r;
        while ((r = re.exec(rels))) {
          if (new RegExp('Id="' + m[1] + '"').test(r[0])) {
            const t = /Target="([^"]+)"/.exec(r[0]);
            if (t) sheetPath = t[1].startsWith('/') ? t[1].slice(1) : 'xl/' + t[1];
          }
        }
      }
    }
    if (!sheetPath || !files[sheetPath]) sheetPath = Object.keys(files).filter(n => n.includes('worksheets/')).sort()[0];
    if (!sheetPath) throw new Error('No se encontró ninguna hoja en el archivo');
    const ss = [];
    if (files['xl/sharedStrings.xml']) {
      const reSi = /<si>([\s\S]*?)<\/si>|<si\/>/g; let m;
      while ((m = reSi.exec(files['xl/sharedStrings.xml']))) {
        let body = (m[1] || '').replace(/<rPh[\s\S]*?<\/rPh>/g, ''), t = '', mt; const reT = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        while ((mt = reT.exec(body))) t += mt[1];
        ss.push(xmlDec(t));
      }
    }
    const xml = files[sheetPath], rows = [];
    const reRow = /<row\b[^>]*>([\s\S]*?)<\/row>/g, reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let mr;
    while ((mr = reRow.exec(xml))) {
      const row = []; let mc; reC.lastIndex = 0;
      while ((mc = reC.exec(mr[1]))) {
        const a = mc[1], body = mc[2] || '';
        const r = /\br="([A-Z]+)\d+"/.exec(a), t = /\bt="([^"]+)"/.exec(a);
        const ci = r ? colIdx(r[1]) : row.length;
        let v = null;
        if (t && t[1] === 'inlineStr') { const mt = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body); v = mt ? xmlDec(mt[1]) : ''; }
        else {
          const mv = /<v>([\s\S]*?)<\/v>/.exec(body);
          if (mv) v = t && t[1] === 's' ? ss[+mv[1]] : t && (t[1] === 'str' || t[1] === 'e') ? xmlDec(mv[1]) : t && t[1] === 'b' ? mv[1] === '1' : parseFloat(mv[1]);
        }
        row[ci] = v;
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null;
      rows.push(row);
    }
    return rows;
  }
  function parseDelim(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
    const d = lines.length && lines[0].includes('\t') ? '\t' : ',';
    return lines.map(l => l.split(d).map(c => c.replace(/^"|"$/g, '')));
  }

  /* ---------- Inventarios ---------- */
  function parseInventario(rows, tipo) {
    if (!rows.length) throw new Error('El archivo está vacío');
    const h = rows[0].map(c => key(c).toLowerCase());
    const find = (...tests) => { for (const t of tests) { const i = h.findIndex(x => typeof t === 'string' ? x === t : t.test(x)); if (i >= 0) return i; } return -1; };
    let cW, cI, cL, cQ, cD;
    if (tipo === 'BAAN') {
      cW = find('warehouse'); cD = find('description'); cI = find(/^itemcode/); cL = find('location'); cQ = find(/^inventory/);
      if (cI < 0 || cL < 0 || cQ < 0) { cW = 0; cD = 1; cI = 3; cL = 4; cQ = 5; }
    } else {
      cW = find('warehouse'); cL = find('location'); cI = find('item(child)', /^item/);
      cD = find('item(child)(child)', /^desc/); cQ = find('sumofinventoryonhand', 'onhand', /^sum/);
      if (cI < 0 || cL < 0 || cQ < 0) { cW = 0; cL = 1; cI = 2; cD = 3; cQ = rows[0].length - 1; }
    }
    const out = []; let omit = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const item = key(r[cI]), loc = key(r[cL]);
      const qty = typeof r[cQ] === 'number' ? r[cQ] : parseFloat(String(r[cQ] == null ? '' : r[cQ]).replace(/[, ]/g, ''));
      if (!item) continue;
      if (!(qty > 0) || loc === 'Z000INS') { omit++; continue; }
      out.push({ wh: key(r[cW]) || (tipo === 'BAAN' ? 'ORW' : 'ELCM01'), item, loc: loc || 'SIN-UBIC', qty, desc: norm(cD >= 0 ? r[cD] : '') });
    }
    if (!out.length) throw new Error('No se reconocieron renglones de inventario ' + tipo + '. Revisa que sea el reporte correcto.');
    return { rows: out, omitidos: omit };
  }

  /* ---------- Pegado desde Smartsheet ---------- */
  const CAMPOS = ['created', 'modified', 'almacen', 'linea', 'router', 'item', 'desc', 'prioridad', 'qty', 'solicitante', 'supCliente', 'comentarios'];
  const HEAD = { created: /^created|^creado/, modified: /^modifi/, almacen: /^almac/, linea: /^line/, router: /^router/, item: /^item/, desc: /^desc|^dcs/, prioridad: /^priori|^impacto|^hora/, qty: /^quant|^cant/, solicitante: /^request|^solicit/, supCliente: /^superv/, comentarios: /^comment|^coment/ };
  function parsePaste(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.replace(/\t/g, '').trim() !== '');
    if (!lines.length) return { rows: [], error: 'No hay datos en el portapapeles.' };
    let tab = lines.map(l => l.split('\t').map(norm));
    let map = null;
    const h0 = tab[0].map(c => c.toLowerCase());
    if (h0.some(c => HEAD.almacen.test(c)) || h0.some(c => HEAD.item.test(c)) && h0.some(c => HEAD.qty.test(c))) {
      map = {}; for (const f of CAMPOS) map[f] = h0.findIndex(c => HEAD[f].test(c));
      tab = tab.slice(1);
    } else {
      // sin encabezado: ancla = columna cuyo contenido es LN / BAAN
      const nc = Math.max(...tab.map(r => r.length)); let a = -1, best = 0;
      for (let c = 0; c < nc; c++) { const k = tab.filter(r => /^(LN|BAAN)$/i.test(r[c] || '')).length; if (k > best) { best = k; a = c; } }
      if (a < 0 || best < tab.length * 0.6) return { rows: [], error: 'No reconocí la tabla. Copia las columnas completas de Smartsheet (Created … Comments), con o sin encabezado.' };
      map = { created: a - 2, modified: a - 1, almacen: a, linea: a + 1, router: a + 2, item: a + 3, desc: a + 4, prioridad: a + 5, qty: a + 6, solicitante: a + 7, supCliente: a + 8, comentarios: a + 9 };
    }
    const rows = [];
    for (const r of tab) {
      const g = f => map[f] >= 0 && map[f] < r.length ? r[map[f]] || '' : '';
      const o = { created: g('created'), modified: g('modified'), almacen: g('almacen').toUpperCase(), linea: g('linea').toUpperCase(), router: g('router').toUpperCase(), item: key(g('item')), desc: g('desc'), prioridad: g('prioridad'), qty: parseFloat(g('qty').replace(/,/g, '')), solicitante: g('solicitante'), supCliente: g('supCliente'), comentarios: g('comentarios') };
      if (!o.item && !o.linea) continue;
      rows.push(o);
    }
    return { rows };
  }
  const ALM_POR_LINEA = l => /BAAN|^DEFTANK$|^AFT$/.test(l) ? 'BAAN' : 'LN';
  function validaReq(o) {
    const e = [];
    if (!o.item) e.push('sin ítem');
    if (!(o.qty > 0)) e.push('cantidad inválida');
    if (!o.linea) e.push('sin línea');
    if (o.almacen !== 'LN' && o.almacen !== 'BAAN') { o.almacen = ALM_POR_LINEA(o.linea); }
    return e;
  }
  const claveReq = o => [o.created, o.linea, o.item, o.qty].map(x => key(x)).join('|');
  function prioMin(p) { // minutos desde 00:00 o null si es texto
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP])?\.?\s*M?\.?$/i.exec(norm(p));
    if (!m) return null;
    let h = +m[1]; if (m[3]) { const pm = m[3].toUpperCase() === 'P'; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    return h > 23 || +m[2] > 59 ? null : h * 60 + (+m[2]);
  }
  const prioTxt = p => { const m = prioMin(p); return m == null ? norm(p) : pad(Math.floor(m / 60)) + ':' + pad(m % 60); };

  /* ---------- Turnos ---------- */
  function turnoDe(date, turnos) {
    const m = date.getHours() * 60 + date.getMinutes();
    for (const t of turnos) {
      const a = toMin(t.inicio), b = toMin(t.fin);
      if (a < b ? (m >= a && m < b) : (m >= a || m < b)) {
        const d = new Date(date); if (a > b && m < b) d.setDate(d.getDate() - 1);
        return { turno: t, fechaOp: ymd(d) };
      }
    }
    return { turno: turnos[0], fechaOp: ymd(date) };
  }
  const horasTurno = t => { let d = toMin(t.fin) - toMin(t.inicio); if (d <= 0) d += 1440; return d / 60; };

  /* ---------- Cruce ---------- */
  function indexar(rows, prio, def) {
    const ix = new Map();
    rows.forEach((r, i) => { r._i = i; r._p = prio[r.loc] != null ? prio[r.loc] : def; let a = ix.get(r.item); if (!a) ix.set(r.item, a = []); a.push(r); });
    for (const a of ix.values()) a.sort((x, y) => x._p - y._p || x._i - y._i);
    return ix;
  }
  /* reqs: solicitudes válidas. ctx: {ln, baan (arrays, se MUTAN), prio:{ln,baan}, jaula:Set, pallets:{item:std}, grupos:{linea:grupo}} */
  function cruce(reqs, ctx) {
    const ix = { LN: indexar(ctx.ln, ctx.prio.ln, 9), BAAN: indexar(ctx.baan, ctx.prio.baan, 5) };
    const out = [];
    reqs.forEach((q, qi) => {
      const alm = q.almacen, cand = ix[alm].get(q.item) || [];
      const jaula = alm === 'LN' && ctx.jaula.has(q.item);
      const std = +ctx.pallets[q.item] || 0;
      const base = { req: qi, linea: q.linea, grupo: jaula ? 'JAULA' : (ctx.grupos[q.linea] || q.linea), almacen: alm, item: q.item, router: q.router, prioridad: prioTxt(q.prioridad), pmin: prioMin(q.prioridad), solicitante: q.solicitante, supCliente: q.supCliente, creadoSS: q.created, comSS: q.comentarios, qtySolicitada: q.qty, jaula };
      const desc = q.desc || (cand[0] && cand[0].desc) || 'Revisar Item';
      let pend = q.qty, pal = std > 0 ? Math.ceil(q.qty / std) : 0;
      for (const r of cand) {
        if (r.qty <= 0) continue;
        if (std > 0 ? pal <= 0 : pend <= 0) break;
        let tomar, k = 0;
        if (std > 0) { k = Math.min(pal, Math.ceil(r.qty / std)); tomar = Math.min(r.qty, k * std); pal -= k; }
        else { tomar = Math.min(r.qty, pend); pend -= tomar; }
        out.push({ ...base, tipo: 'TICKET', desc, wh: r.wh, loc: r.loc, stock: r.qty, qty: tomar, pallets: k, std });
        r.qty -= tomar;
      }
      const falta = std > 0 ? pal * std : pend;
      if (falta > 0) out.push({ ...base, tipo: 'CORTO', desc, wh: alm === 'BAAN' ? 'ORW' : 'ELCM01', loc: 'SIN INVENTARIO', stock: 0, qty: falta, pallets: std > 0 ? pal : 0, std });
    });
    return out;
  }
  /* orden de impresión: grupo (línea) → hora requerida relativa al inicio de turno → texto al final */
  function ordenar(res, grupoOrden, inicioTurnoMin) {
    const gi = g => { const i = grupoOrden.indexOf(g); return g === 'JAULA' ? 9999 : i < 0 ? 999 : i; };
    const rel = m => m == null ? 99999 : (m - inicioTurnoMin + 1440) % 1440;
    return res.map((r, i) => [r, i]).sort((a, b) => gi(a[0].grupo) - gi(b[0].grupo) || a[0].grupo.localeCompare(b[0].grupo) || rel(a[0].pmin) - rel(b[0].pmin) || a[1] - b[1]).map(x => x[0]);
  }

  /* ---------- TXT (TSV) ---------- */
  const san = v => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ');
  const tsvLine = (o, cols) => cols.map(c => san(typeof o[c] === 'object' && o[c] !== null ? JSON.stringify(o[c]) : o[c])).join('\t');
  function tsvParse(text) {
    const ls = text.split('\n').filter(l => l.length); if (!ls.length) return [];
    const h = ls[0].replace(/^﻿/, '').split('\t');
    return ls.slice(1).map(l => { const c = l.split('\t'), o = {}; h.forEach((k, i) => o[k] = c[i] == null ? '' : c[i]); return o; });
  }
  return { norm, key, pad, ymd, hm, toMin, readXlsx, parseDelim, parseInventario, parsePaste, validaReq, claveReq, prioMin, prioTxt, turnoDe, horasTurno, cruce, ordenar, tsvLine, tsvParse, san };
})();
if (typeof module !== 'undefined') module.exports = QS;
