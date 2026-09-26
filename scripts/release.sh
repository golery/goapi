#!/bin/bash
set -eo pipefail

TIMESTAMP=$(date +'%Y%m%d%H%M%S')
TAG=$TIMESTAMP
docker tag golery/goapi:sandbox golery/goapi:$TAG
docker push golery/goapi:$TAG

echo Pushed image golery/goapi:$TAG
echo "Executing: TAG=$TAG ./scripts/gcloud-deploy-remote.sh"
TAG=$TAG ./scripts/gcloud-deploy-remote.sh
./gcloud-logs.sh