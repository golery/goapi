# This is used for running ONLY at local.
# On production, use app-config/scripts

# run ./run-image /bin/ash for terminal access
# Test: http://localhost:8200 => Hello
# Dev: docker run --name goapi2  -p 8200:8200 -v /data:/data -it --rm golery/goapi2 /bin/ash

CONFIG='prod'
docker stop goapi2 || true && docker rm goapi2 || true
docker run --name goapi2 -p 8200:8200 -it --rm --env-file /work/app-configs/goapi2/${CONFIG}/env.sh golery/goapi2  $1 $2 $3