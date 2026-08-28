#!/bin/sh
set -e
cd /app
mkdir -p /data
npx prisma db push
exec node server.js
