require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const XLSX = require('xlsx');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Modo de operación ────────────────────────────────────────────
// LOCAL:  Lee el Excel directamente (cuando corre en tu PC)
// AZURE:  Recibe los datos via POST /api/push (cuando corre en Azure)
const MODO = process.env.MODO || 'LOCAL';

// ── Estado en memoria (usado en modo AZURE) ───────────────────────
let datosEnMemoria = null;

// ── Ruta del Excel (solo usado en modo LOCAL) ─────────────────────
const EXCEL_PATH = path.join(__dirname, 'Estimado de producción - Septiembre 2026.xlsm');

function leerDatosExcel() {
    try {
        const options = { cellDates: true, raw: true };
        if (process.env.EXCEL_PASSWORD) {
            options.password = process.env.EXCEL_PASSWORD;
        }

        const workbook = XLSX.readFile(EXCEL_PATH, options);
        const sheetName = 'Estimado Produccion';
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            console.error(`Hoja "${sheetName}" no encontrada.`);
            return null;
        }

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const extraerPorFila = (rowIndex) => {
            const row = rows[rowIndex] || [];
            const nombre    = String(row[3] || '').trim();
            const estimado  = Number(row[4]) || 0;
            const producido = Number(row[5]) || 0;
            const cumplimientoI = Number(row[8]) || 0;
            return {
                nombre,
                estimado,
                producido,
                cumplimiento_fecha: (cumplimientoI * 100).toFixed(2) + '%'
            };
        };

        return {
            celula1: extraerPorFila(7),
            celula2: extraerPorFila(8),
            celula3: extraerPorFila(9),
            total:   extraerPorFila(10)
        };
    } catch (error) {
        console.error('Error al leer el archivo Excel:', error.message);
        return null;
    }
}

// ── Endpoint GET — devuelve los datos actuales ────────────────────
app.get('/api/indicadores', (req, res) => {
    const datos = MODO === 'AZURE' ? datosEnMemoria : leerDatosExcel();
    if (datos) {
        res.json(datos);
    } else {
        res.status(503).json({ error: 'Datos no disponibles aún' });
    }
});

// ── Endpoint POST /api/push — recibe datos desde el script local ──
// Protegido con token secreto en el header Authorization
app.post('/api/push', (req, res) => {
    const token = req.headers['authorization'];
    const tokenEsperado = `Bearer ${process.env.PUSH_TOKEN}`;

    if (!process.env.PUSH_TOKEN || token !== tokenEsperado) {
        console.warn('⚠️  Intento de push sin token válido');
        return res.status(401).json({ error: 'No autorizado' });
    }

    const datos = req.body;
    if (!datos || !datos.celula1) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    datosEnMemoria = datos;
    io.emit('actualizar_indicadores', datos);
    console.log('📥 Datos recibidos y emitidos a las TVs:', new Date().toLocaleTimeString('es-CO'));
    res.json({ ok: true });
});

// ── Modo LOCAL: monitorear el Excel y emitir cambios ──────────────
if (MODO === 'LOCAL') {
    const watcher = chokidar.watch(EXCEL_PATH, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 }
    });

    watcher.on('change', () => {
        console.log('✏️  Cambio detectado en el Excel. Enviando actualización...');
        const nuevosDatos = leerDatosExcel();
        if (nuevosDatos) {
            io.emit('actualizar_indicadores', nuevosDatos);
        }
    });
}

// ── Conexión WebSocket ────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('💻 Pantalla TV conectada');
    const datos = MODO === 'AZURE' ? datosEnMemoria : leerDatosExcel();
    if (datos) {
        socket.emit('actualizar_indicadores', datos);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor [${MODO}] en http://localhost:${PORT}`);
    if (MODO === 'LOCAL') {
        console.log(`📊 Monitoreando: ${EXCEL_PATH}`);
    } else {
        console.log(`☁️  Esperando datos via POST /api/push`);
    }
});