module.exports = {
    DONE: require('./lib/base').DONE,
    buffer: require('./lib/buffer'),
    completedFirst: require('./lib/completed-first'),
    flattenIterable: require('./lib/flatten-iterable'),
    limit: require('./lib/limit'),
    parallel: require('./lib/parallel'),
    unparallel: require('./lib/unparallel'),
    pull: require('./lib/pull'),
    then: require('./lib/then'),
};
