#!/usr/bin/env python3
"""Converte um modelo digital do terreno (GeoTIFF) em tiles Terrarium para o app.

O app lê a altitude de tiles PNG no formato Terrarium:
    altitude (m) = R * 256 + G + B / 256 - 32768
Este script recorta a área de Pernambuco, reprojeta para a grade de tiles da web
(Web Mercator) e grava  <saida>/{z}/{x}/{y}.png .

Preparação (uma vez):
    python3 -m venv .venv-relevo && . .venv-relevo/bin/activate
    pip install -r scripts/requisitos-relevo.txt

Uso:
    python3 scripts/gerar_tiles_relevo.py PASTA_OU_ARQUIVOS.tif --saida relevo

Passo a passo completo (fontes de dados, hospedagem, configuração): docs/RELEVO.md
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds

# Mesmos limites de src/config/app.ts (LIMITES_PE).
PERNAMBUCO = {"sul": -9.49, "norte": -7.15, "oeste": -41.36, "leste": -34.8}
TAMANHO = 256
RAIO = 6378137.0
MEIA_VOLTA = math.pi * RAIO
WEB_MERCATOR = CRS.from_epsg(3857)
WGS84 = CRS.from_epsg(4326)


def tile_de(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    """Tile (x, y) que contém a coordenada — a mesma conta de src/domain/altitude.ts."""
    n = 2**zoom
    x = int((lon + 180.0) / 360.0 * n)
    seno = math.sin(math.radians(lat))
    y = int((0.5 - math.log((1 + seno) / (1 - seno)) / (4 * math.pi)) * n)
    return min(n - 1, max(0, x)), min(n - 1, max(0, y))


def limites_do_tile(zoom: int, x: int, y: int) -> tuple[float, float, float, float]:
    """(oeste, sul, leste, norte) do tile, em metros Web Mercator."""
    lado = 2 * MEIA_VOLTA / 2**zoom
    oeste = -MEIA_VOLTA + x * lado
    norte = MEIA_VOLTA - y * lado
    return oeste, norte - lado, oeste + lado, norte


def codificar(altitudes: np.ndarray) -> Image.Image:
    """Altitudes (m) -> imagem RGB Terrarium."""
    valor = np.clip(altitudes.astype(np.float64) + 32768.0, 0, 65535.996)
    inteiro = np.floor(valor)
    rgb = np.stack(
        [inteiro // 256, inteiro % 256, np.floor((valor - inteiro) * 256)], axis=-1
    ).astype(np.uint8)
    return Image.fromarray(rgb, "RGB")


def decodificar(caminho: Path) -> np.ndarray:
    rgb = np.asarray(Image.open(caminho).convert("RGB"), dtype=np.float64)
    return rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768


class Fonte:
    """Um GeoTIFF de entrada, com seus limites já convertidos para Web Mercator."""

    def __init__(self, caminho: Path):
        self.caminho = caminho
        self.dados = rasterio.open(caminho)
        if self.dados.crs is None:
            raise SystemExit(f"{caminho}: o arquivo não informa o sistema de coordenadas.")
        self.limites = transform_bounds(self.dados.crs, WEB_MERCATOR, *self.dados.bounds, densify_pts=21)
        oeste, sul, leste, norte = self.limites
        # Tamanho aproximado do pixel de origem, em metros Web Mercator.
        self.pixel = min((leste - oeste) / self.dados.width, (norte - sul) / self.dados.height)

    def toca(self, limites: tuple[float, float, float, float]) -> bool:
        o, s, l, n = limites
        fo, fs, fl, fn = self.limites
        return fo < l and fl > o and fs < n and fn > s


def montar_tile(fontes: list[Fonte], zoom: int, x: int, y: int) -> np.ndarray | None:
    """Altitudes do tile (NaN onde não há dado), ou None se nenhuma fonte o cobre."""
    limites = limites_do_tile(zoom, x, y)
    destino = np.full((TAMANHO, TAMANHO), np.nan, dtype=np.float32)
    transformacao = from_bounds(*limites, TAMANHO, TAMANHO)
    pixel_destino = (limites[2] - limites[0]) / TAMANHO
    usou = False
    for fonte in fontes:
        if not fonte.toca(limites):
            continue
        parte = np.full((TAMANHO, TAMANHO), np.nan, dtype=np.float32)
        reproject(
            source=rasterio.band(fonte.dados, 1),
            destination=parte,
            src_nodata=fonte.dados.nodata,
            dst_transform=transformacao,
            dst_crs=WEB_MERCATOR,
            dst_nodata=np.nan,
            # Origem bem mais detalhada que o tile: média (evita "serrilhado").
            resampling=Resampling.average if fonte.pixel * 2 < pixel_destino else Resampling.bilinear,
        )
        vazio = np.isnan(destino)
        destino[vazio] = parte[vazio]
        usou = True
    if not usou or np.all(np.isnan(destino)):
        return None
    return destino


def gravar(saida: Path, zoom: int, x: int, y: int, altitudes: np.ndarray) -> None:
    caminho = saida / str(zoom) / str(x) / f"{y}.png"
    caminho.parent.mkdir(parents=True, exist_ok=True)
    # Sem dado (mar, fora da fonte) vira 0 m, que o app mostra como transparente.
    codificar(np.nan_to_num(altitudes, nan=0.0)).save(caminho, optimize=True)


def reduzir(saida: Path, zoom: int, x: int, y: int) -> np.ndarray | None:
    """Tile do zoom anterior: média 2 x 2 dos quatro tiles filhos."""
    mosaico = np.zeros((TAMANHO * 2, TAMANHO * 2), dtype=np.float64)
    achou = False
    for dy in (0, 1):
        for dx in (0, 1):
            filho = saida / str(zoom + 1) / str(2 * x + dx) / f"{2 * y + dy}.png"
            if filho.exists():
                mosaico[dy * TAMANHO:(dy + 1) * TAMANHO, dx * TAMANHO:(dx + 1) * TAMANHO] = decodificar(filho)
                achou = True
    if not achou:
        return None
    return mosaico.reshape(TAMANHO, 2, TAMANHO, 2).mean(axis=(1, 3))


def listar_entradas(entradas: list[str]) -> list[Path]:
    arquivos: list[Path] = []
    for entrada in entradas:
        caminho = Path(entrada)
        if caminho.is_dir():
            arquivos += sorted(p for p in caminho.rglob("*") if p.suffix.lower() in (".tif", ".tiff"))
        elif caminho.is_file():
            arquivos.append(caminho)
        else:
            raise SystemExit(f"Entrada não encontrada: {entrada}")
    if not arquivos:
        raise SystemExit("Nenhum arquivo .tif encontrado nas entradas.")
    return arquivos


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("entradas", nargs="+", help="arquivos GeoTIFF ou pastas que os contêm")
    p.add_argument("--saida", default="relevo", help="pasta de saída (padrão: relevo)")
    p.add_argument("--zoom-max", type=int, default=13, help="zoom mais detalhado (padrão 13, ~19 m por pixel)")
    p.add_argument("--zoom-min", type=int, default=6, help="zoom menos detalhado (padrão 6)")
    p.add_argument("--area", type=float, nargs=4, metavar=("SUL", "OESTE", "NORTE", "LESTE"),
                   help="recorte em graus (padrão: Pernambuco)")
    a = p.parse_args()
    if not 0 <= a.zoom_min <= a.zoom_max <= 15:
        raise SystemExit("Use 0 <= zoom-min <= zoom-max <= 15.")
    area = dict(zip(("sul", "oeste", "norte", "leste"), a.area)) if a.area else PERNAMBUCO
    saida = Path(a.saida)

    fontes = [Fonte(c) for c in listar_entradas(a.entradas)]
    print(f"{len(fontes)} arquivo(s) de entrada; menor pixel de origem: ~{min(f.pixel for f in fontes):.1f} m")

    x0, y0 = tile_de(area["norte"], area["oeste"], a.zoom_max)
    x1, y1 = tile_de(area["sul"], area["leste"], a.zoom_max)
    total = (x1 - x0 + 1) * (y1 - y0 + 1)
    print(f"Zoom {a.zoom_max}: {total} tiles na área")
    gravados = sem_dado = 0
    for i, x in enumerate(range(x0, x1 + 1)):
        for y in range(y0, y1 + 1):
            altitudes = montar_tile(fontes, a.zoom_max, x, y)
            if altitudes is None:
                sem_dado += 1
                continue
            gravar(saida, a.zoom_max, x, y, altitudes)
            gravados += 1
        print(f"\r  coluna {i + 1}/{x1 - x0 + 1}", end="", file=sys.stderr, flush=True)
    print(f"\n  {gravados} gravados, {sem_dado} sem dado na fonte (não gravados)")
    if gravados == 0:
        raise SystemExit("Nenhum tile gravado: os arquivos de entrada não cobrem a área pedida.")

    for zoom in range(a.zoom_max - 1, a.zoom_min - 1, -1):
        x0, y0, x1, y1 = x0 // 2, y0 // 2, x1 // 2, y1 // 2
        quantos = 0
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                altitudes = reduzir(saida, zoom, x, y)
                if altitudes is not None:
                    gravar(saida, zoom, x, y, altitudes)
                    quantos += 1
        print(f"Zoom {zoom}: {quantos} tiles")

    tamanho = sum(f.stat().st_size for f in saida.rglob("*.png")) / 1e6
    print(f"Pronto: {saida}/ ({tamanho:.0f} MB). Configure VITE_RELEVO_ZOOM_MAXIMO={a.zoom_max}.")


if __name__ == "__main__":
    main()
