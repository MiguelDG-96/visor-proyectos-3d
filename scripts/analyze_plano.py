import pymupdf, json, math, re

pdf_path = r'd:/programas/proyecto/visor-inmobiliario-3d/FEBRERO ULTIMA-ULTIMA - HABILITACION URBANA LLUYLLUCUCHA-Model.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]
page_h = page.rect.height   # altura de pagina en pts

blocks = page.get_text('blocks')

manzana_centers = {
    'Mz-A': (1190.6, 1158.0),
    'Mz-B': (1716.9, 1520.3),
    'Mz-C': (923.7,  1556.1),
    'Mz-D': (1421.2, 1947.8),
}

# Escala: analizar distancia entre lotes consecutivos estandar
# L12 de Mz-A (0-indexed=11): (1357.0, 1424.3)
# L13 de Mz-A (0-indexed=12): (1312.4, 1393.0)
# Diferencia: (-44.6, -31.3) por 6m de frente
# Longitud: sqrt(44.6^2 + 31.3^2) = sqrt(1989+980) = sqrt(2969) = 54.5 pts
# => 1m = 54.5/6 = 9.08 pts
SCALE = 9.08  # pts por metro
ROT_DEG = math.degrees(math.atan2(31.3, 44.6))  # angulo de inclinacion
print(f"Escala: {SCALE:.2f} pts/m")
print(f"Angulo inclinacion: {ROT_DEG:.1f} grados")

# Recopilar todos los labels de lotes con coordenadas
all_lot_labels = []
for b in blocks:
    x0,y0,x1,y1,text,_,_ = b
    text = text.strip()
    cx = (x0+x1)/2
    cy = (y0+y1)/2
    
    if 'L :' in text:
        nums = re.findall(r'L\s*:\s*(\d+)', text)
        areas = re.findall(r'A:\s*([\d.]+)', text)
        for i, n in enumerate(nums):
            area = float(areas[i]) if i < len(areas) else None
            all_lot_labels.append({
                'lote': int(n), 'area': area,
                'px': cx, 'py': cy,
            })

def closest_manzana(x, y):
    best, best_d = None, 1e9
    for mz, (mx, my) in manzana_centers.items():
        d = math.sqrt((x-mx)**2 + (y-my)**2)
        if d < best_d:
            best_d = d
            best = mz
    return best, best_d

by_manzana = {mz: [] for mz in manzana_centers}
for lot in all_lot_labels:
    mz, dist = closest_manzana(lot['px'], lot['py'])
    if dist < 600:
        lot['manzana'] = mz
        by_manzana[mz].append(lot)

# Convertir coordenadas PDF a metros usando Mz-A como origen
# PDF origin top-left, Y aumenta hacia abajo
# World: X=este, Z=sur (Y hacia abajo en PDF = Z positivo en Three.js)
mzA_cx, mzA_cy = manzana_centers['Mz-A']

def pdf_to_world(px, py):
    dx = (px - mzA_cx) / SCALE
    dy = (py - mzA_cy) / SCALE  # Y hacia abajo en PDF = Z positivo
    return round(dx, 2), round(dy, 2)

# Calcular posicion de cada manzana en metros relativos a Mz-A
print("\nCentros de manzanas en metros (relativo a Mz-A):")
manzana_world = {}
for mz, (cx, cy) in manzana_centers.items():
    wx, wz = pdf_to_world(cx, cy)
    manzana_world[mz] = (wx, wz)
    print(f"  {mz}: ({wx:.1f}m, {wz:.1f}m)")

# Mostrar lotes por manzana
for mz, lots in by_manzana.items():
    lots.sort(key=lambda x: x['lote'])
    print(f"\n=== {mz} === {len(lots)} lotes")
    for l in lots:
        wx, wz = pdf_to_world(l['px'], l['py'])
        print(f"  L{l['lote']:02d}: pdf({l['px']:.0f},{l['py']:.0f}) world({wx:.1f},{wz:.1f}) area={l['area']}")
