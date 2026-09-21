# Dashboard TV - Tablero de Producción

Este proyecto es un tablero de control que se muestra en una pantalla de TV en planta. Muestra los indicadores de producción en tiempo real leyendo un archivo Excel, y se actualiza solo cada vez que ese archivo cambia.

---

## Requisitos previos

Antes de correr el proyecto necesitas tener instalado **Node.js**. Si al abrir la terminal y escribir `node --version` no aparece nada, hay que instalarlo.

Descargarlo desde: https://nodejs.org — versión LTS, instalar con todo por defecto.

Una vez instalado, cerrar y volver a abrir la terminal.

---

## Cómo correrlo

Instalar las dependencias (solo la primera vez):

```
npm install
```

Luego para iniciarlo hay dos formas:

**Si estás en Windows**, hacer doble clic en `Iniciar_Tablero.bat`. Abre el navegador y levanta el servidor solo.

**O desde la terminal:**

```
node server.js
```

Una vez corriendo se puede acceder desde:

- `http://localhost:3000/tv.html` — pantalla que va en la TV
- `http://localhost:3000/admin.html` — para actualizar datos manualmente

---

## De dónde salen los datos

El servidor lee el archivo `Estimado de producción - Septiembre 2026.xlsx` que tiene que estar en la carpeta raíz del proyecto. Usa específicamente la hoja llamada `Estimado Produccion`.

De ese archivo toma estas filas:

- Fila 8 → Célula 1
- Fila 9 → Célula 2
- Fila 10 → Célula 3
- Fila 11 → Total general

Y de cada fila lee las columnas B (nombre), C (estimado), D (producción real) e I (cumplimiento por fecha).

Cuando alguien guarda el Excel, el tablero en la TV se actualiza automáticamente sin necesidad de recargar la página.

---

## Los paneles de la TV

La pantalla rota entre 4 paneles, cada uno durante 10 segundos:

1. **Indicadores Célula / PET** — cumplimiento, producción real y estimado de las 3 células
2. **Línea Tetra Pak** — panel preparado, pendiente de conectar datos reales
3. **Mantenimiento** — paradas programadas, no programadas y MTBF
4. **OEE** — disponibilidad, desempeño y calidad de planta

Abajo siempre se ve el total general del turno.

---

## Estructura de archivos

```
dashboard-tv/
    server.js                 servidor principal
    package.json
    Iniciar_Tablero.bat       inicio rápido para Windows
    Estimado de producción - Septiembre 2026.xlsx
    public/
        tv.html               pantalla de la TV
        admin.html            formulario de carga manual
```

---

## Notas

- El nombre del archivo Excel y el nombre de la hoja tienen que ser exactos, si cambian el servidor va a tirar error.
- El puerto por defecto es el 3000, se puede cambiar al final de `server.js`.
- Los paneles 2, 3 y 4 tienen estructura pero los datos están fijos, todavía no se leen de ninguna fuente dinámica.
- Las dependencias `xlsx` y `chokidar` son necesarias para leer el Excel y detectar cambios. Se instalan solas con `npm install`.
