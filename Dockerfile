# AttestCredit proof worker (HTTP API + import pipeline). Built from the repo root so it can read deployments/.
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY worker/package.json worker/
COPY contracts/package.json contracts/
COPY web/package.json web/
RUN pnpm install --filter @attestcredit/worker --frozen-lockfile
COPY worker worker
COPY deployments deployments
ENV NODE_ENV=production
EXPOSE 8787
WORKDIR /app/worker
CMD ["node_modules/.bin/tsx", "src/server.ts"]
