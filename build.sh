#!/usr/bin/env bash
user=$1
commit=$(git rev-parse --short HEAD)


docker build -t $user/salon-frontend:$commit .
docker tag $user/salon-frontend:$commit $user/salon-frontend:latest
docker push $user/salon-frontend:$commit
docker push $user/salon-frontend:latest