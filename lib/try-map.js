'use strict';

const assert = require('assert');

function catchWrapper(mapFunction, catchFunction, maxConsecutiveErrors) {
    assert(!(maxConsecutiveErrors < 1), 'if specified, maxConsecutiveErrors must be >= 1');
    return up => async () => {
        let errorCount = 0;
        for (;;) {
            const v = await up();
            try {
                return await mapFunction(v);
            } catch (e) {
                errorCount++;
                if (errorCount >= maxConsecutiveErrors) throw e;
                await catchFunction(e);
            }
        }
    }
}

module.exports = catchWrapper;
