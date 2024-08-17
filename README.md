# WHAT IS THIS PROJECT
GOAPI API2 is the migration of Java Goapi.
It's completely written in nodejs + typescript + expressjs

# URL:
localhost:5000/api2/image/imgur

# RELEASE
At local:
./script/build-image.sh
./script/push-image.sh
Test image at local (with prod config)
./script/run-image.sh

# DEPLOY to KOYEB
Deployed to https://app.koyeb.com
Copy all environment variables in /work/app-configs/goapi2/prod/env.sh to docker configuration

# CONFIGURATION / SECRET
- Dev: ConfigService loads configs and secrets from /data/app-configs/goapi2/dev/config.yml'
- Prod: they are loaded from docker environment variables/

# DEV
Access: http://localhost:8200
## Run with typescript ts-node, using dev db
npm run dev
## Compile and run with js
npm run dev-js
## Run at local connect to prod
./scripts/run-image
It can be used for testing image or just to quickly run backend at local

# TSCONFIG

1. The following are for typeorm
"emitDecoratorMetadata": true,
"experimentalDecorators": true,