"""Gera os ícones do app (PWA) em public/icones. Requer Pillow: pip install pillow.

Uso: python3 scripts/gerar_icones.py
O desenho é o mesmo escudo do cabeçalho (src/components/layout/Cabecalho.tsx).
"""
from pathlib import Path
from PIL import Image, ImageDraw

FUNDO, LARANJA, BRANCO = "#0b1220", "#ff7a1a", "#ffffff"
SAIDA = Path(__file__).resolve().parent.parent / "public" / "icones"


def curva(p0, p1, p2, p3, passos=24):
    pontos = []
    for i in range(1, passos + 1):
        t = i / passos
        u = 1 - t
        pontos.append(tuple(
            u**3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t**3 * d
            for a, b, c, d in zip(p0, p1, p2, p3)
        ))
    return pontos


# Caixa do desenho original: 38 x 42.
ESCUDO = [(19, 1), (36, 7), (36, 20)]
ESCUDO += curva((36, 20), (36, 30.5), (28.8, 37.8), (19, 41))
ESCUDO += curva((19, 41), (9.2, 37.8), (2, 30.5), (2, 20))
ESCUDO += [(2, 7)]
MONTANHA = [(8, 29), (16, 15), (21, 22), (24, 18), (30, 29)]


def icone(tamanho, proporcao):
    """`proporcao`: altura do escudo em relação ao lado do ícone."""
    fator = 4  # desenha maior e reduz, para suavizar as bordas
    lado = tamanho * fator
    imagem = Image.new("RGB", (lado, lado), FUNDO)
    desenho = ImageDraw.Draw(imagem)
    escala = lado * proporcao / 42
    dx, dy = (lado - 38 * escala) / 2, (lado - 42 * escala) / 2
    mover = lambda pontos: [(dx + x * escala, dy + y * escala) for x, y in pontos]
    desenho.polygon(mover(ESCUDO), fill=LARANJA)
    desenho.polygon(mover(MONTANHA), fill=BRANCO)
    return imagem.resize((tamanho, tamanho), Image.LANCZOS)


SAIDA.mkdir(parents=True, exist_ok=True)
icone(192, 0.72).save(SAIDA / "icone-192.png", optimize=True)
icone(512, 0.72).save(SAIDA / "icone-512.png", optimize=True)
# Mascarável: o Android pode recortar até 10% de cada borda; o escudo fica na área segura.
icone(512, 0.56).save(SAIDA / "icone-mascaravel-512.png", optimize=True)
icone(180, 0.72).save(SAIDA / "apple-touch-icon.png", optimize=True)
print("Ícones gerados em", SAIDA)
