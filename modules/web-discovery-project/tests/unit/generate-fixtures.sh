#!/usr/bin/env sh

yarn build-without-polyfill
./generate-fixtures.js
