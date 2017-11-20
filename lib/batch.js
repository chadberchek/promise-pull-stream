'use strict';

const {DONE} = require('./base');
const assert = require('assert');

function batch(batchSize) {
    assert(batchSize > 0, 'batch size must be > 0');
    return up => {
        let batchValues = [];
        return async () => {
            try {
                while (batchValues.length < batchSize) {
                    batchValues.push(await up());
                }
            } catch (e) {
                if (e !== DONE || batchValues.length === 0) throw e;  
            }
            const result = batchValues;
            batchValues = [];
            return result;
        };
    };
}

module.exports = batch;
