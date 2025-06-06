FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
