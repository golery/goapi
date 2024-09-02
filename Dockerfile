# The node version should match with node version at your local
FROM node:22.3.0-alpine as builder
RUN npm install -g pm2 typescript

WORKDIR /app/goapi2
COPY package*.json ./
RUN cat package.json
RUN npm ci

COPY *.* ./
COPY src src
RUN ls sr*

# Disable below during development of docker
# The compile can be done by npm run watch-ts
RUN npm run build

CMD ["pm2-runtime", "start", "dist/server.js"]