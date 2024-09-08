docker build -t golery/goapi:sandbox .
docker push golery/goapi:sandbox
koyeb services redeploy goapi-sandbox/main