// Toda a configuração vem de variáveis de ambiente (ver docker-compose.yml).
const path = require("path");
const env = process.env;

// Abrangências consultadas além do total nacional ("br"). Ajustar para outras eleições.
const ABRANGENCIAS = {
  ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará",
  df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão",
  mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará",
  pb: "Paraíba", pr: "Paraná", pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro",
  rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima",
  sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins", zz: "Exterior",
};

module.exports = {
  port: Number(env.PORT) || 3000,
  host: env.HOST || "0.0.0.0",
  tseBase: env.TSE_BASE || "https://resultados.tse.jus.br/oficial",
  ano: env.ANO || "2026",
  eleicao: env.ELEICAO || "6258",
  cargo: env.CARGO || "1",
  populacao: Number(env.POPULACAO) || 214211951,
  pollSegundos: Number(env.POLL_SEGUNDOS) || 30,
  dbPath: env.DB_PATH || path.join(__dirname, "..", "data", "voto-a-voto.db"),
  abrangencias: ABRANGENCIAS,
};
