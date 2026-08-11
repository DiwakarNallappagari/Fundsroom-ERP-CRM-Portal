FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy remaining code
COPY . .

# Generate Prisma client and build typescript
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

# Start server (we use a shell script or command to push schema changes and start)
CMD npx prisma db push && npm run prisma:seed && node dist/index.js
