'use strict';

const {DONE} = require('./base');
const Deferred = require('./deferred');

function completedFirst(upstream) {
    const pendingPromises = [];

    return () => {
        const p = new Deferred();
        pendingPromises.push(p);
        upstream().then(
            value => pendingPromises.shift().resolve(value),
            reason => (reason === DONE ? pendingPromises.pop() : pendingPromises.shift()).reject(reason)            
        );
        return p.promise;
    };
}

module.exports = completedFirst;
