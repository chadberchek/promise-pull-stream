'use strict';

const assert = require('assert');

function parallel(maxParallelOperations, bufferSize) {
    assert(maxParallelOperations > 0, 'maxParallelOperations must be > 0');
    assert(bufferSize >= maxParallelOperations - 1, 'bufferSize must be >= maxParallelOperations - 1');
    return promiseFactory => {
        const buf = [];
        let running = 0;

        function startAnother() {
            const p = promiseFactory();
            running++;
            buf.push(p);
            p.then(settled, settled);
        }

        function settled() {
            running--;
            if (buf.length < bufferSize) {
                startAnother();
            }
        }

        return () => {
            while (running < maxParallelOperations && buf.length <= bufferSize) {
                startAnother();
            }
            if (buf.length) {
                return buf.shift();
            } else {
                return new Promise(() => assert.fail("max number of parallel operations already running"));
            }
        };
    }
}

module.exports = parallel;
