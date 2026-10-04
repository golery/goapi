#!/bin/bash
set -eo pipefail

# In order to use
# koyeb login (PAT is in 1password)
# docker login -u golery
docker build -t golery/goapi:sandbox .
docker push golery/goapi:sandbox
sleep 5

echo "Redeploy to koyeb"
koyeb apps resume goapi-sandbox || echo "App not paused; skipping resume"
koyeb services redeploy goapi-sandbox/main --wait --wait-timeout 5m

SANDBOX_URL="https://sandbox-api-golery.koyeb.app/"
deadline=$((SECONDS + 180))
while [ "$SECONDS" -lt "$deadline" ]; do
  if curl -fsS --max-time 5 "$SANDBOX_URL" | grep -q ping; then
    echo "Sandbox is serving ping at $SANDBOX_URL"
    exit 0
  fi
  echo "waiting for $SANDBOX_URL ($((deadline - SECONDS))s left)"
  sleep 5
done

echo "Sandbox did not respond with ping at $SANDBOX_URL within 3 minutes"
end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
start_time=$(date -u -d "-15 minutes" +"%Y-%m-%dT%H:%M:%SZ")
echo "=== Runtime logs (last 15m) ==="
koyeb services logs goapi-sandbox/main --start-time "$start_time" --end-time "$end_time" || true
echo "=== Build logs (last 15m) ==="
koyeb services logs goapi-sandbox/main -t build --start-time "$start_time" --end-time "$end_time" || true
exit 1
