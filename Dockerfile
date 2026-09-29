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

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY --from=build /app/backend/server ./server

ENV HOST=0.0.0.0
ENV PORT=8080
ENV DATABASE_PATH=/data/ao_ponto.db
ENV BACKUP_PATH=/data/backups

EXPOSE 8080
VOLUME ["/data"]

CMD ["./server"]
