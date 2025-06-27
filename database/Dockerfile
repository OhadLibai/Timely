# /database/Dockerfile
FROM node:18-alpine

WORKDIR app

COPY package*.json ./
RUN npm install

# Copy the database directory contents
COPY . .

# Migrations
COPY migrations/ ./migrations/

# Set the node path to resolve modules from the backend
ENV NODE_PATH=./
CMD ["npm", "start"]