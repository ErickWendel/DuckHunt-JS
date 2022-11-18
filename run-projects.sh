nvm install 18
nvm alias default 18
nvm use 18

npm i -g concurrently
cd mobile-controller
npm ci --silent
npm start &
# cd ..
# cd game 
# npm ci --silent