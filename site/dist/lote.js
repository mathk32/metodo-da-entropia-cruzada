"use strict";

// Lotes fixos ilustram a regra de seleção sem confundir o exemplo com o CSV medido.
const lotes = {
  "CartPole-v1": [
    [12, 19, 15, 36, 22, 17, 41, 28, 16, 31, 24, 20],
    [14, 27, 11, 38, 18, 27, 42, 27, 13, 21, 27, 17],
    [22, 34, 15, 24, 48, 16, 19, 33, 20, 37, 26, 29]
  ],
  "FrozenLake-v1": [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0]
  ]
};
let indiceLote = 0;

function quantilLinear(valores, q) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = q * (ordenados.length - 1);
  const i = Math.floor(posicao);
  const resto = posicao - i;
  return ordenados[i] + resto * (ordenados[Math.ceil(posicao)] - ordenados[i]);
}

function desenharRetornos(retornos, corte) {
  const canvas = elemento("grafico");
  const maximo = Math.max(1, ...retornos);
  const { ctx, x0, x1, y0, y, altura } = prepararGrafico(canvas, maximo, "Retorno G₀");
  const passo = (x1 - x0) / retornos.length;
  const largura = Math.min(34, passo * .62);
  retornos.forEach((valor, i) => {
    const centro = x0 + (i + .5) * passo;
    ctx.fillStyle = valor >= corte ? "#0b6158" : "#a8b6b0";
    if (valor === 0) {
      ctx.beginPath();
      ctx.arc(centro, y0 - 3, Math.min(4, passo * .25), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(centro - largura / 2, y(valor), largura, y0 - y(valor));
    }
    rotularEixoX(ctx, centro, y0 + 18, i + 1);
  });
  ctx.strokeStyle = "#9a4c23";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y(corte));
  ctx.lineTo(x1, y(corte));
  ctx.stroke();
  rotularEixoX(ctx, (x0 + x1) / 2, altura - 4, "Episódio");
}

function mostrarLote() {
  const rho = Number(elemento("fracao").value) / 100;
  const retornos = lotes[elemento("ambiente").value][indiceLote];
  const corte = quantilLinear(retornos, 1 - rho);
  const quantidade = retornos.filter((valor) => valor >= corte).length;
  elemento("fracao-valor").textContent = percentual(rho) + " (percentil " + Math.round(100 * (1 - rho)) + ")";
  elemento("corte").textContent = numero(corte);
  elemento("tamanho").textContent = quantidade + " / " + retornos.length;
  elemento("real").textContent = percentual(quantidade / retornos.length);
  const leitura = quantidade === retornos.length
    ? "O limiar coincide com o menor retorno. Todos os episódios entram na atualização, inclusive os que terminaram sem recompensa. A seleção deixa de distinguir suas ações."
    : "Com o quantil em " + numero(1 - rho) + ", o limiar vale " + numero(corte) + ". O filtro conserva " + quantidade + " dos " + retornos.length + " episódios. O tamanho finito do lote e os empates podem afastar a fração efetiva da fração solicitada.";
  elemento("leitura").textContent = leitura;
  elemento("valores").replaceChildren(...retornos.map((v, i) =>
    linhaTabela([i + 1, v, v >= corte ? "Elite" : "Abaixo do corte"], v >= corte ? "elite" : "")
  ));
  desenharRetornos(retornos, corte);
}

elemento("ambiente").addEventListener("change", () => { indiceLote = 0; mostrarLote(); });
elemento("fracao").addEventListener("input", mostrarLote);
elemento("outro").addEventListener("click", () => {
  indiceLote = (indiceLote + 1) % lotes[elemento("ambiente").value].length;
  mostrarLote();
});
new ResizeObserver(mostrarLote).observe(elemento("grafico"));
mostrarLote();

