APP_NAME=funnygames/blogger-server

docker container stop $(docker container ls -aq)

docker container rm $(docker container ls -aq)

docker system prune --volumes

docker rmi $APP_NAME

docker build -name blogger_server -t $APP_NAME .

docker run -e NODE_ENV=production -p 80:5000 -d $APP_NAME 