# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl wget

WORKDIR /app

# Download AWS RDS SSL global bundle certificate
RUN wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Strip dev dependencies, then regenerate the Prisma client — prune can remove
# the generated client under node_modules/.prisma, so generation must run after
RUN npm prune --omit=dev && npx prisma generate

# ── Stage 2: Production image ─────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Run as a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy compiled output, schema, and SSL root cert
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/global-bundle.pem ./global-bundle.pem

USER nestjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

EXPOSE 4000

# Run migrations then start the server. The prisma CLI is a production
# dependency so it survives `npm prune --omit=dev` (the container previously
# crashed at start because the CLI was pruned out of the image).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
