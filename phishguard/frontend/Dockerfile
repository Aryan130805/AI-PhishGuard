FROM node:18-alpine

WORKDIR /app

# Copy dependency configs
COPY package.json ./

# Install dependencies inside the container
RUN npm install

# Copy application files
COPY . .

EXPOSE 3000

# Start Vite dev server with host flag to allow outside access
CMD ["npm", "run", "dev"]
