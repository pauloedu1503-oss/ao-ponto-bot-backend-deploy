#!/bin/bash
set -u

cd /app/backend
./server &
backend_pid=$!

encerrar() {
  kill "$backend_pid" 2>/dev/null || true
  if [ -n "${bridge_pid:-}" ]; then
    kill "$bridge_pid" 2>/dev/null || true
  fi
}

trap encerrar TERM INT

(
  until curl --fail --silent --output /dev/null http://127.0.0.1:8080/api/app-versao; do
    if ! kill -0 "$backend_pid" 2>/dev/null; then
      exit 1
    fi
    sleep 2
  done

  cd /app/whatsapp_bridge
  while kill -0 "$backend_pid" 2>/dev/null; do
    node index.js
    echo "A ponte do WhatsApp parou; tentando novamente em 5 segundos."
    sleep 5
  done
) &
bridge_pid=$!

wait "$backend_pid"
status=$?
kill "$bridge_pid" 2>/dev/null || true
wait "$bridge_pid" 2>/dev/null || true
exit "$status"
