#!/bin/bash

dirname=$(dirname "$0") # Get the directory of the current script
file_name="package.json"
file_location=$dirname/../generated/prisma
file_path=$file_location/$file_name

echo "Checking if file '$file_name' exists at '$file_location'..."

if [ ! -f $file_path ]; then
  echo "File '$file_name' does not exist at '$file_location', creating it..."
  touch $file_path
  cat > $file_path << EOF
{
  "name": "@generated/prisma",
  "main": "client.js",
  "types": "client.d.ts",
  "type": "commonjs"
}
EOF
else
  echo "File '$file_name' already exists at '$file_location', skipping creation."
fi

