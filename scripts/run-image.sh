# This is used for running ONLY at local.
# On production, use app-config/scripts

# run ./run-image /bin/ash for terminal access
# Test: http://localhost:8200 => Hello
# Dev: docker run --name goapi2  -p 8200:8200 -v /data:/data -it --rm golery/goapi2 /bin/ash

CONFIG='prod'
docker stop goapi || true && docker rm goapi || true
docker run --name goapi -p 8200:8200 -it --rm --env-file /work/app-configs/goapi/${CONFIG}/env.sh golery/goapi  $1 $2 $3