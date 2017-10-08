'use strict';

const assert = require('assert');
const parallel = require('./parallel');

function buffer(bufferSize) {
    assert(bufferSize > 0, 'bufferSize must be > 0');
    return parallel(bufferSize, 1);
}

module.exports = buffer;
