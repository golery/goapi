#!/bin/bash
# One-off cleanup on goapi-1 when deploy fails with "no space left on device".
set -eo pipefail

gcloud compute ssh lyhoanghai@goapi-1 \
  --project=golery \
  --zone=us-central1-c \
  --quiet \
  --command='docker stop goapi 2>/dev/null || true; docker rm goapi 2>/dev/null || true; docker system prune -af; docker builder prune -af 2>/dev/null || true; df -h /'
