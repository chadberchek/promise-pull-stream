'use strict';

const assert = require('assert');
const parallel = require('./parallel');

function buffer(bufferSize) {
    assert(bufferSize > 0, 'bufferSize must be > 0');
    return upstream => parallel(bufferSize, 1, upstream);
}

module.exports = buffer;
