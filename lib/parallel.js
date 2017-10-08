'use strict';

const assert = require('assert');

function parallel(bufferSize, maxParallelOperations) {
    assert(bufferSize >= 0, 'buffer size must be >= 0');
    assert(maxParallelOperations > 0, 'max number of parallel operations must be > 0');
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
