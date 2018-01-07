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

async function expectNotFulfilled(promise) {
    let fulfilled = false;
    let fulfilledValue;
    promise.then(x => {
        fulfilled = true;
        fulfilledValue = x;
    });
    await nextTick();
    if (fulfilled) fail(`Expected promise not to be fulfilled but fulfilled ${String(fulfilledValue)}`);
}

async function nextTick() {
    await new Promise(resolve => process.nextTick(resolve));
}

async function rejected(promise) {
    try {
        const v = await promise;
        fail(`Expected promise to reject but fulfilled ${String(v)}`);
    } catch (reason) {
        return reason;
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
        this._invertedPromises[promiseIndex].resolve(value);
    }

    reject(promiseIndex, reason) {
        this._invertedPromises[promiseIndex].reject(reason);
    }

    resolveAll() {
        this._invertedPromises.forEach((p, i) => p.resolve(i));
    }

    rejectAll() {
        this._invertedPromises.forEach((p, i) => p.reject(i));
    }

    async expectTimesCalled(expectedNumberOfCalls) {
        await nextTick();
        expect(this.timesCalled).toBe(expectedNumberOfCalls);
    }

    async expectPendingPromises(expectedNumberOfPendingPromises) {
        await nextTick();
        expect(this.pendingPromises).toBe(expectedNumberOfPendingPromises);
    }
}

module.exports = {
    createPendingPromiseArray,
    InvertedPromise,
    nextTick,
    rejected,
    PromiseFactoryStub,
    expectNotFulfilled,
};
