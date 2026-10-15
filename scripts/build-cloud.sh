#!/usr/bin/env bash
# Optional helper for this cloud machine's existing proxy and trusted CA.
# Standard hosts can use `docker build -t sodam .` directly.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${HTTPS_PROXY:?This helper requires the cloud HTTPS_PROXY binding}"
: "${NODE_EXTRA_CA_CERTS:?This helper requires the cloud trusted CA path}"
semas_proxy_host="$(python3 - <<'PY'
import os, socket, urllib.parse
host = urllib.parse.urlparse(os.environ['HTTPS_PROXY']).hostname
print(host + ':' + socket.gethostbyname(host))
PY
)"
docker --config /workspace/.docker-cache build \
  --network=host --add-host "$semas_proxy_host" \
  --build-arg HTTPS_PROXY --build-arg HTTP_PROXY --build-arg NO_PROXY \
  --secret id=build_ca,src="$NODE_EXTRA_CA_CERTS" \
  -t sodam:validated .
