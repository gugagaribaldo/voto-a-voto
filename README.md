# Voto a Voto

Painel para acompanhar a apuração das eleições em tempo quase real, com dados públicos do TSE: percentual e votos de cada candidato lado a lado, diferença em número de votos, votos brancos, nulos e abstenções, resultado estado a estado e um "termômetro" que compara a diferença de votos com a população do país.

Todos os dados coletados são gravados em SQLite, então o painel continua funcionando mesmo que a API do TSE saia do ar.

## Recursos

- Candidatos lado a lado (% e votos) e diferença de votos entre eles.
- Brancos, nulos, abstenções e comparecimento.
- Diferença que decidiu a vitória como % da população, dos votos válidos e do eleitorado.
- Resultado por estado (27 UFs e exterior), com contagem de estados à frente de cada candidato.
- Atualização automática a cada 30 s, sem recarregar a página.
- Histórico completo em SQLite (JSON original + tabelas normalizadas).
- Coleta encerra sozinha quando todas as abrangências chegam a 100% das seções.
- Instalável como app (PWA) e pronto para rodar em container.

## Requisitos

- Node.js 24 ou superior (usa o módulo `node:sqlite` embutido; sem dependências npm), ou
- Docker.

## Executando com Node

```bash
npm start
```

Por padrão sobe em `http://localhost:3000`. Para mudar a porta:

```powershell
$env:PORT=3100; npm start        # PowerShell
```
```bash
PORT=3100 npm start              # Linux/macOS
```

## Executando com Docker

```bash
docker compose up -d --build
```

Fica disponível em `http://localhost:3100`. O banco é mantido no volume `dados`, e os dados sobrevivem a atualizações do container.

Sem compose:

```bash
docker build -t voto-a-voto .
docker run -d -p 3100:3000 -v voto-a-voto-dados:/app/data voto-a-voto
```

## Configuração

Tudo é configurado por variáveis de ambiente (veja `docker-compose.yml`):

| Variável        | Padrão                                  | Descrição                                              |
|-----------------|-----------------------------------------|--------------------------------------------------------|
| `PORT`          | `3000`                                  | Porta HTTP                                             |
| `HOST`          | `0.0.0.0`                               | Interface de escuta                                    |
| `ANO`           | `2026`                                  | Ciclo eleitoral (`ele2026` na URL do TSE)              |
| `ELEICAO`       | `6258`                                  | Código da eleição no TSE                               |
| `CARGO`         | `1`                                     | Código do cargo (1 = Presidente)                       |
| `POPULACAO`     | `214211951`                             | População usada no termômetro                          |
| `POLL_SEGUNDOS` | `30`                                    | Intervalo de coleta                                    |
| `DB_PATH`       | `data/voto-a-voto.db`                   | Caminho do banco SQLite                                |
| `TSE_BASE`      | `https://resultados.tse.jus.br/oficial` | Base da API do TSE                                     |

### Próximas eleições

1. Descubra o código da eleição em `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` (campo `cd` da eleição e `c` do ciclo).
2. Ajuste `ANO`, `ELEICAO` e `CARGO`.
3. Atualize `POPULACAO`, se necessário.
4. Para eleições por estado ou município, ajuste a lista de abrangências em `src/config.js`.

Para começar uma eleição nova do zero, use um banco novo (outro `DB_PATH` ou volume). Os registros são separados por eleição e cargo.

## Instalando como app

Abra o painel no Chrome ou Edge e use o ícone de instalar na barra de endereço. O navegador só oferece a instalação em contexto seguro: `localhost` ou HTTPS. Para acesso pela rede, coloque o app atrás de um proxy HTTPS.

## Estrutura

```
src/          servidor (config, cliente do TSE, banco, HTTP)
public/       interface (HTML, CSS, JS, manifesto PWA, service worker, ícones)
data/         banco SQLite (ignorado pelo git; volume no container)
Dockerfile, docker-compose.yml
```

## Banco de dados

- `snapshots`: uma linha por versão publicada pelo TSE em cada abrangência (`br`, `sp`, ...), com o JSON original em `raw`.
- `candidatos`: votos e percentual por candidato em cada snapshot.

Exemplo de consulta:

```sql
SELECT s.atualizado, c.nome, c.votos, c.pct
FROM snapshots s JOIN candidatos c ON c.snapshot_id = s.id
WHERE s.uf = 'br' ORDER BY s.id, c.votos DESC;
```

## Endpoints

- `GET /` painel
- `GET /api` estado atual em JSON
- `GET /healthz` verificação de saúde

## Aviso

Projeto independente, sem vínculo com o TSE. Os dados vêm de arquivos públicos do portal de resultados e o formato pode mudar sem aviso. Os resultados oficiais são os divulgados pelo TSE.

## Licença

[MIT](LICENSE)
