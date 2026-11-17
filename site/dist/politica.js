"use strict";

let logits = [0, 0];
let passos = 0;
let variacao = 0;

function softmax(valores) {
  const maximo = Math.max(...valores);
  const pesos = valores.map((z) => Math.exp(z - maximo));
  const soma = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => p / soma);
}

function frequencias() {
  const direita = Number(elemento("direitas").value) / 10;
  return [1 - direita, direita];
}

function mostrarPolitica() {
  const f = frequencias();
  const p = softmax(logits);
  const alpha = Number(elemento("alpha").value);
  const perda = -f.reduce((total, freq, a) => total + freq * Math.log(p[a]), 0);
  elemento("direitas-valor").textContent = elemento("direitas").value + " / 10";
  elemento("alpha-valor").textContent = numero(alpha);
  elemento("prob").textContent = percentual(p[1]);
  elemento("freq").textContent = percentual(f[1]);
  elemento("barra-p").style.width = p[1] * 100 + "%";
  elemento("barra-f").style.width = f[1] * 100 + "%";
  elemento("perda").textContent = numero(perda, 4);
  elemento("mudanca").textContent = (variacao > 0 ? "+" : "") + numero(variacao * 100, 2) + " p.p.";
  elemento("passos").textContent = passos;
  document.querySelector('[data-numero="z0"]').textContent = numero(logits[0],4);
  document.querySelector('[data-numero="z1"]').textContent = numero(logits[1],4);
}

elemento("passo").addEventListener("click", () => {
  const antes = softmax(logits);
  const f = frequencias();
  const alpha = Number(elemento("alpha").value);
  logits = logits.map((z, a) => z - alpha * (antes[a] - f[a]));
  variacao = softmax(logits)[1] - antes[1];
  passos += 1;
  mostrarPolitica();
});
elemento("reiniciar").addEventListener("click", () => {
  logits = [0, 0];
  variacao = 0;
  passos = 0;
  mostrarPolitica();
});
elemento("direitas").addEventListener("input", mostrarPolitica);
elemento("alpha").addEventListener("input", mostrarPolitica);
mostrarPolitica();

