docker build -t golery/goapi:sandbox .
docker push golery/goapi:sandbox
sleep 5
koyeb services redeploy goapi-sandbox/main
TIMESTAMP=$(date -u -d "-1 minute" "+%Y-%m-%d %H:%M:%S")
koyeb services logs goapi-sandbox/main --since "$TIMESTAMP +0000 UTC"