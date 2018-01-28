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
    return partialPipe(
        unparallel,
        ...throughs,
        ifWrapper(completedFirst, returnCompletedFirst),
        parallel(parallelOperations, bufferSize)
    );
}

module.exports = parallelWrapper;
