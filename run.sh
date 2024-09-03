#!/bin/bash
git submodule update --init --recursive
docker run --rm -v `pwd`:/app/:rw -v /var/www/pokerogue.dakurei.ovh/:/app/dist/:rw -w /app/ node:20.13.1-alpine sh -c "npm ci && npm run build"
docker run --rm -v `pwd`:/app/:rw -v /var/www/pokerogue.dakurei.ovh/:/app/dist/:rw -w /app/ ruby:3.3.1-alpine sh -c "ruby manifest_generator.rb -v --inpath ./dist/"
