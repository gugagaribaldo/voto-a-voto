const paleta = ["#ff5c5c", "#4da3ff", "#4cd37b", "#f5c542", "#b57bff", "#ff9f43", "#aaa"];
const corDe = {};
const cor = nome => (corDe[nome] ??= paleta[Object.keys(corDe).length % paleta.length]);
const fmt = n => Number(n).toLocaleString("pt-BR");
const p2 = n => n.toFixed(2).replace(".", ",");
const pc = (n, base) => (base ? p2((n / base) * 100) + "%" : "-");
const $ = id => document.getElementById(id);
// Nomes vêm do TSE; escapar antes de usar em innerHTML.
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const q = (t, v, s, dest) =>
  `<div class="q ${dest ? "dest" : ""}"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

function render(d) {
  const cands = d.cands || [];
  if (!cands.length) return;
  cands.forEach(c => cor(c.nome));
  const lider = cands[0], m = d.meta, POP = d.config.populacao;

  const titulo = m.cargo ? `${m.cargo} - Apuração` : "Apuração";
  $("titulo").textContent = titulo;
  document.title = `Voto a Voto - ${titulo}`;
  $("meta").textContent =
    `Seções totalizadas: ${m.secoes}% • Atualizado: ${m.atualizado} • Votos válidos apurados: ${fmt(m.total)}` +
    (d.coletaEncerrada ? " • Apuração concluída (dados salvos)" : "");

  $("diff").textContent = cands.length > 1
    ? `Diferença: ${fmt(lider.votos - cands[1].votos)} votos (${lider.nome} na frente)` : "";
  $("bar").innerHTML = cands.map(c => `<div style="width:${c.pct}%;background:${cor(c.nome)}"></div>`).join("");
  $("cards").innerHTML = cands.map(c => `
    <div class="card" style="--c:${cor(c.nome)}">
      <div class="nome">${esc(c.nome)}</div>
      <div class="sub">${esc(c.numero)}</div>
      <div class="pct">${p2(c.pct)}%</div>
      <div class="votos">${fmt(c.votos)} votos</div></div>`).join("");

  $("outros").innerHTML =
    q("Votos em branco", fmt(m.brancos), `${pc(m.brancos, m.comparecimento)} dos comparecimentos`) +
    q("Votos nulos", fmt(m.nulos), `${pc(m.nulos, m.comparecimento)} dos comparecimentos`) +
    q("Abstenções", fmt(m.abstencoes), `${pc(m.abstencoes, m.eleitorado)} do eleitorado`) +
    q("Comparecimento", fmt(m.comparecimento), `${pc(m.comparecimento, m.eleitorado)} do eleitorado (${fmt(m.eleitorado)})`);

  if (cands.length > 1) {
    const dif = lider.votos - cands[1].votos, fora = m.abstencoes + m.brancos + m.nulos;
    $("termometro").innerHTML =
      q(`Diferença que decidiu a vitória (${esc(lider.nome)})`, pc(dif, POP), `${fmt(dif)} votos sobre a população de ${fmt(POP)}`, true) +
      q("Diferença sobre votos válidos", pc(dif, m.total), `${fmt(dif)} de ${fmt(m.total)} votos válidos`) +
      q("Diferença sobre o eleitorado", pc(dif, m.eleitorado), `${fmt(dif)} de ${fmt(m.eleitorado)} eleitores`) +
      q("Não escolheram nenhum dos dois", pc(fora, m.eleitorado), `${fmt(fora)} (abstenções + brancos + nulos)`);
  }

  const ufs = d.estados || [];
  const vitorias = {};
  ufs.filter(e => e.uf !== "ZZ").forEach(e => {
    if (e.total) vitorias[e.cands[0].nome] = (vitorias[e.cands[0].nome] || 0) + 1;
  });
  $("resumo").innerHTML = cands.map(c =>
    `<span style="color:${cor(c.nome)}"><b>${vitorias[c.nome] || 0}</b> estados à frente: ${esc(c.nome)}</span>`).join("");
  $("estados").innerHTML = ufs.map(e => {
    const [a, b] = e.cands;
    const dif = b ? a.votos - b.votos : a.votos;
    return `<div class="uf" style="--c:${cor(a.nome)}">
      <div class="uf-h"><span class="uf-nome">${esc(e.nome)} (${esc(e.uf)})</span><span class="uf-apur">${esc(e.secoes)}% apurado</span></div>
      ${e.cands.map(c => `<div class="linha"><span style="color:${cor(c.nome)}">${esc(c.nome)}</span><span><b>${p2(c.pct)}%</b> · ${fmt(c.votos)}</span></div>`).join("")}
      <div class="mini">${e.cands.map(c => `<div style="width:${c.pct}%;background:${cor(c.nome)}"></div>`).join("")}</div>
      <div class="uf-dif">Diferença: ${fmt(dif)} votos (${esc(a.nome)})</div></div>`;
  }).join("");
}

async function atualizar() {
  try {
    const d = await (await fetch("/api")).json();
    $("err").textContent = d.erro ? "Erro: " + d.erro : "";
    render(d);
  } catch (e) {
    $("err").textContent = "Sem conexão com o servidor: " + e.message;
  }
}
atualizar();
setInterval(atualizar, 30000);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
