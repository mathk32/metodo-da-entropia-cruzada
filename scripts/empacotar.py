"""Reúne os arquivos necessários para estudar e executar os dois experimentos."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

RAIZ = Path(__file__).resolve().parents[1]
SITE = RAIZ / "site" / "dist"


def main():
    arquivos = [
        RAIZ / "LICENSE",
        RAIZ / "requirements.txt",
        RAIZ / "scripts" / "README.md",
    ]
    arquivos.extend(sorted((RAIZ / "scripts").glob("*.py")))
    arquivos.extend(sorted(p for p in SITE.iterdir() if p.is_file()))
    destino = SITE / "downloads" / "experimentos.zip"
    destino.parent.mkdir(exist_ok=True)
    temporario = destino.with_suffix(".tmp")
    with ZipFile(temporario, "w", compression=ZIP_DEFLATED) as pacote:
        for arquivo in arquivos:
            pacote.write(arquivo, arquivo.relative_to(RAIZ))
    temporario.replace(destino)
    print(f"Código reunido em {destino}")


if __name__ == "__main__":
    main()
