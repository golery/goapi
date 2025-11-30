# WHAT IS THIS PROJECT
GOAPI API2 is the migration of Java Goapi.
It's completely written in nodejs + typescript + expressjs

# URL:
localhost:5000/api2/image/imgur

# DEPLOY to KOYEB
Deployed to https://app.koyeb.com
Copy all environment variables in /work/app-configs/goapi2/prod/env.sh to docker configuration

# CONFIGURATION / SECRET
- Dev: ConfigService loads configs and secrets from /workspaces/app-configs/goapi2/dev/config.yml'
- Prod: they are loaded from docker environment variables/

# DEV
## Cheatsheet
- npm run dev
- npm run test:grep "isValidEmail somthing"
- npm run build:watch # quickly check syntax
- npm run test # run all test
- ./scripts/deploy-sandbox.sh # deploy to koeyb as sandbox env

# DEV Database
- Deb DB in supabase. Credentials are provided from /workspaces/app-configs/goapi/dev/env.sh
- There is no migration script. Run manually scripts in migratioins folder.

# TEST
- E2e : tests/e2e/e2e-xyz.ts
- Run: npm run test:file tests/e2e/e2e-node.ts


## Expose to Mobile on Windows machine
Access: http://localhost:8200
In Virtual Machine, Add portforwarding so that Windows hostmachine can access with http://localhost:8200



# TSCONFIG

1. The following are for typeorm
"emitDecoratorMetadata": true,
"experimentalDecorators": true,

# STACK
1. MikroORM is a replacement of TypeORM (It support well uuid type, json type).
   Sample: RecordService
2. Access DB using DBeaver   

# DEPRECATED
1. TypeORM is replaced by MikroOrm
2. /api2/... is replaced by /api/....


# DATABASE
1. appId: number (int2 = smallint)




# RELEASE
1. ./scripts/deploy-sandbox to build and deploy a sandbox version to koyb
2. ./scripts/release: create tag for release 
3. manually pull and run the docker image on gcp
TAG=20240922180503 source /home/lyhoanghai/app-configs/scripts/run-goapi.sh