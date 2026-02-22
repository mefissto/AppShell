FROM node:lts-alpine3.22@sha256:d28696cabe6a72c5addbb608b344818e5a158d849174abd4b1ae85ab48536280

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN apk add --no-cache curl

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start:dev"]