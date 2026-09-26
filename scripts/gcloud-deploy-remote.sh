#!/bin/bash
set -eo pipefail

TAG="${TAG:-${1:?TAG required (env TAG or first argument)}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

gcloud compute ssh lyhoanghai@goapi-1 \
  --project=golery \
  --zone=us-central1-c \
  --quiet \
  --command="TAG=${TAG} bash -s" < "${SCRIPT_DIR}/run-goapi.sh"
