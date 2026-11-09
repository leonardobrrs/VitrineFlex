FROM node:20-alpine AS build

WORKDIR /app

COPY apps/web/package*.json ./
RUN npm install

COPY apps/web/ ./
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
RUN npm install -g serve

COPY --from=build /app/dist /app/dist

EXPOSE 5173

CMD ["serve", "-s", "/app/dist", "-l", "5173"]
