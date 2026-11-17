import { mapa } from "./simulacao.mjs";
function linha(ctx, x, y, u, v, cor, largura) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(u, v);
  ctx.stroke();
}
function disco(ctx, x, y, r, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}
function texto(ctx, txt, x, y, cor = "#254e44", tam = 20) {
  ctx.fillStyle = cor;
  ctx.font = tam + "px Segoe UI, sans-serif";
  ctx.fillText(txt, x, y);
}
export function desenhar(canvas, lago, estado, ep, t) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e4eee5";
  ctx.fillRect(0, 0, 800, 410);
  if (lago) {
    const centro = (s) => [245 + (s % 4) * 78, 66 + Math.floor(s / 4) * 78];
    for (let i = 0; i < 16; i++) {
      const [x, y] = centro(i),
        tipo = mapa[i];
      ctx.fillStyle =
        tipo === "H" ? "#c4d6d2" : ((i % 2) + Math.floor(i / 4)) % 2 ? "#d0e4de" : "#d9eae2";
      ctx.fillRect(x - 38, y - 38, 76, 76);
      if (tipo === "H") disco(ctx, x, y, 23, "#345766");
      if (tipo === "G") {
        linha(ctx, x - 8, y + 18, x - 8, y - 21, "#203e35", 4);
        ctx.fillStyle = "#ae5526";
        ctx.fillRect(x - 6, y - 20, 24, 14);
      }
      if (tipo === "S") texto(ctx, "S", x - 29, y - 12);
    }
    for (let i = 0; i < t; i++) {
      const passo = ep.passos[i],
        [x, y] = centro(passo.s),
        [u, v] = centro(passo.prox);
      linha(ctx, x, y, u, v, "#518173", 4);
    }
    const [x, y] = centro(estado);
    disco(ctx, x, y, 15, "#163f37");
    disco(ctx, x, y, 7, "#f8a967");
    texto(ctx, "Trajeto percorrido", 40, 385);
    texto(ctx, "●  Buraco     ⚑  Objetivo", 495, 385);
  } else {
    for (let x = 40; x < 800; x += 72) linha(ctx, x, 45, x, 302, "#d2dfd2", 1);
    const esc = 135,
      base = 280,
      cx = 400 + estado[0] * esc;
    linha(ctx, 32, 312, 768, 312, "#507264", 4);
    for (const s of [-2.4, 0, 2.4]) {
      const x = 400 + s * esc;
      linha(ctx, x, 313, x, 323, "#34594f", 2);
      texto(ctx, String(s).replace(".", ",") + " m", x - 18, 355);
    }
    const ang = estado[2],
      u = cx + 153 * Math.sin(ang),
      v = base - 153 * Math.cos(ang);
    linha(ctx, cx, base, cx, base - 157, "#a4b7a6", 2);
    linha(ctx, cx, base, u, v, "#aa592d", 10);
    disco(ctx, u, v, 7, "#844425");
    ctx.fillStyle = "#235547";
    ctx.fillRect(cx - 32, base, 64, 15);
    for (const d of [-20, 20]) disco(ctx, cx + d, 303, 8, "#192e29");
    disco(ctx, cx, base, 6, "#f4be89");
    texto(ctx, "Posição e inclinação", 38, 52);
  }
}
