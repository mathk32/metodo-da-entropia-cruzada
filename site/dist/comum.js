"use strict";

const elemento = (id) => document.getElementById(id);
const numero = (valor, casas = 2) => valor.toLocaleString("pt-BR", {
  maximumFractionDigits: casas
});
const percentual = (valor) => valor.toLocaleString("pt-BR", {
  style: "percent", maximumFractionDigits: 1
});

function linhaTabela(campos, classe = "") {
  const linha = document.createElement("tr");
  linha.className = classe;
  for (const campo of campos) {
    const celula = document.createElement("td");
    celula.textContent = campo;
    linha.append(celula);
  }
  return linha;
}

// As coordenadas do desenho permanecem em pixels CSS em telas de alta densidade.
function prepararGrafico(canvas, maximo, rotuloY) {
  const largura = canvas.clientWidth;
  const altura = canvas.clientHeight;
  const escala = window.devicePixelRatio || 1;
  canvas.width = Math.round(largura * escala);
  canvas.height = Math.round(altura * escala);
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);
  const margem = { esquerda: 49, direita: 12, topo: 27, base: 48 };
  const x0 = margem.esquerda;
  const x1 = largura - margem.direita;
  const y0 = altura - margem.base;
  const y1 = margem.topo;
  const y = (valor) => y0 - valor / maximo * (y0 - y1);
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#506468";
  ctx.textAlign = "left";
  ctx.fillText(rotuloY, 1, 12);
  for (let i = 0; i <= 4; i++) {
    const valor = i / 4 * maximo;
    ctx.strokeStyle = "#dce3db";
    ctx.beginPath();
    ctx.moveTo(x0, y(valor));
    ctx.lineTo(x1, y(valor));
    ctx.stroke();
    ctx.fillStyle = "#506468";
    ctx.textAlign = "right";
    ctx.fillText(numero(valor, 3), x0 - 7, y(valor) + 4);
  }
  return { ctx, x0, x1, y0, y, largura, altura };
}

function rotularEixoX(ctx, x, y, texto) {
  ctx.fillStyle = "#506468";
  ctx.textAlign = "center";
  ctx.fillText(texto, x, y);
}

