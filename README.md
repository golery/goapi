# WHAT IS THIS PROJECT
GOAPI API2 is the migration of Java Goapi.
It's completely written in nodejs + typescript + expressjs

# URL:
localhost:5000/api2/image/imgur

# GOAPI
1. Main instance is deployed on GCP compute engine, exposed via http://goapi.golery.com:8200.
   - Pencil web page use vercel forward because to solve the CORS issue
   - Flutter app uses http://goapi.golery.com:8200
   - WebView in Flutter uses https://pencil.golery.com because webview requires https

2. Fallback backup
   - goapi is deployed to GCP cloud run (ghs.googlehosted.com), exposed via https://api.golery.com
   - goapi is deployed to koyeb: https://goapi-golery.koyeb.app
   
# DEPLOY to KOYEB (SANDBOX)
Deployed to https://app.koyeb.com
Copy all environment variables in /work/app-configs/goapi2/prod/env.sh to docker configuration

# CONFIGURATION / SECRET
- Dev: ConfigService loads configs and secrets from /workspaces/app-configs/goapi2/dev/config.yml'
- Prod: they are loaded from docker environment variables/

# DEV
## Running from WSL
1. wsl
   cd repos && curosr
   wsl --shutdown
2. WSL has ~/.wslconfig
   Set networkingMode=mirrored
   eth0 is mirrored to host machine NIC. 
   That means: it has exactly the same IP of the windows machine.
3. Network investigation
   ip a & ip r
   ip config
4. Remeber to open firewall
5. From windows, localhost is always portforwarded, but only IP source localhost.
   That's why we need networkingMode=mirrored
6. Mobile access via 192.168.....
   
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


# DATABASE
1. It's in supabase. Login via github personal account or golery.team@gmail.com(with password)
2. Database is Prod. It's not visible in the UI of supabase.
3. Credential is stored in bitwarden/Golery/Supabse DB Credential (or in GCP env variables).
4. Connecting with DBVisualizer/Data grip from Windows Host machine to localhost
   localhost portforward is turned on by default for WSL
5. Migration: run manually script in migrations folder   

# RELEASE
0. Turn on docker in Windows machine
1. ./scripts/deploy-sandbox.sh to build and deploy a sandbox version to koybe
   Needs docker login with user goloery.
   Install https://www.koyeb.com/docs/build-and-deploy/cli/installation
   koyeb login
   `
2. ./scripts/release.sh: create tag for release (needs deploy-sandbox.sh)
3. Open google console, connect ssh web to node
manually pull and run the docker image on gcp
TAG=20240922180503 source /home/lyhoanghai/app-configs/scripts/run-goapi.sh

# Setup WSL
1. apt install zsh
   chsh -s $(which zsh)
