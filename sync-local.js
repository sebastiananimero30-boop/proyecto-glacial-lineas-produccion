/**
 * sync-local.js
 * Corre en tu PC. Monitorea el Excel y envía los datos a Azure
 * cuando detecta un cambio (o al arrancar).
 *
 * Uso: node sync-local.js
 */

require('dotenv').config();

const XLSX    = require('xlsx');
const chokidar = require('chokidar');
const path    = require('path');
const https   = require('https');
const http    = require('http');

// ── Configuración ─────────────────────────────────────────────────
const EXCEL_PATH  = path.join(__dirname, 'Estimado de producción - Septiembre 2026.xlsm');
const AZURE_URL   = process.env.AZURE_URL;   // ej: https://mi-app.azurewebsites.net
const PUSH_TOKEN  = process.env.PUSH_TOKEN;
const EXCEL_PASS  = process.env.EXCEL_PASSWORD;

if (!AZURE_URL || !PUSH_TOKEN) {
    console.error('❌ Faltan variables en .env: AZURE_URL y/o PUSH_TOKEN');
    process.exit(1);
}

// ── Leer Excel ────────────────────────────────────────────────────
function leerExcel() {
    try {
        const options = { cellDates: true, raw: true };
        if (EXCEL_PASS) options.password = EXCEL_PASS;

        const wb = XLSX.readFile(EXCEL_PATH, options);
        const ws = wb.Sheets['Estimado Produccion'];
        if (!ws) throw new Error('Hoja "Estimado Produccion" no encontrada');

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const extraer = (i) => {
            const r = rows[i] || [];
            return {
                nombre:             String(r[3] || '').trim(),
                estimado:           Number(r[4]) || 0,
                producido:          Number(r[5]) || 0,
                cumplimiento_fecha: ((Number(r[8]) || 0) * 100).toFixed(2) + '%'
            };
        };

        return {
            celula1: extraer(7),
            celula2: extraer(8),
            celula3: extraer(9),
            total:   extraer(10)
        };
    } catch (e) {
        console.error('❌ Error leyendo Excel:', e.message);
        return null;
    }
}

// ── Enviar datos a Azure ──────────────────────────────────────────
function enviarAzure(datos) {
    const body = JSON.stringify(datos);
    const url  = new URL(`${AZURE_URL}/api/push`);
    const lib  = url.protocol === 'https:' ? https : http;

    const req = lib.request({
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname,
        method:   'POST',
        headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization':  `Bearer ${PUSH_TOKEN}`
        }
    }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`✅ [${new Date().toLocaleTimeString('es-CO')}] Datos enviados a Azure`);
            } else {
                console.error(`❌ Azure respondió ${res.statusCode}:`, data);
            }
        });
    });

    req.on('error', (e) => console.error('❌ Error de red:', e.message));
    req.write(body);
    req.end();
}

// ── Arranque: enviar datos inmediatamente ─────────────────────────
console.log('🚀 Sync local iniciado');
console.log(`📊 Monitoreando: ${EXCEL_PATH}`);
console.log(`☁️  Destino Azure: ${AZURE_URL}`);

const datosIniciales = leerExcel();
if (datosIniciales) {
    enviarAzure(datosIniciales);
} else {
    console.warn('⚠️  No se pudieron leer los datos iniciales');
}

// ── Monitorear cambios en el Excel ────────────────────────────────
const watcher = chokidar.watch(EXCEL_PATH, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 }
});

watcher.on('change', () => {
    console.log(`\n✏️  [${new Date().toLocaleTimeString('es-CO')}] Cambio detectado en Excel...`);
    const datos = leerExcel();
    if (datos) enviarAzure(datos);
});

watcher.on('error', (e) => console.error('❌ Error en watcher:', e));
