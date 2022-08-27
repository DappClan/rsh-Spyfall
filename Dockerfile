FROM node:lts-alpine as base
WORKDIR /home/node
# Install npm dependencies
COPY package*.json ./
RUN npm ci --only=prod --no-optional

# Production Image
FROM node:lts-alpine as prod
WORKDIR /home/node
USER node
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=base /home/node/build/ build/
COPY server/ server/
# Install prod dependencies dependencies
RUN npm ci --only=prod --no-optional
EXPOSE 8081
CMD ["node", "server"]
