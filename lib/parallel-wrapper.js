'use strict';

const parallel = require('./parallel');
const unparallel = require('./unparallel');
const returnCompletedFirst = require('./completed-first');
const partialPipe = require('./partial-pipe');
const ifWrapper = require('./if-wrapper');

function parallelWrapper({
    parallelOperations,
    bufferSize,
    completedFirst
}, ...throughs) {
    const isParallel = parallelOperations > 1;
    return partialPipe(
        ifWrapper(isParallel, unparallel),
        ...throughs,
        ifWrapper(completedFirst && isParallel, returnCompletedFirst),
        parallel(parallelOperations, bufferSize)
    );
}

module.exports = parallelWrapper;
