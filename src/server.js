const http = require("http");
const fs = require("fs");
const path = require("path");
const cfg = require("./config");
const tse = require("./tse");
const store = require("./db");

const PUBLIC = path.join(__dirname, "..", "public");
const TODAS = ["br", ...Object.keys(cfg.abrangencias)];

let estado = store.montarEstado() || { erro: "carregando..." };
let concluido = false;
let atualizando = false;

async function atualizar() {
  if (concluido || atualizando) return;
  atualizando = true;
  try {
    const resultados = await Promise.allSettled(TODAS.map(tse.buscar));
    const falhas = [];
    resultados.forEach((r, i) => {
      if (r.status === "fulfilled") {
        try { store.salvar(TODAS[i], r.value); } catch (e) { falhas.push(`${TODAS[i]}: ${e.message}`); }
      } else falhas.push(r.reason.message);
    });
    const doBanco = store.montarEstado();
    if (doBanco) estado = doBanco;
    if (falhas.length === TODAS.length) {
      estado = { ...estado, erro: `TSE indisponível; exibindo dados salvos (coletados em ${estado.coletado_em ?? "?"}). ${falhas[0]}` };
      return;
    }
    delete estado.erro;
    if (falhas.length) estado.erro = `Falha parcial: ${falhas[0]}`;
    const completo = resultados.every(
      (r) => r.status === "fulfilled" && tse.num(tse.interpretar(r.value.j).secoes) >= 100
    );
    if (completo) {
      concluido = true;
      console.log("Apuração em 100% em todas as abrangências; dados finais salvos. Coleta encerrada.");
    }
  } finally {
    atualizando = false;
  }
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

function estatico(req, res) {
  const rota = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const arquivo = path.normalize(path.join(PUBLIC, rota === "/" ? "index.html" : rota));
  if (!arquivo.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(arquivo, (err, dados) => {
    if (err) {
      res.writeHead(404).end("Não encontrado");
      return;
    }
    const ext = path.extname(arquivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[ext] || "application/octet-stream",
      "Cache-Control": ext === ".png" ? "public, max-age=86400" : "no-cache",
    });
    res.end(dados);
  });
}

const servidor = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
  } else if (pathname === "/api") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({
      ...estado,
      coletaEncerrada: concluido,
      config: { populacao: cfg.populacao, pollSegundos: cfg.pollSegundos },
    }));
  } else if (req.method === "GET" || req.method === "HEAD") {
    estatico(req, res);
  } else {
    res.writeHead(405).end();
  }
});

servidor.listen(cfg.port, cfg.host, () => {
  console.log(`Voto a Voto em http://${cfg.host}:${cfg.port} (eleição ${cfg.eleicao}, cargo ${cfg.cargo}, banco ${cfg.dbPath})`);
  atualizar().then(() => estado.erro && console.log("Aviso:", estado.erro));
  setInterval(atualizar, cfg.pollSegundos * 1000);
});

function encerrar() {
  servidor.close(() => {
    store.fechar();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", encerrar);
process.on("SIGINT", encerrar);
