# Use Node.js 18 slim image for smaller footprint and better Prisma compatibility
FROM node:18-slim

# Install OpenSSL 1.1.x as required by Prisma engine
RUN apt-get update -y && apt-get install -y openssl

# Set working directory
WORKDIR /app

# Copy package manifests and prisma schema for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (triggers postinstall: npx prisma generate)
RUN npm install

# Copy all files (filtered by .dockerignore)
COPY . .

# Expose the port (Wilbak defaults to 4000, but Railway provides $PORT)
EXPOSE 4000

# Initialization sequence:
# 1. Push schema to the database (ensures DB is synced)
# 2. Launch the Wilbak Command Center
CMD npx prisma db push && npm start
