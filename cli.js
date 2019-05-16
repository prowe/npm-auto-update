#!/usr/bin/env node

const autoUpdate = require('./index');

autoUpdate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });