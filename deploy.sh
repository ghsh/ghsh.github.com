#!/usr/bin/env bash

rm _site/.git -rf
cp .git _site -rf
rm _site/.git/index
echo "ref: refs/heads/master" > _site/.git/HEAD
cd _site
git add -A .
git commit "$*"
git push origin HEAD:master --force
