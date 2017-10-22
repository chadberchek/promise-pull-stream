'use strict';

function flatten(upstream) {
    let it;

    return () => {
        if (!it) return promiseForFirstElementOfNextIterator();
        const next = it.next();
        return next.done ? promiseForFirstElementOfNextIterator() : Promise.resolve(next.value);        
    };

    function promiseForFirstElementOfNextIterator() {
        return upstream().then(newIterable => {
            it = newIterable[Symbol.iterator]();
            const next = it.next();
            return next.done ? promiseForFirstElementOfNextIterator() : next.value;
        });
    }
}

module.exports = flatten;
