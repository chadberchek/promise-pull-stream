'use strict';

const completedFirst = require('../lib/completedFirst');
const {DONE} = require('../lib/base');
const {rejected, PromiseFactoryStub} = require('./testUtils');

describe('completedFirst', () => {
    it('passes fulfilled and rejected promises through', async () => {
        const upstream = new PromiseFactoryStub(3);

        const pf = completedFirst(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        expect(await pf()).toBe('a');
        upstream.reject(1, 'b');
        expect(await rejected(pf())).toBe('b');
        upstream.resolve(2, 'c');
        expect(await pf()).toBe('c');
        expect(await rejected(pf())).toBe(DONE);
    });

    it('can be called in parallel any number of times but does not speculatively call upstream', async () => {
        const upstream = new PromiseFactoryStub(3);

        const pf = completedFirst(upstream.promiseFactory);

        await upstream.expectPendingPromises(0);
        pf();
        await upstream.expectPendingPromises(1);
        pf();
        await upstream.expectPendingPromises(2);
    });

    it('resolves promises in order upstream promises are fulfilled, not order returned', async () => {
        const upstream = new PromiseFactoryStub(3);

        const pf = completedFirst(upstream.promiseFactory);

        const p = [pf(), pf(), pf()];
        upstream.resolve(1, 'a');
        expect(await p[0]).toBe('a');
        upstream.resolve(2, 'b');
        expect(await p[1]).toBe('b');
        upstream.resolve(0, 'c');
        expect(await p[2]).toBe('c');
    });

    it('rejects promises in order upstream promises are rejected, not order returned', async () => {
        const upstream = new PromiseFactoryStub(3);

        const pf = completedFirst(upstream.promiseFactory);

        const p = [pf(), pf(), pf()];
        upstream.reject(1, 'a');
        expect(await rejected(p[0])).toBe('a');
        upstream.reject(2, 'b');
        expect(await rejected(p[1])).toBe('b');
        upstream.reject(0, 'c');
        expect(await rejected(p[2])).toBe('c');
    });

    it('does not reject DONE until other pending promises settle', async () => {
        const upstream = new PromiseFactoryStub(2);
        
        const pf = completedFirst(upstream.promiseFactory);

        const p = [pf(), pf(), pf()];
        upstream.reject(1, 'a');
        expect(await rejected(p[0])).toBe('a');
        upstream.resolve(0, 'b');
        expect(await p[1]).toBe('b');
        expect(await rejected(p[2])).toBe(DONE);
    });

    it('rejects DONE for all promises once no more upstream are pending', async () => {
        const upstream = new PromiseFactoryStub(1);

        const pf = completedFirst(upstream.promiseFactory);

        const p = [pf(), pf(), pf()];
        upstream.resolve(0, 'a');
        expect(await p[0]).toBe('a');
        expect(await rejected(p[1])).toBe(DONE);
        expect(await rejected(p[2])).toBe(DONE);
    });

    it('rejects DONE for all promises once no more upstream are pending and last one rejected', async () => {
        const upstream = new PromiseFactoryStub(1);

        const pf = completedFirst(upstream.promiseFactory);

        const p = [pf(), pf(), pf()];
        upstream.reject(0, 'a');
        expect(await rejected(p[0])).toBe('a');
        expect(await rejected(p[1])).toBe(DONE);
        expect(await rejected(p[2])).toBe(DONE);
    });

    it('immediately rejects DONE any newly returned promise after previously returned one rejects DONE', async () => {
        const pf = completedFirst(() => Promise.reject(DONE));
        expect(await rejected(pf())).toBe(DONE);
        expect(await rejected(pf())).toBe(DONE);
    });

    it('immediately rejects DONE any newly returned promise after upstream fulfilled one after upstream DONE', async () => {
        const upstream = new PromiseFactoryStub(1);
        const pf = completedFirst(upstream.promiseFactory);
        const p = [pf(), pf()]; // 2 requests get made upstream; second one DONE immediately
        upstream.resolve(0, 'a'); // now 1st upstream promise fulfilled after 2nd already rejected DONE
        expect(await p[0]).toBe('a');
        expect(await rejected(p[1])).toBe(DONE); // get back DONE that occurred before fulfilled
        expect(await rejected(pf())).toBe(DONE); // get back DONE on newly issued promise also
    });
});
