import { aleatorio, pesosIniciais, episodio, selecionar, ajustar, direcoes } from "./simulacao.mjs";
import { desenhar } from "./desenho.mjs";

const el = (id) => document.getElementById(id);
const lago = el("laboratorio").dataset.ambiente === "frozenlake";
const fmt = (x, n = 3) => x.toLocaleString("pt-BR", { maximumFractionDigits: n });
let pesos, lote, rng, selecao, iteracao, instante, timer, situacao;
const gamma = () => (lago ? Number(el("desconto").value) : 1);
const estrito = () => lago && el("regra").value === "estrito";
const atual = () => lote[Number(el("episodio").value)];

const campos = Object.fromEntries(
  Array.from(document.querySelectorAll("[data-valor]"), node => [node.dataset.valor, node]),
);
const numeros = Object.fromEntries(
  Array.from(document.querySelectorAll("[data-numero]"), node => [node.dataset.numero, node]),
);

function exibir(valores) {
  for (const [campo, valor] of Object.entries(valores)) campos[campo].textContent = valor;
}

function pausar() {
  clearInterval(timer);
  timer = null;
  el("reproduzir").textContent = "Reproduzir";
}
function quadro() {
  const ep = atual(),
    t = instante,
    ultimo = Math.max(0, t - 1);
  const passo = ep.passos[ultimo],
    s = t ? passo.prox : passo.s;
  desenhar(el("tela"), lago, s, ep, t);
  el("tempo").max = ep.passos.length;
  el("tempo").value = t;
  el("instante").textContent = t + " / " + ep.passos.length;
  const orient = lago ? direcoes : ["esquerda", "direita"];
  if (lago) {
    exibir({casa:s, linha:1+Math.floor(s/4), coluna:1+s%4,
            efetiva:t ? orient[passo.efetiva] : "—"});
  } else {
    exibir({posicao:fmt(s[0])+" m", velocidade:fmt(s[1])+" m/s",
            angulo:fmt(s[2]*180/Math.PI,2)+"°", angular:fmt(s[3])+" rad/s"});
  }
  const fim = t === ep.passos.length;
  exibir({
    acao:t ? orient[passo.a] : "—",
    prob:t ? fmt(100*passo.pi[passo.a],1)+"%" : "—",
    recompensa:t ? passo.recompensa : "—",
    retorno:lago ? (fim ? ep.retorno : 0) : t,
    situacao:fim ? ep.motivo : (t ? "Em andamento" : "Antes da primeira ação"),
  });
}
function filtro() {
  const q = Number(el("percentil").value),
    g = gamma();
  selecao = selecionar(lote, q, g, estrito());
  const { corte, elite, escores } = selecao,
    grupo = new Set(elite);
  el("q").textContent = q + " (ρ = " + (100 - q) + "%)";
  if (lago) el("gama").textContent = fmt(g);
  el("limiar").textContent = fmt(corte, 5);
  el("elite").textContent = elite.length + " / " + lote.length;
  el("media").textContent = fmt(lote.reduce((a, e) => a + e.retorno, 0) / lote.length);
  el("linhas").replaceChildren(
    ...lote.map((ep, i) => {
      const tr = document.createElement("tr");
      for (const v of [
        i + 1,
        ep.passos.length,
        ep.retorno,
        fmt(escores[i], 5),
        grupo.has(ep) ? "Sim" : "Não",
      ]) {
        const td = document.createElement("td");
        td.textContent = v;
        tr.append(td);
      }
      return tr;
    }),
  );
  const i = Number(el("episodio").value);
  const ep = lote[i];
  numeros.duracao.textContent = ep.passos.length;
  if (lago) {
    numeros.recompensa.textContent = ep.retorno;
    numeros.gamma.textContent = fmt(g);
    numeros.escore.textContent = fmt(escores[i],5);
  }
  exibir({
    ep:i+1, limiar:fmt(corte,5), pospercentil:fmt((q/100)*(lote.length-1)),
    criterio:estrito() ? "Acima do limiar" : "Igual ou acima do limiar",
    decisao:grupo.has(ep) ? "Entra na elite" : "Fica fora da elite",
  });
}
function coletar() {
  pausar();
  const config = {
    lago,
    gelo: lago && el("gelo").value === "sim",
    horizonte: lago ? 100 : Number(el("horizonte").value),
  };
  lote = Array.from({ length: Number(el("lote").value) }, () => episodio(config, pesos, rng));
  const lista = el("episodio");
  lista.replaceChildren(
    ...lote.map(
      (ep, i) => new Option(i + 1 + " · " + ep.passos.length + " passos · " + ep.motivo, i),
    ),
  );
  const melhor = lote.reduce((k, e, i) => (e.retorno > lote[k].retorno ? i : k), 0);
  lista.value = String(melhor);
  instante = 0;
  filtro();
  quadro();
  el("rodada").textContent = "Lote " + iteracao + ". " + situacao;
}
function reiniciar() {
  if (!el("semente").reportValidity() || el("semente").value === "") return;
  rng = aleatorio(Number(el("semente").value));
  pesos = pesosIniciais(lago);
  iteracao = 0;
  situacao = "Política uniforme.";
  coletar();
}
el("treinar").onclick = () => {
  ajustar(pesos, selecao.elite);
  iteracao++;
  situacao = selecao.elite.length
    ? "Política ajustada pela elite do lote anterior."
    : "Elite anterior vazia. Novo lote coletado com os mesmos pesos.";
  coletar();
};
el("reiniciar").onclick = reiniciar;
for (const id of ["lote", "semente", lago ? "gelo" : "horizonte"]) el(id).onchange = reiniciar;
for (const id of lago ? ["percentil", "desconto", "regra"] : ["percentil"]) el(id).oninput = filtro;
el("episodio").onchange = () => {
  pausar();
  instante = 0;
  filtro();
  quadro();
};
el("tempo").oninput = () => {
  pausar();
  instante = Number(el("tempo").value);
  quadro();
};
el("voltar").onclick = () => {
  pausar();
  instante = 0;
  quadro();
};
function avancar() {
  instante = Math.min(instante + 1, atual().passos.length);
  quadro();
  if (instante === atual().passos.length) pausar();
}
el("passo").onclick = () => {
  pausar();
  avancar();
};
el("reproduzir").onclick = () => {
  if (timer) {
    pausar();
    return;
  }
  if (instante === atual().passos.length) instante = 0;
  el("reproduzir").textContent = "Pausar";
  timer = setInterval(avancar, lago ? 280 : 55);
  quadro();
};
reiniciar();
