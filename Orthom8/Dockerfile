FROM node:18-slim

# Prisma requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy manifests and prisma schema first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install deps — triggers postinstall: npx prisma generate
RUN npm install

# Copy the rest of the Orthom8 source
COPY . .

EXPOSE 3000

# Run db push (non-fatal — if tables already exist this is a no-op)
# then start the server. Using shell form so || true prevents crash on
# schema-already-in-sync exit codes.
CMD npx prisma db push --accept-data-loss || true && node server.js
