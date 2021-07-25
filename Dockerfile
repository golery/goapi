FROM node:14.17.4-alpine
RUN npm install -g pm2 sass typescript

WORKDIR /app
COPY package*.json ./
RUN npm i

COPY . .

# Disable below during development of docker
# The compile can be done by npm run watch-ts
# RUN npm run build

CMD ["pm2-runtime", "start", "dist/server.js"]