# TODO: use verision number so that rollback is easier
TIMESTAMP=$(date +'%Y%m%d%H%M%S')
TAG=$TIMESTAMP
docker tag golery/goapi:sandbox golery/goapi:$TAG
docker push golery/goapi:$TAG
echo
echo Pushed image golery/goapi:$TAG
echo Run this command in GCP: TAG=$TAG source /home/lyhoanghai/app-configs/scripts/run-goapi.sh