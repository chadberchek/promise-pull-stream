'use strict';

const partialPipe = require('./partial-pipe');

function ifWrapper(condition, ...f) {
    if (condition) {
        if (f.length === 1) return f[0];
        else return partialPipe(...f);
    }
    else return x => x;
}

module.exports = ifWrapper;
