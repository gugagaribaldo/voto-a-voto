FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/voto-a-voto.db

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public

# O banco SQLite fica no volume; o usuário "node" precisa poder escrever nele.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["npm", "start"]
