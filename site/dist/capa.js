const c = document.getElementById("capa").getContext("2d");
c.fillStyle = "#163e36";
c.fillRect(0, 0, 760, 490);
c.strokeStyle = "#2a5047";
c.lineWidth = 1;
for (let x = 0; x < 760; x += 38) {
  c.beginPath();
  c.moveTo(x, 0);
  c.lineTo(x, 490);
  c.stroke();
}
for (let y = 0; y < 490; y += 38) {
  c.beginPath();
  c.moveTo(0, y);
  c.lineTo(760, y);
  c.stroke();
}
function linha(x, y, u, v, cor, w) {
  c.strokeStyle = cor;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(u, v);
  c.stroke();
}
linha(66, 364, 688, 364, "#aec7b4", 3);
for (let i = 0; i < 6; i++) {
  const x = 252 + 24 * i,
    ang = -0.55 + 0.13 * i;
  linha(
    x,
    306,
    x + 220 * Math.sin(ang),
    306 - 220 * Math.cos(ang),
    i === 5 ? "#ffac69" : "#638d79",
    i === 5 ? 12 : 3,
  );
}
c.fillStyle = "#e5eadd";
c.fillRect(308, 307, 128, 31);
for (const x of [334, 410]) {
  c.fillStyle = "#9ebca3";
  c.beginPath();
  c.arc(x, 349, 13, 0, 2 * Math.PI);
  c.fill();
}
c.fillStyle = "#d6e5d8";
c.font = "19px Georgia";
c.fillText("Posições sucessivas da haste", 37, 445);
