'use strict';

const {DONE} = require('./base');
const assert = require('assert');

class RejectionHolder {
    store(reason) {
        assert(!this.containsRejection, 'RejectionHolder already contains a rejection');
        this.containsRejection = true;
        this.reason = reason;
    }

    throwAndReset() {
        if (this.containsRejection) {
            this.containsRejection = false;
            const e = this.reason;
            this.reason = null; // prevent memory leak
            throw e;
        }
    }
}

function batch(batchSize, retainBatchOnRejection) {
    assert(batchSize > 0, 'batch size must be > 0');
    return up => {
        const rejectionHolder = new RejectionHolder();
        let batchValues = [];
        return async () => {
            rejectionHolder.throwAndReset();
            try {
                while (batchValues.length < batchSize) {
                    batchValues.push(await up());
                }
            } catch (e) {
                if ((retainBatchOnRejection && e !== DONE) || batchValues.length === 0) throw e;
                rejectionHolder.store(e);
            }
            const result = batchValues;
            batchValues = [];
            return result;
        };
    };
}

module.exports = batch;
