docker build -t golery/goapi:sandbox .
docker push golery/goapi:sandbox
sleep 5
koyeb services redeploy goapi-sandbox/main
koyeb services logs goapi-sandbox/main --since '2024-09-09 10:57:00 +0000 UTC'