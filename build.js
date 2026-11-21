const fs=require('fs'),r=f=>fs.readFileSync(f,'utf8');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
const A=JSON.parse(r('src/assets.json'));
const html=`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QORVEX | Surtido</title>
<style>${r('src/style.css')}</style><style>:root{--wall:${A.wall?'url('+A.wall+')':'none'}}</style><style id="pagecss"></style></head>
<body><div id="app"></div><div id="print-root"></div>
<script>${safe(r('lib/package/qrcode.js'))}</script>
<script>const SEED_PRIO=${r('src/seed_prio.json')};const LOGO_CH=${JSON.stringify(A.logo)};try{document.documentElement.dataset.theme=localStorage.getItem('qs-tema')==='dark'?'dark':'light'}catch(e){}</script>
<script>${safe(r('src/engine.js'))}</script>
<script>${safe(r('src/app_core.js'))}
${safe(r('src/app_views.js'))}
${safe(r('src/app_dash.js'))}</script>
</body></html>`;
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/QORVEX_Surtido.html',html);console.log('ok',html.length);
