'use strict';

const {DONE} = require('./base');

function limit(numberOfResults) {
    return upstream => {
        let timesCalled = 0;
        return () => {
            if (timesCalled >= numberOfResults) return Promise.reject(DONE);
            timesCalled++;
            return upstream();
        }
    }
}

module.exports = limit;
