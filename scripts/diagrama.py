"""Gera o diagrama do ciclo do CEM usado na teoria."""

import shutil
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

RAIZ = Path(__file__).resolve().parents[1]
ETAPAS = [
    ("Coletar", "Jogar N episódios"),
    ("Ordenar", "Comparar retornos"),
    ("Selecionar", "Aplicar o corte"),
    ("Ajustar", "Imitar ações da elite"),
]


def main():
    figura, eixo = plt.subplots(figsize=(8.2, 1.62))
    eixo.set(xlim=(0, 8.2), ylim=(0, 1.62))
    eixo.axis("off")
    seta = dict(arrowstyle="->", lw=1.1, color="#466c60")
    for i, (titulo, descricao) in enumerate(ETAPAS):
        x = 0.04 + 2.08 * i
        caixa = FancyBboxPatch(
            (x, 0.68),
            1.84,
            0.75,
            boxstyle="round,pad=0.025,rounding_size=0.08",
            linewidth=1.2,
            facecolor="#eef5ee",
            edgecolor="#466c60",
        )
        eixo.add_patch(caixa)
        eixo.text(
            x + 0.92,
            1.15,
            titulo,
            ha="center",
            va="center",
            color="#194a3d",
            weight="bold",
            fontsize=12,
        )
        eixo.text(
            x + 0.92,
            0.89,
            descricao,
            ha="center",
            va="center",
            color="#1d332b",
            fontsize=9,
        )
        if i + 1 < len(ETAPAS):
            eixo.annotate("", (x + 2.05, 1.05), (x + 1.87, 1.05), arrowprops=seta)
    eixo.plot([7.2, 7.2, 0.96], [0.65, 0.32, 0.32], color="#466c60", lw=1.1)
    eixo.annotate("", (0.96, 0.65), (0.96, 0.30), arrowprops=seta)
    eixo.text(
        4.1,
        0.3,
        "  nova política  ",
        ha="center",
        va="center",
        fontsize=9,
        backgroundcolor="white",
        color="#194a3d",
    )
    figura.subplots_adjust(left=0, right=1, bottom=0, top=1)
    arquivo = RAIZ / "media" / "ciclo.png"
    arquivo.parent.mkdir(exist_ok=True)
    figura.savefig(arquivo, dpi=170, bbox_inches="tight", pad_inches=0.02)
    plt.close(figura)
    shutil.copyfile(arquivo, RAIZ / "site" / "dist" / arquivo.name)


if __name__ == "__main__":
    main()
