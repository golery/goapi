# WHAT IS THIS PROJECT
GOAPI API2 is the migration of Java Goapi.
It's completely written in nodejs + typescript + expressjs

# URL:
localhost:5000/api2/image/imgur

# PRODUCTION
At local:
./script/build-image.sh
./script/push-image.sh
On server:
docker pull golery/goapi2
Troubleshoot
/data/app-configs/scripts/run-goapi2.sh
docker logs -f goapi2  # pm2-runtime is used which log directly to console.
in side container, to get only new log: pm2 log (but don't see history log)

# PRODUCTION TROUBESHOOT
npm run start

# DEV
# Run below to setup aws credentials
. /work/app-configs/dev/goapi2/env.sh
npm watch-node
npm watch-ts
Access: http://localhost:8200

# REFERENCES
- For app framework https://github.com/microsoft/TypeScript-Node-Starter