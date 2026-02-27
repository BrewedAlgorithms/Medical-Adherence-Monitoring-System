FROM node:18-alpine

# Set timezone to IST
RUN apk add --no-cache tzdata
ENV TZ=Asia/Kolkata

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
