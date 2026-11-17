const p = document.getElementById("chance");
function calcular() {
  const prob = Number(p.value) / 100;
  const v = prob ** 2 * (1 - prob),
    perda = -Math.log(v) / 3;
  const forma = (x) => x.toLocaleString("pt-BR", { maximumFractionDigits: 5 });
  document.getElementById("probabilidade").textContent = forma(prob);
  const valores = {p:prob, complemento:1-prob, verossimilhanca:v, perda};
  for (const node of document.querySelectorAll("#verossimilhanca [data-numero]")) {
    node.textContent = forma(valores[node.dataset.numero]);
  }
}
p.oninput = calcular;
calcular();
