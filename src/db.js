const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const cfg = require("./config");
const { interpretar, num } = require("./tse");

fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });
const db = new DatabaseSync(cfg.dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coletado_em TEXT NOT NULL,
    eleicao TEXT NOT NULL,
    cargo TEXT NOT NULL,
    uf TEXT NOT NULL,
    idg TEXT,
    atualizado TEXT,
    secoes_pct REAL,
    brancos INTEGER, nulos INTEGER, abstencoes INTEGER, comparecimento INTEGER, eleitorado INTEGER,
    votos_validos INTEGER,
    raw TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_snap ON snapshots (eleicao, cargo, uf, id);
  CREATE TABLE IF NOT EXISTS candidatos (
    snapshot_id INTEGER NOT NULL REFERENCES snapshots(id),
    nome TEXT NOT NULL,
    numero TEXT,
    votos INTEGER NOT NULL,
    pct REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_cand ON candidatos (snapshot_id);
`);

const qUltimo = db.prepare(
  "SELECT id, idg FROM snapshots WHERE eleicao=? AND cargo=? AND uf=? ORDER BY id DESC LIMIT 1"
);
const qRaw = db.prepare("SELECT raw, coletado_em FROM snapshots WHERE id=?");
const insSnap = db.prepare(`INSERT INTO snapshots
  (coletado_em, eleicao, cargo, uf, idg, atualizado, secoes_pct, brancos, nulos, abstencoes, comparecimento, eleitorado, votos_validos, raw)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insCand = db.prepare("INSERT INTO candidatos (snapshot_id, nome, numero, votos, pct) VALUES (?,?,?,?,?)");

// Grava apenas quando o TSE publicou uma versão nova (idg diferente).
function salvar(uf, { j, texto, idg }) {
  const ultimo = qUltimo.get(cfg.eleicao, cfg.cargo, uf);
  if (ultimo && ultimo.idg === idg) return;
  const d = interpretar(j);
  db.exec("BEGIN");
  try {
    const { lastInsertRowid: id } = insSnap.run(
      new Date().toISOString(), cfg.eleicao, cfg.cargo, uf, idg ?? null, d.atualizado, num(d.secoes),
      d.outros.brancos, d.outros.nulos, d.outros.abstencoes, d.outros.comparecimento,
      d.outros.eleitorado, d.total, texto
    );
    d.cands.forEach((c) => insCand.run(id, c.nome, c.numero ?? null, c.votos, c.pct));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function carregar(uf) {
  const u = qUltimo.get(cfg.eleicao, cfg.cargo, uf);
  if (!u) return null;
  const { raw, coletado_em } = qRaw.get(u.id);
  return { ...interpretar(JSON.parse(raw)), coletado_em };
}

// Estado completo da página, montado a partir do último snapshot salvo de cada UF.
function montarEstado() {
  const br = carregar("br");
  if (!br) return null;
  const estados = Object.entries(cfg.abrangencias)
    .map(([uf, nome]) => ({ uf: uf.toUpperCase(), nome, ...carregar(uf) }))
    .filter((e) => e.cands);
  return {
    meta: { cargo: br.cargo, secoes: br.secoes, atualizado: br.atualizado, total: br.total, ...br.outros },
    cands: br.cands,
    estados,
    coletado_em: br.coletado_em,
  };
}

const fechar = () => db.close();

module.exports = { salvar, montarEstado, fechar };
