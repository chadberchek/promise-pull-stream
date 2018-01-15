'use strict';

const {DONE} = require('../lib/base');
const {PromiseFactoryStub, rejected, nextTick} = require('./test-utils');
const catcher = require('../lib/catcher');

describe('catcher', () => {
    it('resolves its promises when upstream promises are fulfilled', async () => {
        const upstream = new PromiseFactoryStub(2);
        const c = catcher(() => {})(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        expect(await c()).toBe('a');
        upstream.resolve(1, 'b');
        expect(await c()).toBe('b');
    });

    it('passes through DONE', async () => {
        const upstream = new PromiseFactoryStub(0);
        const c = catcher(() => {})(upstream.promiseFactory);

        expect(await rejected(c())).toBe(DONE);
    });

    it('invokes the catch function when the upstream promise is rejected', async () => {
        const upstream = new PromiseFactoryStub(1);
        let caughtValue;
        const c = catcher(x => caughtValue = x)(upstream.promiseFactory);
        
        c().catch(r => expect(r).toBe(DONE));
        upstream.reject(0, 'a');
        await nextTick();
        expect(caughtValue).toBe('a');
    });

    it('does not invoke the catch function if the upstream promise is fulfilled', async () => {
        const upstream = new PromiseFactoryStub(1);
        const c = catcher(() => fail('Catch function should not have been called'))(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        c();
        await nextTick();
    });

    it('does not call upstream promise factory until called', async () => {
        const upstream = new PromiseFactoryStub(2);
        const c = catcher(() => {})(upstream.promiseFactory);

        expect(upstream.timesCalled).toBe(0);
        c();
        expect(upstream.timesCalled).toBe(1);
        upstream.resolve(0, 'a');
        await nextTick();
        expect(upstream.timesCalled).toBe(1);
        c();
        expect(upstream.timesCalled).toBe(2);
    });

    it('does not fulfill its promise if the catch function returns normally', () => {
        const upstream = new PromiseFactoryStub(1);
        const c = catcher(() => {})(upstream.promiseFactory);

        const p = c().then(
            () => fail('Promise should not have been fulfilled'), 
            r => expect(r).toBe(DONE)
        );
        upstream.reject(0, 'a');
    });

    it('fulfills its promise with the value of the next fulfilled upstream promise after a rejection', async () => {
        const upstream = new PromiseFactoryStub(2);
        const c = catcher(r => expect(r).toBe('a'))(upstream.promiseFactory);

        upstream.reject(0, 'a');
        upstream.resolve(1, 'b');

        expect(await c()).toBe('b');
    });

    it('rejects its promise if the catch function throws', async () => {
        const upstream = new PromiseFactoryStub(1);
        const c = catcher(() => {throw 'b';})(upstream.promiseFactory);

        upstream.reject(0, 'a');
        expect(await rejected(c())).toBe('b');
    });

    it('does not pass through the rejected promise regardless of the catcher function return value', async () => {
        const upstream = new PromiseFactoryStub(1);
        upstream.rejectAll();
        const c = catcher(() => true)(upstream.promiseFactory);

        expect(await rejected(c())).toBe(DONE);
    });
});
