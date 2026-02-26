#!/bin/bash

# This script is intended to be run after the Prisma client has been generated. 
# It checks for the existence of a package.json file in the generated Prisma client directory and creates one if it doesn't exist. 
# This is necessary for the generated Prisma client to be properly recognized as a package in CI/CD pipelines.

dirname=$(dirname "$0") # Get the directory of the current script
file_location=$dirname/../generated/prisma
package_file_name="package.json"
package_file_path=$file_location/$package_file_name
  

echo "Checking if file '$package_file_name' exists at '$file_location'..."

if [ ! -f $package_file_path ]; then
  echo "File '$package_file_name' does not exist at '$file_location', creating it..."
  touch $package_file_path
  cat > $package_file_path << EOF
{
  "name": "@generated/prisma",
  "main": "client.ts",
  "types": "client.ts"
}
EOF
else
  echo "File '$package_file_name' already exists at '$file_location', skipping creation."
fi

index_file_name="index.ts"
index_file_path=$file_location/$index_file_name

echo "Checking if file '$index_file_name' exists at '$file_location'..."
if [ ! -f $index_file_path ]; then
  echo "File '$index_file_name' does not exist at '$file_location', creating it..."
  touch $index_file_path
  cat > $index_file_path << EOF
export * from './client';
EOF
else
  echo "File '$index_file_name' already exists at '$file_location', skipping creation."
fi