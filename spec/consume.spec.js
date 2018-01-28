'use strict';

const consume = require('../lib/consume');
const {DONE} = require('../lib/base');
const {PromiseFactoryStub, nextTick, rejected} = require('./test-utils');
const Deferred = require('../lib/deferred');

describe('consume', () => {
    it('invokes the promise factory sequentially until DONE', async () => {
        const upstream = new PromiseFactoryStub(2);
        
        consume(upstream.promiseFactory);

        expect(upstream.timesCalled).toBe(1);
        upstream.resolve(0, 'a');
        await nextTick();
        expect(upstream.timesCalled).toBe(2);
        upstream.resolve(1, 'b');
        await nextTick();
        expect(upstream.timesCalled).toBe(3);
    });

    it('returns a promise that is fulfilled when promise factory is done', async () => {
        const donePromise = new Deferred();
        const pf = () => donePromise.promise;

        let consumePromiseFulfilled = false;
        const p = consume(pf).then(x => {
            expect(x).toBeUndefined();
            consumePromiseFulfilled = true;    
        });
        await nextTick();
        expect(consumePromiseFulfilled).toBeFalsy();
        donePromise.reject(DONE);
        await p;
    });

    it('rejects its promise if the promise factory produces a rejected promise other than DONE', async () => {
        const upstream = new PromiseFactoryStub(1);
        upstream.reject(0, 'a');

        expect(await rejected(consume(upstream.promiseFactory))).toBe('a');
        expect(upstream.timesCalled).toBe(1); // don't keep calling promise factory after rejection
    });
});
