"use strict";

let dados = [];

function lerCSV(texto) {
  const linhas = texto
    .trim()
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const campos = linhas.shift().split(",");
  const obrigatorios = [
    "ambiente",
    "metodo",
    "rho",
    "semente",
    "iteracao",
    "retorno",
    "fracao_elite",
  ];
  if (!obrigatorios.every((campo) => campos.includes(campo))) throw Error("Cabeçalho incompatível");
  return linhas.filter(Boolean).map((linha) => {
    const valores = linha.split(",");
    const registro = Object.fromEntries(campos.map((campo, i) => [campo, valores[i]]));
    for (const campo of ["rho", "alpha", "gamma", "semente", "iteracao", "retorno"]) {
      registro[campo] = Number(registro[campo]);
      if (!Number.isFinite(registro[campo])) throw Error("Valor inválido");
    }
    registro.fracao_elite = Number(registro.fracao_elite);
    return registro;
  });
}

function resumir(linhas) {
  const valores = linhas.map((l) => l.retorno);
  const media = (vs) => vs.reduce((a, b) => a + b, 0) / vs.length;
  return {
    media: media(valores),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    elite: media(linhas.map((l) => l.fracao_elite)),
  };
}

function porIteracao(linhas) {
  const grupos = new Map();
  for (const linha of linhas) {
    if (!grupos.has(linha.iteracao)) grupos.set(linha.iteracao, []);
    grupos.get(linha.iteracao).push(linha);
  }
  return [...grupos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, lote]) => ({ i, ...resumir(lote) }));
}

function desenharCurvas(cem, base) {
  const pontos = [...cem, ...base];
  const minimoX = Math.min(...pontos.map((p) => p.i));
  const maximoX = Math.max(...pontos.map((p) => p.i));
  const maiorRetorno = Math.max(...pontos.map((p) => p.maximo));
  // Na escala binária, uma política rara fica legível sem perder a unidade.
  const passoY = maiorRetorno <= 1 ? 0.05 : 10;
  const maximoY = Math.max(passoY, Math.ceil(maiorRetorno / passoY) * passoY);
  const { ctx, x0, x1, y0, y, altura } = prepararGrafico(
    elemento("grafico"),
    maximoY,
    "Retorno médio G₀",
  );
  const x = (i) =>
    maximoX === minimoX ? (x0 + x1) / 2 : x0 + ((i - minimoX) * (x1 - x0)) / (maximoX - minimoX);
  function faixa(serie, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    serie.forEach((p, i) => {
      if (i === 0) ctx.moveTo(x(p.i), y(p.maximo));
      else ctx.lineTo(x(p.i), y(p.maximo));
    });
    for (const p of [...serie].reverse()) ctx.lineTo(x(p.i), y(p.minimo));
    ctx.closePath();
    ctx.fill();
  }
  function curva(serie, cor, tracos) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2.4;
    ctx.setLineDash(tracos);
    ctx.beginPath();
    serie.forEach((p, i) => {
      if (i === 0) ctx.moveTo(x(p.i), y(p.media));
      else ctx.lineTo(x(p.i), y(p.media));
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const ultimo = serie.at(-1);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x(ultimo.i), y(ultimo.media), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  faixa(base, "rgba(154,76,35,.12)");
  faixa(cem, "rgba(11,97,88,.15)");
  curva(base, "#9a4c23", [5, 3]);
  curva(cem, "#0b6158", []);
  const rotulos = new Set();
  for (let j = 0; j <= 4; j++) rotulos.add(Math.round(minimoX + ((maximoX - minimoX) * j) / 4));
  for (const i of rotulos) rotularEixoX(ctx, x(i), y0 + 18, i);
  rotularEixoX(ctx, (x0 + x1) / 2, altura - 4, "Lote");
}

function mostrarExperimento() {
  if (!dados.length) return;
  const ambiente = elemento("ambiente").value;
  const lago = ambiente === "FrozenLake-v1";
  elemento("controles-lago").hidden = !lago;
  const superficie = lago ? elemento("superficie").value : "trilho";
  const regra = lago ? elemento("regra").value : "inclusiva";
  const confronto = lago && (superficie === "firme" || regra === "estrita");
  const fracao = elemento("fracao");
  fracao.disabled = confronto;
  if (confronto) fracao.value = "0.3";
  const rho = Number(fracao.value);
  const alpha = elemento("alpha");
  elemento("controle-alpha").hidden = lago;
  alpha.disabled = lago || rho > 0.3;
  if (alpha.disabled) alpha.value = "0.8";
  const gamma = elemento("gamma");
  gamma.disabled = regra !== "estrita";
  if (gamma.disabled) gamma.value = "1";
  const linhas = dados.filter((r) => r.ambiente === ambiente && r.superficie === superficie);
  const treino = linhas.filter((r) => r.metodo === "CEM" && r.rho === rho && r.regra === regra
    && r.alpha === Number(alpha.value) && r.gamma === Number(gamma.value));
  const cem = porIteracao(treino);
  const base = porIteracao(linhas.filter((r) => r.metodo === "Política uniforme"));
  if (!cem.length || !base.length) throw Error("Configuração ausente");
  const ultima = cem.at(-1);
  const referencia = base.at(-1);
  const sementes = new Set(treino.map((r) => r.semente)).size;
  elemento("status").textContent =
    sementes + " sementes · " + cem.length + " lotes · média antes do ajuste.";
  elemento("ultimo-cem").textContent = numero(ultima.media, 3);
  elemento("ultimo-aleat").textContent = numero(referencia.media, 3);
  elemento("elite").textContent = percentual(ultima.elite);
  elemento("leitura").textContent =
    ambiente === "CartPole-v1"
      ? "Em CartPole, cada passo rende um ponto. Assim, uma diferença de dez unidades no eixo vertical corresponde a dez passos a mais, em média, por episódio. Alterne ρ para comparar a intensidade da seleção e o resultado observado."
      : (superficie === "gelo" && regra === "inclusiva"
        ? "No gelo, o corte inclusivo aceitou todos os episódios em todos os lotes. As quatro curvas de fração nominal coincidem. Troque o corte para comparar a aprendizagem a 30% de elite."
        : "Cada chegada à meta vale um. Nos cinco lotes finais, a regra estrita obteve 15 sucessos em 400 no gelo para os dois descontos. No piso firme, foram 210 para γ=1 e 352 para γ=0,9. A tabela mostra quantos episódios o filtro reteve em cada lote, em média entre sementes.");
  const formatar = (r) =>
    numero(r.media, 3) + " [" + numero(r.minimo, 3) + "–" + numero(r.maximo, 3) + "]";
  const basePorIteracao = new Map(base.map((r) => [r.i, r]));
  elemento("valores").replaceChildren(
    ...cem.map((r) => {
      const uniforme = basePorIteracao.get(r.i);
      return linhaTabela([
        r.i,
        formatar(r),
        uniforme ? formatar(uniforme) : "—",
        percentual(r.elite),
      ]);
    }),
  );
  desenharCurvas(cem, base);
}

async function iniciar() {
  try {
    const resposta = await fetch("resultados.csv");
    if (!resposta.ok) throw Error("Dados indisponíveis");
    dados = lerCSV(await resposta.text());
    const ambiente = new URLSearchParams(location.search).get("ambiente");
    if (["CartPole-v1", "FrozenLake-v1"].includes(ambiente)) elemento("ambiente").value = ambiente;
    if (!dados.length) throw Error("Arquivo vazio");
    mostrarExperimento();
    elemento("ambiente").addEventListener("change", mostrarExperimento);
    for (const id of ["fracao", "superficie", "regra", "alpha", "gamma"]) elemento(id).addEventListener("change", mostrarExperimento);
    new ResizeObserver(mostrarExperimento).observe(elemento("grafico"));
  } catch (erro) {
    elemento("status").textContent =
      "Não foi possível ler os dados desta execução. Recarregue a página ou consulte o CSV.";
    elemento("grafico").hidden = true;
    elemento("ambiente").disabled = true;
    elemento("fracao").disabled = true;
  }
}
iniciar();
