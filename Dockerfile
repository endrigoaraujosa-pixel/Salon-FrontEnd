FROM node:22-alpine3.23 AS build

WORKDIR /frontend

COPY ./package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:stable-alpine3.23

COPY --from=build /frontend/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]