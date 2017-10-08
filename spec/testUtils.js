'use strict';

const {DONE} = require('../lib/base');

function createPromiseStubArray(count) {
    const a = new Array(count);
    for (let i = 0; i < count; i++) {
        a[i] = new PromiseStub(`PromiseStub[${i}]`);
    }
    return a;
}

class PromiseStub {
    constructor(name) {
        this.name = name;
        this.state = 'pending';

        const settle = (newState, promiseCb) => {
            if (this.state !== 'pending') {
                fail(`invalid test: ${this.name} already ${this.state}`);
            } else {
                this.state = newState;
                this.value = `${this.name}-${newState}`;
                promiseCb(this.value);
            }            
        }

        this.promise = new Promise((res, rej) => {
            this.resolve = () => settle('fulfilled', res);
            this.reject = () => settle('rejected', rej);
        });
    }

    async wasFollowedBy(otherPromise) {
        if (this.state === 'fulfilled') {
            await expectFulfilled(otherPromise, this.value);
        } else if (this.state === 'rejected') {
            await expectRejected(otherPromise, this.value);
        } else {
            fail(`invalid test: resolve or reject has not been called on ${this.name}`);
        }
    }
}

async function nextTick() {
    await new Promise(resolve => process.nextTick(resolve));
}

async function expectFulfilled(promise, expectedValue) {
    try {
        expect(await promise).toBe(expectedValue);
    } catch (e) {
        fail(`Expected promise to fulfill with "${String(expectedValue)}" but rejected with "${String(e)}"`);
    }
}

async function expectRejected(promise, expectedReason) {
    try {
        const v = await promise;
        fail(`Expected promise to reject with "${String(expectedReason)}" but fulfilled with "${String(v)}"`);
    } catch (reason) {
        expect(reason).toBe(expectedReason);
    }
}

class PromiseFactoryStub {
    constructor(numberOfPromisesToReturn) {
        this.promiseStub = createPromiseStubArray(numberOfPromisesToReturn);
        this.timesCalled = 0;
        this.pendingPromises = 0;
        this.promiseFactory = () => this._promiseFactory();
    }

    _promiseFactory() {
        const decrementPending = () => this.pendingPromises--;

        let promise;
        if (this.timesCalled >= this.promiseStub.length) {
            promise = Promise.reject(DONE);
        } else {
            promise = this.promiseStub[this.timesCalled].promise;
            this.pendingPromises++;
            promise.then(decrementPending, decrementPending);
        }

        this.timesCalled++;
        return promise;        
    }

    resolve(promiseIndex) {
        this.promiseStub[promiseIndex].resolve();
    }

    reject(promiseIndex, reason) {
        this.promiseStub[promiseIndex].reject();
    }

    resolveAll() {
        this.promiseStub.forEach((_, i) => this.resolve(i));
    }

    rejectAll() {
        this.promiseStub.forEach((_, i) => this.reject(i));
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
    createPromiseStubArray,
    PromiseStub,
    nextTick,
    expectFulfilled,
    expectRejected,
    PromiseFactoryStub
};
