const campo = document.getElementById("busca");
const termos = Array.from(document.querySelectorAll(".gloss div"));
const normalizar = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
campo.oninput = () => {
  const chave = normalizar(campo.value.trim());
  for (const t of termos) t.hidden = !normalizar(t.textContent).includes(chave);
  const n = termos.filter((t) => !t.hidden).length;
  document.getElementById("contagem").textContent =
    n === 0 ? "Nenhum termo encontrado." : n + " de " + termos.length + " verbetes.";
};
campo.oninput();
