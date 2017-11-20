'use strict';

const {DONE} = require('./base');

function filter(fulfilledFilter, rejectedFilter) {
    const hasFulfilledFilter = typeof fulfilledFilter === 'function';
    const hasRejectedFilter = typeof rejectedFilter === 'function';
    return up => async () => {
        for (;;) {
            try {
                const x = await up();
                if (!hasFulfilledFilter || fulfilledFilter(x)) return x;
            } catch (e) {
                if (e === DONE || !hasRejectedFilter || rejectedFilter(e)) throw e;
            }
        }
    };
}

module.exports = filter;
