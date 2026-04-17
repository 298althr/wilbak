# Use Node.js 18 slim image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy all files (filtered by .dockerignore)
COPY . .

# Expose the port (Wilbak defaults to 4000, but Railway provides $PORT)
EXPOSE 4000

# Launch the Wilbak Command Center
CMD npm start
