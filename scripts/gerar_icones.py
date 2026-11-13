"""Gera os ícones do app (PWA), o favicon e o logotipo do cabeçalho.

Requer Pillow: pip install pillow.
Uso: python3 scripts/gerar_icones.py

A arte de origem é scripts/logo-origem.png (símbolo com fundo transparente).
Para trocar o logotipo, substitua esse arquivo e rode o script de novo.
"""
from pathlib import Path
from PIL import Image

FUNDO = "#0b1220"
RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
ORIGEM = Image.open(Path(__file__).resolve().parent / "logo-origem.png").convert("RGBA")


def simbolo(lado):
    """O símbolo reduzido para caber em um quadrado de `lado` pixels, mantendo a proporção."""
    escala = lado / max(ORIGEM.size)
    tamanho = (max(1, round(ORIGEM.width * escala)), max(1, round(ORIGEM.height * escala)))
    return ORIGEM.resize(tamanho, Image.LANCZOS)


def icone(tamanho, proporcao, fundo=FUNDO):
    """Ícone quadrado; `proporcao` é o lado ocupado pelo símbolo. `fundo=None` deixa transparente."""
    imagem = Image.new("RGBA", (tamanho, tamanho), fundo or (0, 0, 0, 0))
    desenho = simbolo(round(tamanho * proporcao))
    posicao = ((tamanho - desenho.width) // 2, (tamanho - desenho.height) // 2)
    imagem.alpha_composite(desenho, posicao)
    return imagem if fundo is None else imagem.convert("RGB")


if __name__ == "__main__":
    icones = PUBLICO / "icones"
    icones.mkdir(parents=True, exist_ok=True)
    icone(192, 0.78).save(icones / "icone-192.png", optimize=True)
    icone(512, 0.78).save(icones / "icone-512.png", optimize=True)
    # Ícone mascarável: o desenho fica na área segura central (o sistema recorta as bordas).
    icone(512, 0.56).save(icones / "icone-mascaravel-512.png", optimize=True)
    icone(180, 0.78).save(icones / "apple-touch-icon.png", optimize=True)
    # Miniatura do site (aba do navegador), com fundo para aparecer bem em abas claras e escuras.
    icone(64, 0.86).save(PUBLICO / "favicon.png", optimize=True)
    # Logotipo do cabeçalho, com fundo transparente.
    icone(192, 0.98, fundo=None).save(PUBLICO / "logo.png", optimize=True)
    print("Ícones gerados em", PUBLICO)
