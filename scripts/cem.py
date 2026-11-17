"""Seleção de trajetórias e ajuste de uma política softmax."""

import argparse
from dataclasses import dataclass

import gymnasium as gym
import numpy as np


AMBIENTES = ("CartPole-v1", "FrozenLake-v1")


@dataclass
class Episodio:
    atributos: list
    acoes: list
    G0: float


def atributos(ambiente, s, estados):
    if ambiente == "FrozenLake-v1":
        return estados[s]
    # Escalas fixas das observações; o último componente é o intercepto.
    x, velocidade, angulo, velocidade_angular = s
    return np.array([x / 2.4, velocidade, angulo / 0.21, velocidade_angular, 1.0])


def probabilidades(logits):
    pesos = np.exp(logits - logits.max(axis=-1, keepdims=True))
    return pesos / pesos.sum(axis=-1, keepdims=True)


def sortear_acao(pi, gerador):
    # Cada ação ocupa um intervalo de comprimento pi[a] no segmento [0, 1).
    return int(np.searchsorted(np.cumsum(pi)[:-1], gerador.random(), side="right"))


def coletar(env, ambiente, theta, gerador, lote, semente_env, estados):
    episodios = []
    for i in range(lote):
        s, _ = env.reset(seed=semente_env + i)
        trajeto, acoes = [], []
        G0 = 0.0
        while True:
            x = atributos(ambiente, s, estados)
            pi = probabilidades(x @ theta)
            a = sortear_acao(pi, gerador)
            s, R_proximo, terminou, truncou, _ = env.step(a)
            trajeto.append(x)
            acoes.append(a)
            G0 += R_proximo  # R_{t+1}, com gamma = 1 até o fim observado.
            if terminou or truncou:
                break
        episodios.append(Episodio(trajeto, acoes, G0))
    return episodios


def selecionar(episodios, rho, estrito=False, gamma=1.0):
    escores = [ep.G0 * gamma ** len(ep.acoes) for ep in episodios]
    corte = np.quantile(escores, 1 - rho, method="linear")
    # Na regra inclusiva, episódios empatados no limiar também entram na elite.
    elite = [
        ep
        for ep, valor in zip(episodios, escores)
        if valor > corte or (not estrito and valor == corte)
    ]
    return corte, elite


def ajustar(theta, elite, alpha, passos=8):
    theta = theta.copy()
    X = np.concatenate([ep.atributos for ep in elite])
    A = np.concatenate([ep.acoes for ep in elite])
    indices = np.arange(len(A))
    for _ in range(passos):
        pi = probabilidades(X @ theta)
        # Derivada de menos log pi(A_t | S_t) em relação aos logits.
        residuo = pi.copy()
        residuo[indices, A] -= 1
        theta -= alpha * (X.T @ residuo) / len(A)
    return theta


def executar(
    ambiente,
    rho,
    semente,
    iteracoes,
    lote,
    aprender=True,
    *,
    estrito=False,
    gelo=True,
    gamma=1.0,
    alpha=0.8,
    passos=8,
):
    opcoes = {"is_slippery": gelo} if ambiente == "FrozenLake-v1" else {}
    env = gym.make(ambiente, **opcoes)
    gerador = np.random.default_rng(semente)
    estados = np.eye(env.observation_space.n) if opcoes else None
    dimensao = (
        env.observation_space.n
        if estados is not None
        else env.observation_space.shape[0] + 1
    )
    theta = np.zeros((dimensao, env.action_space.n))
    try:
        for k in range(iteracoes):
            # Cada execução começa com a mesma política uniforme. O ambiente
            # recebe um fluxo de sementes distinto do sorteio das ações.
            semente_env = int(
                np.random.SeedSequence([semente, k, 1]).generate_state(1)[0]
            )
            episodios = coletar(
                env, ambiente, theta, gerador, lote, semente_env, estados
            )
            corte, elite = selecionar(episodios, rho, estrito, gamma)
            yield dict(
                ambiente=ambiente,
                metodo="CEM" if aprender else "Política uniforme",
                superficie=("gelo" if gelo else "firme") if opcoes else "trilho",
                regra="estrita" if estrito else "inclusiva",
                rho=rho,
                alpha=alpha,
                gamma=gamma,
                passos=passos,
                lote=lote,
                semente=semente,
                iteracao=k,
                retorno=np.mean([ep.G0 for ep in episodios]),
                fracao_elite=len(elite) / lote,
                limiar=corte,
            )
            if aprender and elite:
                theta = ajustar(theta, elite, alpha, passos)
    finally:
        env.close()


def inteiro_positivo(texto):
    valor = int(texto)
    if valor < 1:
        raise argparse.ArgumentTypeError("Informe um inteiro positivo.")
    return valor


def positivo(texto):
    n = float(texto)
    if not np.isfinite(n) or n <= 0:
        raise argparse.ArgumentTypeError("Informe uma taxa positiva e finita.")
    return n


def main():
    parser = argparse.ArgumentParser(
        description="Acompanhe os lotes de uma política CEM."
    )
    parser.add_argument("--ambiente", choices=AMBIENTES, default=AMBIENTES[0])
    parser.add_argument("--semente", type=int, default=17, help="inteiro não negativo")
    parser.add_argument(
        "--rho", type=float, default=0.3, help="fração nominal de elite"
    )
    parser.add_argument("--lote", type=inteiro_positivo, default=16)
    parser.add_argument("--iteracoes", type=inteiro_positivo, default=30)
    parser.add_argument(
        "--estrito", action="store_true", help="exigir retorno acima do limiar"
    )
    parser.add_argument(
        "--sem-gelo",
        action="store_true",
        help="usar transições determinísticas no lago",
    )
    parser.add_argument("--alpha", type=positivo, default=0.8)
    parser.add_argument("--passos-gradiente", type=inteiro_positivo, default=8)
    parser.add_argument(
        "--gamma",
        type=positivo,
        default=1.0,
        help="desconto do escore terminal do lago",
    )
    args = parser.parse_args()
    if args.gamma > 1 or (args.ambiente != "FrozenLake-v1" and args.gamma != 1):
        parser.error("Use gamma entre zero (exclusivo) e um; no CartPole, use 1.")
    if not 0 < args.rho <= 1 or args.semente < 0:
        parser.error("Use 0 < rho ≤ 1 e uma semente não negativa.")
    for linha in executar(
        args.ambiente,
        args.rho,
        args.semente,
        args.iteracoes,
        args.lote,
        estrito=args.estrito,
        gelo=not args.sem_gelo,
        alpha=args.alpha,
        passos=args.passos_gradiente,
        gamma=args.gamma,
    ):
        print(
            f"Lote {linha['iteracao']:2d} | retorno {linha['retorno']:7.2f} | "
            f"limiar {linha['limiar']:.2f} | elite {linha['fracao_elite']:.1%}"
        )


if __name__ == "__main__":
    main()
