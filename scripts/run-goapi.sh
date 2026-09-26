#!/bin/bash
# Run on goapi-1 (or via gcloud-deploy-remote.sh). Keep in sync with app-configs copy.
set -eo pipefail

TAG="${TAG:?TAG must be set}"
IMAGE="golery/goapi:${TAG}"
ENV_FILE="/home/lyhoanghai/app-configs/goapi/prod/env.sh"

echo "stopping container..."
docker stop goapi 2>/dev/null || true
docker rm goapi 2>/dev/null || true

echo "pruning unused docker data (VM disk is small)..."
docker system prune -af >/dev/null
docker builder prune -af >/dev/null 2>&1 || true

echo "disk after prune:"
df -h / | tail -1

docker pull "$IMAGE"
echo "running container with env file ${ENV_FILE}"
docker run -d \
  --name goapi \
  --restart unless-stopped \
  -p 8200:8200 \
  --env-file "$ENV_FILE" \
  "$IMAGE"
