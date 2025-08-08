# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    cp -R node_modules prod_node_modules && \
    npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build /app/dist ./dist
COPY --from=build /app/prod_node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/public ./public
EXPOSE 19000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
