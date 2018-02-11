'use strict';

const assert = require('assert');

function catchWrapper(mapFunction, catchFunction, maxConsecutiveErrors) {
    assert(!(maxConsecutiveErrors < 1), 'if specified, maxConsecutiveErrors must be >= 1');
    return up => async () => {
        let lastError;
        for (let errorCount = 0; !(errorCount >= maxConsecutiveErrors); errorCount++) {
            const v = await up();
            try {
                return await mapFunction(v);
            } catch (e) {
                await catchFunction(e, v);
                lastError = e;
            }
        }
        throw lastError;
    }
}

module.exports = catchWrapper;
