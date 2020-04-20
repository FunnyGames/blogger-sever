$APP_NAME=funnygames/blogger-server

docker build -t $APP_NAME .

docker run -p 80:5000 -d $APP_NAME