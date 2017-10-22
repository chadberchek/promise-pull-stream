'use strict';

function flatten(upstream) {
    let it;

    return async () => {
        let next;
        while (!it || (next = it.next()).done) {
            it = (await upstream())[Symbol.iterator]();
        }
        return next.value;
    };
}

module.exports = flatten;
