// Dinâmica do CartPole e transições do FrozenLake conforme Gymnasium 1.1.1.
export const mapa = ["SFFF", "FHFH", "FFFH", "HFFG"].join("");
export const direcoes = ["esquerda", "baixo", "direita", "cima"];
const deslocamento = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export function aleatorio(semente) {
  let x = semente >>> 0;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
export function softmax(z) {
  const max = Math.max(...z);
  const pesos = z.map((v) => Math.exp(v - max));
  const total = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((v) => v / total);
}
function sortear(prob, rng) {
  let u = rng();
  for (let i = 0; i < prob.length - 1; i++) {
    u -= prob[i];
    if (u < 0) return i;
  }
  return prob.length - 1;
}
function moverCarrinho([x, v, ang, w], acao) {
  const cos = Math.cos(ang),
    sen = Math.sin(ang);
  const forca = acao === 1 ? 10 : -10;
  const temp = (forca + 0.05 * w * w * sen) / 1.1;
  const acelAng = (9.8 * sen - cos * temp) / (0.5 * (4 / 3 - (0.1 * cos * cos) / 1.1));
  const acel = temp - (0.05 * acelAng * cos) / 1.1;
  return [x + 0.02 * v, v + 0.02 * acel, ang + 0.02 * w, w + 0.02 * acelAng];
}
function atributos(lago, s) {
  if (lago) return Array.from({ length: 16 }, (_, i) => Number(i === s));
  return [s[0] / 2.4, s[1], s[2] / 0.21, s[3], 1];
}
export function pesosIniciais(lago) {
  return Array.from({ length: lago ? 16 : 5 }, () => Array(lago ? 4 : 2).fill(0));
}
function prever(x, pesos) {
  return softmax(pesos[0].map((_, j) => x.reduce((v, xi, i) => v + xi * pesos[i][j], 0)));
}
export function episodio(config, pesos, rng) {
  const { lago, gelo, horizonte } = config;
  let s = lago ? 0 : Array.from({ length: 4 }, () => (rng() - 0.5) * 0.1);
  const passos = [];
  let motivo = "limite de passos",
    retorno = 0;
  for (let t = 0; t < horizonte; t++) {
    const x = atributos(lago, s),
      pi = prever(x, pesos),
      a = sortear(pi, rng);
    let prox,
      efetiva = a,
      recompensa = 1,
      terminou;
    if (lago) {
      if (gelo) efetiva = (a + Math.floor(rng() * 3) + 3) % 4;
      const [dr, dc] = deslocamento[efetiva];
      const limitar = (n) => Math.max(0, Math.min(3, n));
      prox = 4 * limitar(Math.floor(s / 4) + dr) + limitar((s % 4) + dc);
      recompensa = Number(mapa[prox] === "G");
      terminou = recompensa === 1 || mapa[prox] === "H";
      if (terminou) motivo = recompensa ? "objetivo" : "buraco";
    } else {
      prox = moverCarrinho(s, a);
      terminou = Math.abs(prox[0]) > 2.4 || Math.abs(prox[2]) > Math.PI / 15;
      if (terminou) motivo = Math.abs(prox[0]) > 2.4 ? "saída da pista" : "queda da haste";
    }
    passos.push({ s, prox, x, a, efetiva, recompensa, pi });
    retorno += recompensa;
    s = prox;
    if (terminou) break;
  }
  return { passos, retorno, motivo };
}
export function selecionar(lote, percentil, gamma, estrito) {
  const escores = lote.map((ep) => ep.retorno * gamma ** ep.passos.length);
  const ordem = [...escores].sort((a, b) => a - b);
  const h = (percentil / 100) * (ordem.length - 1),
    k = Math.floor(h);
  const corte = ordem[k] + (h - k) * (ordem[Math.ceil(h)] - ordem[k]);
  const elite = lote.filter((_, i) => (estrito ? escores[i] > corte : escores[i] >= corte));
  return { elite, escores, corte };
}
export function ajustar(pesos, elite, alfa = 0.8) {
  const dados = elite.flatMap((ep) => ep.passos);
  if (!dados.length) return;
  for (let k = 0; k < 8; k++) {
    const grad = pesos.map((linha) => linha.map(() => 0));
    for (const { x, a } of dados) {
      const pi = prever(x, pesos);
      for (let i = 0; i < x.length; i++) {
        if (x[i] === 0) continue;
        for (let j = 0; j < pi.length; j++) grad[i][j] += x[i] * (pi[j] - Number(a === j));
      }
    }
    for (let i = 0; i < pesos.length; i++)
      for (let j = 0; j < pesos[i].length; j++) pesos[i][j] -= (alfa * grad[i][j]) / dados.length;
  }
}
