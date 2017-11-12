'use strict';

const {DONE} = require('./base');

class InvertedPromise {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

function completedFirst(upstream) {
    const pendingPromises = [];

    return () => {
        const p = new InvertedPromise();
        pendingPromises.push(p);
        upstream().then(
            value => pendingPromises.shift().resolve(value),
            reason => (reason === DONE ? pendingPromises.pop() : pendingPromises.shift()).reject(reason)            
        );
        return p.promise;
    };
}

module.exports = completedFirst;
