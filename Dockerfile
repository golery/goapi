# Using official Bun image
FROM oven/bun:1

WORKDIR /app/goapi2
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src src

CMD ["bun", "src/server.ts"]