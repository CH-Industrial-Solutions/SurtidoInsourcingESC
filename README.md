# QORVEX Surtido · código fuente (v1.6.0)

Aplicación web de una sola página (HTML, CSS y JavaScript sin librerías externas, salvo el generador de QR incluido).

## Estructura
- `src/style.css` estilos y tema claro/oscuro.
- `src/engine.js` lógica pura: lectura de inventarios XLSX, cruce, prioridades, turnos.
- `src/app_core.js` estado, carpeta compartida, bloqueo de edición, login y arranque.
- `src/app_views.js` surtido, etiquetas, hojas, seguimiento e historial.
- `src/app_dash.js` tableros, configuración, usuarios y aviso legal.
- `src/seed_prio.json` prioridades base.
- `src/assets.json` logotipo CH (el fondo de pantalla no se incluye).
- `lib/package/qrcode.js` generador de QR (MIT, ver LICENSE.txt).

## Compilar
    node build.js
Genera `dist/QORVEX_Surtido.html`, un archivo único que se abre en Edge o Chrome.

Requiere Node.js 18 o superior. No requiere instalar dependencias.

## Notas
- El sistema guarda datos en una carpeta compartida seleccionada por el usuario (File System Access API).
- Ver el aviso legal dentro de la aplicación para condiciones de uso y protección de datos.
