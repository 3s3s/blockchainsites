apt-get update

apt-get install build-essential libssl-dev curl -y

curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh -o install_nvm.sh

bash install_nvm.sh

reboot

nvm install 12.6.0

git clone https://github.com/3s3s/blockchainsites.git

cd blockchainsites

npm install

npm start