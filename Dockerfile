FROM node:16
WORKDIR /usr/src/app

RUN apt-get install -y git
RUN git clone https://github.com/BonhyeonGu/RentalManagement
COPY ./Copy/secret/* /usr/src/app/RentalManagement/secret/

WORKDIR /usr/src/app/RentalManagement
RUN npm install
EXPOSE 9999
RUN ls -al secret
CMD [ "node", "index.js" ]