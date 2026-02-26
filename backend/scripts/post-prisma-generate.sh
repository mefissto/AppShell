#!/bin/bash

# This script is intended to be run after the Prisma client has been generated. 
# It checks for the existence of a package.json file in the generated Prisma client directory and creates one if it doesn't exist. 
# This is necessary for the generated Prisma client to be properly recognized as a package in CI/CD pipelines.

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
  "main": "client.ts",
  "types": "client.ts",
}
EOF
else
  echo "File '$file_name' already exists at '$file_location', skipping creation."
fi

