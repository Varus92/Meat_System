#!/bin/bash

unset NODE_OPTIONS
echo $NODE_OPTIONS
rm -rf node_modules package-lock.json
npm install ajv@6.12.6 ajv-keywords@3.5.2 --legacy-peer-deps
npm start
