#!/bin/bash
set -eo pipefail

TIMESTAMP=$(date +'%Y%m%d%H%M%S')
TAG=$TIMESTAMP
docker tag golery/goapi:sandbox golery/goapi:$TAG
docker push golery/goapi:$TAG

echo Pushed image golery/goapi:$TAG
echo "Executing: gcloud compute ssh --project=golery --zone=us-central1-c lyhoanghai@goapi-1 --command=\"TAG=$TAG source /home/lyhoanghai/app-configs/scripts/run-goapi.sh\""
gcloud compute ssh --project=golery --zone=us-central1-c lyhoanghai@goapi-1 --command="TAG=$TAG source /home/lyhoanghai/app-configs/scripts/run-goapi.sh"
./gcloud-logs.sh