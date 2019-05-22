#!/bin/bash

npm checkout master
npm branch -D npm-auto-update
git push origin --delete npm-auto-update

git branch --all