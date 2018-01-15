'use strict';

const then = require('../lib/then');
const {PromiseFactoryStub, rejected, InvertedPromise} = require('./test-utils');

describe('then', () => {
    it('calls upstream and adds handler on returned promise', async () => {
        const upstream = new PromiseFactoryStub(1);
        const promiseFactoryWithThen = then(x => x + 'W')(upstream.promiseFactory);
        upstream.resolve(0, 'a');
        expect(await promiseFactoryWithThen()).toBe('aW');
    });

    it('adds fulfilled and rejected handlers if provided', async () => {
        const upstream = new PromiseFactoryStub(3);
        const pfThen = then(
            x => x + 'Fulfilled',
            x => x + 'Rejected'
        )(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        upstream.reject(1, 'b');
        upstream.resolve(2, 'c');

        expect(await pfThen()).toBe('aFulfilled');
        expect(await pfThen()).toBe('bRejected');
        expect(await pfThen()).toBe('cFulfilled');
    });

    it('produces rejected promise if handler throws', async () => {
        const upstream = new PromiseFactoryStub(1);
        const pfThen = then(x => { throw x; })(upstream.promiseFactory);
        upstream.resolve(0, 'a');
        expect(await rejected(pfThen())).toBe('a');
    });

    it('produces promise that follows promise returned by handler', async () => {
        const promiseFromHandler = new InvertedPromise();
        const upstream = () => Promise.resolve('a');
        const pfThen = then(() => promiseFromHandler.promise)(upstream);
        const p = pfThen();
        promiseFromHandler.resolve('j');
        expect(await p).toBe('j');
    });

    it('passes rejection through if no rejection handler provided', async () => {
        const upstream = () => Promise.reject('a');
        const pfThen = then(()=>{})(upstream);
        expect(await rejected(pfThen())).toBe('a');
    });
});
