# have to use default because cant get crypto to work with alpine
FROM node:18

EXPOSE 3000

WORKDIR /app
COPY . /app/

RUN yarn install

ENTRYPOINT [ "node", "--experimental-specifier-resolution=node", "src/index.js" ]
