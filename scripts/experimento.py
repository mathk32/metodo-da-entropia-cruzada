"""Compara políticas por semente e resume os cinco lotes finais de cada execução."""

import argparse
import csv
import shutil
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from cem import AMBIENTES, executar, inteiro_positivo, positivo

RAIZ = Path(__file__).resolve().parents[1]
FRACOES = (0.1, 0.3, 0.6, 1.0)
TAXAS = (0.2, 0.8, 2.0, 5.0)
UNIFORME = "Política uniforme"


@dataclass(frozen=True)
class Configuracao:
    ambiente: str
    rho: float
    alpha: float
    gelo: bool | None = None
    aprender: bool = True
    estrito: bool = False
    gamma: float = 1.0


def configuracoes(alpha):
    for ambiente in AMBIENTES:
        gelo = True if ambiente == "FrozenLake-v1" else None
        for rho in FRACOES:
            yield Configuracao(ambiente, rho, alpha, gelo=gelo)
        yield Configuracao(ambiente, 1.0, alpha, gelo=gelo, aprender=False)
    for gelo in (True, False):
        for gamma in (1.0, 0.9):
            yield Configuracao(
                "FrozenLake-v1", 0.3, alpha, gelo=gelo, estrito=True, gamma=gamma
            )
    yield Configuracao("FrozenLake-v1", 0.3, alpha, gelo=False)
    yield Configuracao("FrozenLake-v1", 1.0, alpha, gelo=False, aprender=False)
    for taxa in TAXAS:
        if taxa != alpha:
            for rho in (0.1, 0.3):
                yield Configuracao("CartPole-v1", rho, taxa)


def por_semente(linhas):
    grupos = defaultdict(list)
    for linha in sorted(linhas, key=lambda r: r["iteracao"]):
        grupos[linha["semente"]].append(linha["retorno"])
    return np.array(list(grupos.values()))


def resumir(linhas):
    campos = (
        "ambiente",
        "superficie",
        "metodo",
        "regra",
        "rho",
        "gamma",
        "alpha",
        "passos",
        "lote",
    )
    grupos = defaultdict(list)
    for linha in linhas:
        grupos[tuple(linha[c] for c in campos)].append(linha)
    for chave, grupo in grupos.items():
        dados = dict(zip(campos, chave))
        matriz = por_semente(grupo)
        janela = matriz[:, -5:]
        final = janela.mean(axis=1)
        vazios = [r for r in grupo if r["fracao_elite"] == 0]
        lago = dados["ambiente"] == "FrozenLake-v1"
        yield dict(
            **dados,
            sementes=len(final),
            lotes=len(grupo),
            inicial=matriz[:, 0].mean(),
            media=final.mean(),
            minimo=final.min(),
            maximo=final.max(),
            sucessos=int(round(janela.sum() * dados["lote"])) if lago else "",
            episodios_finais=janela.size * dados["lote"],
            vazios=len(vazios),
            vazios_sem_sucesso=sum(r["retorno"] == 0 for r in vazios),
            vazios_com_sucesso=sum(r["retorno"] > 0 for r in vazios),
            cortes_500=sum(r["limiar"] == 500 for r in grupo),
            maior_elite_corte_500=max(
                (r["fracao_elite"] for r in grupo if r["limiar"] == 500), default=0
            ),
        )


def gravar(dados, destino):
    with destino.open("w", encoding="utf-8", newline="") as saida:
        escritor = csv.DictWriter(saida, fieldnames=list(dados[0]))
        escritor.writeheader()
        escritor.writerows(dados)


def decimal(x):
    return f"{x:g}".replace(".", ",")


def curva(eixo, matriz, nome, cor):
    lotes = np.arange(matriz.shape[1])
    eixo.plot(lotes, matriz.mean(axis=0), label=nome, color=cor)
    eixo.fill_between(
        lotes, matriz.min(axis=0), matriz.max(axis=0), color=cor, alpha=0.10
    )


def desenhar(linhas, resumos, destino, alpha):
    fig, eixos = plt.subplots(2, 2, figsize=(12, 8), layout="constrained")
    base = [r for r in linhas if r["alpha"] == alpha]
    cores = ("#785394", "#00796b", "#95612c", "#3064a0", "#555555")
    for (rho, metodo), cor in zip(
        [(r, "CEM") for r in FRACOES] + [(1, UNIFORME)], cores
    ):
        nome = f"ρ={decimal(rho)}" if metodo == "CEM" else UNIFORME
        matriz = por_semente(
            [
                r
                for r in base
                if r["superficie"] == "trilho"
                and r["rho"] == rho
                and r["metodo"] == metodo
            ]
        )
        curva(eixos[0, 0], matriz, nome, cor)
        final = matriz[:, -5:].mean(axis=1)
        eixos[1, 0].scatter([nome] * len(final), final, color=cor, alpha=0.65)
        eixos[1, 0].scatter([nome], [final.mean()], marker="_", s=240, color="black")
    for indice, superficie in enumerate(("gelo", "firme")):
        eixo = eixos[indice, 1]
        for regra, gamma, metodo, cor in (
            ("inclusiva", 1, "CEM", cores[2]),
            ("estrita", 1, "CEM", cores[1]),
            ("estrita", 0.9, "CEM", cores[0]),
            ("inclusiva", 1, UNIFORME, cores[4]),
        ):
            matriz = por_semente(
                [
                    r
                    for r in base
                    if r["superficie"] == superficie
                    and r["regra"] == regra
                    and r["gamma"] == gamma
                    and r["metodo"] == metodo
                    and (metodo == UNIFORME or r["rho"] == 0.3)
                ]
            )
            nome = (
                f"{regra.capitalize()}, ρ=0,3 · γ={decimal(gamma)}"
                if metodo == "CEM"
                else metodo
            )
            curva(eixo, matriz, nome, cor)
        eixo.set(
            title=f"FrozenLake · {superficie}",
            xlabel="Lote",
            ylabel="Fração de sucessos",
            ylim=(0, 1.02),
        )
    eixos[0, 0].set(
        title="CartPole · trajetória do treino",
        xlabel="Lote",
        ylabel="Retorno (passos)",
    )
    eixos[1, 0].set(
        title="CartPole · cinco lotes finais por semente", ylabel="Retorno (passos)"
    )
    for eixo in eixos.flat:
        eixo.grid(axis="y", alpha=0.2)
        if eixo.lines:
            eixo.legend(fontsize=8)
    fig.savefig(destino / "comparacao.png", dpi=150)
    plt.close(fig)
    fig, eixo = plt.subplots(figsize=(7.5, 4), layout="constrained")
    for rho, cor in zip((0.1, 0.3), cores):
        serie = sorted(
            (
                r
                for r in resumos
                if r["superficie"] == "trilho"
                and r["rho"] == rho
                and r["alpha"] in TAXAS
            ),
            key=lambda r: r["alpha"],
        )
        x = [r["alpha"] for r in serie]
        eixo.plot(
            x, [r["media"] for r in serie], "o-", label=f"ρ={decimal(rho)}", color=cor
        )
        eixo.fill_between(
            x,
            [r["minimo"] for r in serie],
            [r["maximo"] for r in serie],
            color=cor,
            alpha=0.14,
        )
    uniforme = next(
        r["media"] for r in resumos if r["superficie"] == "trilho" and r["metodo"] == UNIFORME
    )
    eixo.axhline(uniforme, color=cores[4], ls="--", lw=1.2, label=UNIFORME)
    eixo.set(
        xlabel="Passo de gradiente α",
        ylabel="Retorno final (passos)",
        title="CartPole · média e extremos entre sementes",
    )
    eixo.set_xticks(TAXAS, [decimal(x) for x in TAXAS])
    eixo.legend()
    fig.savefig(destino / "varredura-alpha.png", dpi=150)
    plt.close(fig)


def ler(arquivo):
    tipos = {"rho": float, "alpha": float, "gamma": float, "passos": int, "lote": int,
             "semente": int, "iteracao": int, "retorno": float, "fracao_elite": float,
             "limiar": float}
    with arquivo.open(encoding="utf-8") as entrada:
        return [{k: tipos.get(k, str)(v) for k, v in linha.items()} for linha in csv.DictReader(entrada)]


def publicar(destino, nomes):
    if destino.resolve() == (RAIZ / "media").resolve():
        for nome in nomes:
            shutil.copyfile(destino / nome, RAIZ / "site" / "dist" / nome)


def main():
    parser = argparse.ArgumentParser(description="Compare o CEM à política uniforme.")
    parser.add_argument(
        "--rapido", action="store_true", help="10 lotes por execução em vez de 30"
    )
    parser.add_argument("--semente", type=int, default=17)
    parser.add_argument("--sementes", type=inteiro_positivo, default=5)
    parser.add_argument(
        "--alpha", type=positivo, default=0.8, help="taxa da comparação principal"
    )
    parser.add_argument("--passos-gradiente", type=inteiro_positivo, default=8)
    parser.add_argument("--lote", type=inteiro_positivo, default=16)
    parser.add_argument("--saida", type=Path, default=RAIZ / "media")
    parser.add_argument(
        "--so-figuras",
        action="store_true",
        help="redesenha as figuras a partir do resultados.csv existente, sem nova coleta",
    )
    args = parser.parse_args()
    if args.semente < 0:
        parser.error("Use uma semente não negativa.")
    destino = args.saida / "rapido" if args.rapido else args.saida
    destino.mkdir(parents=True, exist_ok=True)
    figuras = ("comparacao.png", "varredura-alpha.png")
    if args.so_figuras:
        if not (destino / "resultados.csv").exists():
            parser.error(f"Não há {destino / 'resultados.csv'}. Rode a coleta antes de redesenhar.")
        linhas = ler(destino / "resultados.csv")
        desenhar(linhas, list(resumir(linhas)), destino, args.alpha)
        publicar(destino, figuras)
        print(f"Figuras redesenhadas em {destino}")
        return
    linhas = []
    grade = list(configuracoes(args.alpha))
    for i, config in enumerate(grade, 1):
        regra = "estrita" if config.estrito else "inclusiva"
        superficie = {None: "trilho", True: "gelo", False: "firme"}[config.gelo]
        metodo = "CEM" if config.aprender else UNIFORME
        print(
            f"[{i}/{len(grade)}] {config.ambiente} · {superficie} · {metodo} · {regra} · "
            f"ρ={decimal(config.rho)} · α={decimal(config.alpha)} · γ={decimal(config.gamma)}",
            flush=True,
        )
        for semente in range(args.semente, args.semente + args.sementes):
            linhas.extend(
                executar(
                    **asdict(config),
                    semente=semente,
                    iteracoes=10 if args.rapido else 30,
                    lote=args.lote,
                    passos=args.passos_gradiente,
                )
            )
    resumo = list(resumir(linhas))
    gravar(linhas, destino / "resultados.csv")
    gravar(resumo, destino / "resumo.csv")
    for r in resumo:
        print(
            f"{r['ambiente']} {r['superficie']} {r['metodo']} {r['regra']} "
            f"ρ={r['rho']} α={r['alpha']} γ={r['gamma']}: "
            f"{r['media']:.4f} [{r['minimo']:.4f}, {r['maximo']:.4f}], "
            f"{r['vazios']} lotes vazios (sem sucesso: {r['vazios_sem_sucesso']}, "
            f"com sucesso: {r['vazios_com_sucesso']}), {r['cortes_500']} cortes em 500."
        )
        if r["ambiente"] == "FrozenLake-v1":
            print(
                f"  Sucessos na janela final: {r['sucessos']}/{r['episodios_finais']}"
            )
    desenhar(linhas, resumo, destino, args.alpha)
    publicar(destino, ("resultados.csv", "resumo.csv", *figuras))


if __name__ == "__main__":
    main()
