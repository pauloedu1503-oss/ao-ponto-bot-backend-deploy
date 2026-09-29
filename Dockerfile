FROM dart:stable AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY pubspec.yaml pubspec.lock ./
RUN dart pub get --enforce-lockfile

COPY bin ./bin
COPY lib ./lib

RUN dart compile exe bin/server.dart -o /app/backend/server

FROM node:22-bookworm-slim AS whatsapp

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG APP_SOURCE_REV=89f87536a42a3f01b747069c5fa845d29c4a8464
RUN git clone https://github.com/pauloedu1503-oss/ao-ponto-bot-producao.git /src \
    && cd /src \
    && git checkout "$APP_SOURCE_REV"

WORKDIR /src/whatsapp_bridge
RUN npm ci --omit=dev

FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl libsqlite3-dev \
    && ln -sf /usr/lib/x86_64-linux-gnu/libsqlite3.so.0 /usr/local/lib/libsqlite3.so \
    && ldconfig \
    && test -e /usr/local/lib/libsqlite3.so \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY --from=build /app/backend/server ./server
COPY --from=whatsapp /src/whatsapp_bridge /app/whatsapp_bridge
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh \
    && mkdir -p /data/whatsapp_auth

ENV HOST=0.0.0.0
ENV PORT=8080
ENV DATABASE_PATH=/data/ao_ponto.db
ENV BACKUP_PATH=/data/backups
ENV BACKEND_URL=http://127.0.0.1:8080
ENV WHATSAPP_AUTH_PATH=/data/whatsapp_auth
ENV BRIDGE_CONTACTS_PATH=/data/bridge_contacts.json

EXPOSE 8080
VOLUME ["/data"]

CMD ["/app/start.sh"]
