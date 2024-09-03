# TODO: use verision number so that rollback is easier
TAG=latest
docker tag golery/goapi:sandbox golery/goapi:$TAG
docker push golery/goapi:$TAG