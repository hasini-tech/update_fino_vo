#!/bin/bash
cd /var/www/finov-o
git pull origin main
cd Backend && npm install
cd ../Frontend && npm install && npm run build
pm2 restart all
