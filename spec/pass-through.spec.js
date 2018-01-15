'use strict';

const passThrough = require('../lib/pass-through');
const {PromiseFactoryStub, rejected, expectNotFulfilled} = require('./test-utils');

describe('pass-through', () => {
    it('calls the handler with upstream fulfilled values', async () => {
        const up = new PromiseFactoryStub(2);
        const onFulfilled = jasmine.createSpy('onFulfilled');
        const pt = passThrough(onFulfilled)(up.promiseFactory);
        up.resolve(0, 'a');
        up.resolve(1, 'b');
        await pt();
        await pt();
        expect(onFulfilled.calls.allArgs()).toEqual([['a'], ['b']]);
    });

    it('returns a promise that fulfills with the upstream value when handler does not return promise', async () => {
        const up = new PromiseFactoryStub(2);
        const pt = passThrough(() => 0)(up.promiseFactory);
        up.resolve(0, 'a');
        up.resolve(1, 'b');
        expect(await pt()).toBe('a');
        expect(await pt()).toBe('b');
    });

    it('only fulfills its promise to upstream value after the handler returned promise is fulfilled', async () => {
        const up = new PromiseFactoryStub(1);
        const handlerPromises = new PromiseFactoryStub(1);
        const pt = passThrough(handlerPromises.promiseFactory)(up.promiseFactory);
        up.resolve(0, 'a');
        const passThroughPromise = pt();
        await expectNotFulfilled(passThroughPromise);
        handlerPromises.resolve(0, 'x');
        expect(await passThroughPromise).toBe('a');
    });

    it('returns rejected promise when upstream rejects without calling fulfilled handler', async () => {
        const up = new PromiseFactoryStub(1);
        const onFulfilled = jasmine.createSpy('onFulfilled');
        const pt = passThrough(onFulfilled)(up.promiseFactory);
        up.reject(0, 'a');
        expect(await rejected(pt())).toBe('a');
        expect(onFulfilled).not.toHaveBeenCalled();
    });

    it('returns rejected promise when fulfilled handler throws', async () => {
        const up = new PromiseFactoryStub(1);
        const pt = passThrough(() => { throw 'oops'; })(up.promiseFactory);
        up.resolve(0, 'a');
        expect(await rejected(pt())).toBe('oops');
    });

    it('returns rejected promise when fulfilled handler returns rejected promise', async () => {
        const up = new PromiseFactoryStub(1);
        const pt = passThrough(() => Promise.reject('oh well'))(up.promiseFactory);
        up.resolve(0, 'a');
        expect(await rejected(pt())).toBe('oh well');
    });
});
