"""
extract_silhouette.py  v2
Extrae la silueta de botella.jpg con mayor fidelidad:
- Blur suave para eliminar gotas sin destruir bordes
- Umbral más alto para capturar el plástico transparente
- Muestreo cada N filas para obtener puntos uniformes
- Sin Douglas-Peucker agresivo: suavizado por promedio de ventana
"""
from PIL import Image, ImageFilter
import json, math

IMG_PATH  = "public/botella.jpg"
OUT_PATH  = "public/bottle_silhouette.json"
THRESHOLD = 245   # más alto = captura plástico casi blanco
BLUR_R    = 2     # blur suave
SAMPLE    = 4     # tomar 1 punto cada N filas
SMOOTH_W  = 5     # ventana de suavizado (promedio movil)

# ── 1. Cargar, blur suave, escala de grises ───────────────────────────────────
img = Image.open(IMG_PATH).convert("L")
img = img.filter(ImageFilter.GaussianBlur(radius=BLUR_R))
W, H = img.size
pix = img.load()

# ── 2. Contorno izquierdo y derecho por fila ──────────────────────────────────
left_pts  = []
right_pts = []

for y in range(H):
    row = [x for x in range(W) if pix[x, y] < THRESHOLD]
    if row:
        left_pts.append((min(row), y))
        right_pts.append((max(row), y))

# ── 3. Suavizado por promedio de ventana ──────────────────────────────────────
def smooth(pts, w):
    result = []
    for i in range(len(pts)):
        xs = [pts[j][0] for j in range(max(0,i-w), min(len(pts),i+w+1))]
        ys = [pts[j][1] for j in range(max(0,i-w), min(len(pts),i+w+1))]
        result.append((sum(xs)/len(xs), sum(ys)/len(ys)))
    return result

left_pts  = smooth(left_pts,  SMOOTH_W)
right_pts = smooth(right_pts, SMOOTH_W)

# ── 4. Muestreo uniforme ──────────────────────────────────────────────────────
left_sampled  = left_pts[::SAMPLE]
right_sampled = right_pts[::SAMPLE]

# Asegurar que el último punto de cada lado esté incluido
if left_sampled[-1] != left_pts[-1]:
    left_sampled.append(left_pts[-1])
if right_sampled[-1] != right_pts[-1]:
    right_sampled.append(right_pts[-1])

# Contorno completo: izq arriba→abajo, der abajo→arriba
contour = left_sampled + list(reversed(right_sampled))

# ── 5. Normalizar a viewBox 0..1000 × 0..aspectH ─────────────────────────────
aspectH = round(H / W * 1000)
def norm(x, y):
    return (round(x * 1000 / W, 1), round(y * aspectH / H, 1))

pts_norm = [norm(x, y) for x, y in contour]

# ── 6. Construir path SVG con curvas cúbicas (C) para suavidad ───────────────
# Usamos líneas rectas (L) — el suavizado ya está aplicado
d_parts = [f"M {pts_norm[0][0]},{pts_norm[0][1]}"]
for px, py in pts_norm[1:]:
    d_parts.append(f"L {px},{py}")
d_parts.append("Z")
svg_path = " ".join(d_parts)

result = {
    "viewBox": f"0 0 1000 {aspectH}",
    "W": W, "H": H, "aspectH": aspectH,
    "points": len(pts_norm),
    "path": svg_path
}

with open(OUT_PATH, "w") as f:
    json.dump(result, f, indent=2)

print(f"OK: {len(pts_norm)} puntos → {OUT_PATH}")
print(f"Imagen: {W}x{H}  viewBox: 0 0 1000 {aspectH}")
print(f"Path:\n{svg_path}")
