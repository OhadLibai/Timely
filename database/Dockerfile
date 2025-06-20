# /database/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Copy the database directory contents
COPY . .

# Set the node path to resolve modules from the backend
ENV NODE_PATH=./
CMD ["npm", "start"]