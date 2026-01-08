FROM oven/bun:1.3.5

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "server.ts"]
