const cfg = require("./config");

const pad = (n, l) => String(n).padStart(l, "0");
const num = (v) => Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) || 0;

const urlTse = (uf) =>
  `${cfg.tseBase}/ele${cfg.ano}/${cfg.eleicao}/dados/${uf}/${uf}-c${pad(cfg.cargo, 4)}-e${pad(cfg.eleicao, 6)}-u.json`;

// Só candidatos têm "vap"; os vices (vs) não.
function coletar(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => coletar(x, out));
  else if (o && typeof o === "object") {
    if ("vap" in o && "nm" in o) out.push(o);
    else for (const k in o) coletar(o[k], out);
  }
  return out;
}

async function buscar(uf) {
  const r = await fetch(urlTse(uf), {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${urlTse(uf)}`);
  const texto = await r.text();
  const j = JSON.parse(texto);
  return { j, texto, idg: j.idg };
}

function interpretar(j) {
  const cands = coletar(j)
    .map((c) => ({ nome: c.nmu || c.nm, numero: c.n, votos: num(c.vap) }))
    .sort((a, b) => b.votos - a.votos);
  const total = cands.reduce((s, c) => s + c.votos, 0);
  cands.forEach((c) => (c.pct = total ? (c.votos / total) * 100 : 0));
  return {
    cands,
    total,
    cargo: j.carg?.[0]?.nmn,
    secoes: j.s?.pst,
    atualizado: `${j.dg} ${j.hg}`,
    outros: {
      brancos: num(j.v?.vb),
      nulos: num(j.v?.tvn),
      abstencoes: num(j.e?.a),
      comparecimento: num(j.e?.c),
      eleitorado: num(j.e?.te),
    },
  };
}

module.exports = { buscar, interpretar, num };
