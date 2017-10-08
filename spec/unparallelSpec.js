'use strict';

const unparallel = require('../lib/unparallel');
const {DONE} = require('../lib/base');
const {AssertionError} = require('assert');
const {rejected, PromiseFactoryStub} = require('./testUtils');

describe('unparallel', () => {
    it('passes fulfilled and rejected promises through', async () => {
        const upstream = new PromiseFactoryStub(3);

        const pf = unparallel(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        expect(await pf()).toBe('a');
        upstream.reject(1, 'b');
        expect(await rejected(pf())).toBe('b');
        upstream.resolve(2, 'c');
        expect(await pf()).toBe('c');
        expect(await rejected(pf())).toBe(DONE);
    });

    it('can be called in parallel but prevents upstream being called in parallel', async () => {
        const upstream = new PromiseFactoryStub(2);

        const pf = unparallel(upstream.promiseFactory);

        const p0 = pf();
        const p1 = pf();
        await upstream.expectPendingPromises(1);
        upstream.resolve(0, 'a');
        expect(await p0).toBe('a');
        await upstream.expectPendingPromises(1);
        upstream.reject(1, 'b');
        expect(await rejected(p1)).toBe('b');
    });

    it('fulfills promises in same order as upstream produced them', async () => {
        const upstream = new PromiseFactoryStub(2);
        
        const pf = unparallel(upstream.promiseFactory);

        const p0 = pf();
        const p1 = pf();
        upstream.resolve(0, 'a');
        upstream.resolve(1, 'b');
        expect(await p0).toBe('a');
        expect(await p1).toBe('b');
    });
    
    it('rejects promises in same order as upstream produced them', async () => {
        const upstream = new PromiseFactoryStub(2);
        
        const pf = unparallel(upstream.promiseFactory);

        const p0 = pf();
        const p1 = pf();
        upstream.reject(0, 'a');
        upstream.reject(1, 'b');
        expect(await rejected(p0)).toBe('a');
        expect(await rejected(p1)).toBe('b');
    });
});
