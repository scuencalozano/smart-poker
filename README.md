SMART POKER
===========
Bots to simulate poker players, for training purposes.

Smart Poker analyzes all hands played in the best online poker rooms, through a series of algorithms.
Is able to simulate every poker player, letting you know which hand plays in every situation, showing their weaknesses and what is the best strategy to exploit.

Based on [@geobalas](https://github.com/geobalas/Poker) poker app

HOW BOTS WORK
=============
The code of the API will be upload in another repo

DEMO
====
[SmartPoker](http://santiagocuenca.com/smart-poker)

Everyone is welcome to contribute to this project

TO RUN
create .env based on env.example
node app.js


// TO AWS SERVER
// install nginx
(https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04)
sudo apt-get update
sudo apt-get install nginx
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3389/tcp
sudo ufw enable
sudo ufw status // most be inactive never use sudo ufw enable because intrupt ssh conections
systemctl status nginx // status

// config reverse proxy
sudo ufw allow <PORT-NODE-APP>/tcp   // remember to open on aws console too
sudo nano /etc/nginx/sites-available/default
  // paste
  server {
    listen <PORT-NODE-APP>;
    listen [::]:<PORT-NODE-APP>;

    server_name santiagocuenca;

    location / {
        proxy_pass <http://127.0.0.1:3030>;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
  }
sudo systemctl restart nginx // to restart

// Install pm2
(https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04)
sudo npm install -g pm2
pm2 startup systemd // this generate a command line on the end, please remember apply copy/paste
pm2 start app.js (in smart-poker dir)
