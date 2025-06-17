# /database/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Copy the entire database and backend directories to have access to configs and entities
COPY . .
COPY ../backend ../backend

# Set the node path to resolve modules from the backend
ENV NODE_PATH=./
CMD ["npm", "start"]