# ==============================================================================
# Build y servidor de la aplicación React + Vite
# ==============================================================================
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Argumentos de entorno para Vite durante el build
ARG VITE_AUTH_API_URL=http://localhost:4000/api
ARG VITE_BUSINESS_API_URL=http://localhost:8000/api
ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_BUSINESS_API_URL=$VITE_BUSINESS_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
