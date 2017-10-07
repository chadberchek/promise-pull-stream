'use strict';

const {DONE} = require('../lib/base');

function createPendingPromiseArray(count) {
    const a = new Array(count);
    for (let i = 0; i < count; i++) {
        a[i] = new InvertedPromise();
    }
    return a;
}

class InvertedPromise {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

async function nextTick() {
    await new Promise(resolve => process.nextTick(resolve));
}

async function expectFulfilled(promise, expectedValue) {
    const v = await promise;
    expect(v).toBe(expectedValue);
}

async function expectRejected(promise, expectedReason) {
    try {
        const v = await promise;
        fail(`Expected promise to reject ${String(expectedReason)} but fulfilled ${String(v)}`);
    } catch (reason) {
        expect(reason).toBe(expectedReason);
    }
}

class PromiseFactoryStub {
    constructor(numberOfPromisesToReturn) {
        this._invertedPromises = createPendingPromiseArray(numberOfPromisesToReturn);
        this.timesCalled = 0;
        this.pendingPromises = 0;
        this.promiseFactory = () => this._promiseFactory();
    }

    _promiseFactory() {
        const decrementPending = () => this.pendingPromises--;

        let promise;
        if (this.timesCalled >= this._invertedPromises.length) {
            promise = Promise.reject(DONE);
        } else {
            promise = this._invertedPromises[this.timesCalled].promise;
            this.pendingPromises++;
            promise.then(decrementPending, decrementPending);
        }

        this.timesCalled++;
        return promise;        
    }

    resolve(promiseIndex, value) {
        if (typeof value === 'undefined') value = this.fulfilledValue(promiseIndex);
        this._invertedPromises[promiseIndex].resolve(value);
    }

    reject(promiseIndex, reason) {
        if (typeof reason === 'undefined') reason = this.rejectedReason(promiseIndex);
        this._invertedPromises[promiseIndex].reject(reason);
    }

    resolveAll() {
        this._invertedPromises.forEach((p, i) => p.resolve(this.fulfilledValue(i)));
    }

    rejectAll() {
        this._invertedPromises.forEach((p, i) => p.reject(this.rejectedReason(i)));
    }

    async expectTimesCalled(expectedNumberOfCalls) {
        await nextTick();
        expect(this.timesCalled).toBe(expectedNumberOfCalls);
    }

    async expectPendingPromises(expectedNumberOfPendingPromises) {
        await nextTick();
        expect(this.pendingPromises).toBe(expectedNumberOfPendingPromises);
    }

    fulfilledValue(promiseIndex) {
        return `fulfilled[${promiseIndex}]`;
    }

    rejectedReason(promiseIndex) {
        return `rejected[${promiseIndex}]`;
    }
}

module.exports = {
    createPendingPromiseArray,
    InvertedPromise,
    nextTick,
    expectFulfilled,
    expectRejected,
    PromiseFactoryStub
};
