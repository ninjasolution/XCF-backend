FROM node:16-alpine as builder

WORKDIR /app

COPY . .
RUN yarn install
RUN yarn build


FROM node:16-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
RUN yarn install

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
