FROM node:20-bookworm-slim

WORKDIR /app

# ENV NODE_ENV=poduction
ENV TZ=Europe/Madrid

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

USER node

EXPOSE 5050

CMD ["node", "src/server.js"]