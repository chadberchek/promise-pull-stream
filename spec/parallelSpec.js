'use strict';

const parallel = require('../lib/parallel');
const {DONE} = require('../lib/base');
const {AssertionError} = require('assert');
const {rejected, PromiseFactoryStub} = require('./testUtils');

describe('parallel promise factory', () => {
    describe('factory', () => {
        it('requires a non-negative buffer size', () => {
            parallel(0, 1, () => Promise.reject(DONE));
            parallel(5, 1, () => Promise.reject(DONE));
            expect(() => parallel(-1, 1, () => Promise.reject(DONE))).toThrowError(AssertionError);
        });

        it('requires positive max number of parallel operations', () => {
            parallel(0, 1, () => Promise.reject(DONE));
            parallel(0, 5, () => Promise.reject(DONE));
            expect(() => parallel(0, 0, () => Promise.reject(DONE))).toThrowError(AssertionError);
        });
    });

    it('returns promises that resolve when those returned by the upstream promise factory resolve', async () => {
        const upstream = new PromiseFactoryStub(2);

        const ppf = parallel(0, 1)(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        expect(await ppf()).toBe('a');
        upstream.resolve(1, 'b');
        expect(await ppf()).toBe('b');
        expect(await rejected(ppf())).toBe(DONE);
    });

    it('continues working after an upstream promise is rejected', async () => {
        const upstream = new PromiseFactoryStub(2);

        const ppf = parallel(0, 1)(upstream.promiseFactory);

        upstream.reject(0, 'a');
        upstream.resolve(1, 'b');

        expect(await rejected(ppf())).toBe('a');
        expect(await ppf()).toBe('b');
    });

    it('does not execute upstream factory until called', async () => {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolveAll();

        const ppf = parallel(0, 1)(upstream.promiseFactory);

        await upstream.expectTimesCalled(0);
        ppf();
        await upstream.expectTimesCalled(1);
    });

    it('speculatively executes upstream factory to fill buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();
        const bufferSize = 2;

        const ppf = parallel(bufferSize, 1)(upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(bufferSize + 1); // 1 is returned by the initial call
    });

    it('returns promises from the buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();
        
        const ppf = parallel(2, 1)(upstream.promiseFactory);

        expect(await ppf()).toBe(0);
        await upstream.expectTimesCalled(3);
        expect(await ppf()).toBe(1);
        expect(await ppf()).toBe(2);
        expect(await rejected(ppf())).toBe(DONE);
    });

    it('can pass resolved and rejected promises through the buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolve(0, 'a');
        upstream.reject(1, 'b');
        upstream.resolve(2, 'c');
        
        const ppf = parallel(2, 1)(upstream.promiseFactory);

        expect(await ppf()).toBe('a');
        expect(await rejected(ppf())).toBe('b');
        expect(await ppf()).toBe('c');
        expect(await rejected(ppf())).toBe(DONE);
    });

    it('does not execute upstream operation in parallel if max parallel is 1', async () => {
        const upstream = new PromiseFactoryStub(3);

        const ppf = parallel(1, 1)(upstream.promiseFactory);

        const p = ppf();
        await upstream.expectTimesCalled(1);
        upstream.resolve(0, 'a');
        expect(await p).toBe('a');
        await upstream.expectTimesCalled(2);
    });

    it('continues filling buffer when upstream promise rejects', async () => {
        const upstream = new PromiseFactoryStub(1);

        const ppf = parallel(1, 1)(upstream.promiseFactory);

        const p = ppf();
        await upstream.expectTimesCalled(1);
        upstream.reject(0, 'a');
        expect(await rejected(p)).toBe('a');
        await upstream.expectTimesCalled(2);
    });

    it('fills buffer and respects buffer bounds when promises are rejected', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.rejectAll();

        const ppf = parallel(2, 1)(upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(3);
    });

    it('keeps the buffer filled as promises are returned', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();

        const ppf = parallel(1, 1)(upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(2);
        ppf();
        await upstream.expectTimesCalled(3);
    });

    it('starts specified number of parallel upstream operations', async () => {
        const upstream = new PromiseFactoryStub(3);
        
        const ppf = parallel(2, 2)(upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(2);
    });

    it('limits number of parallel operations when called repeatedly', async () => {
        const upstream = new PromiseFactoryStub(3);
        
        const ppf = parallel(2, 2)(upstream.promiseFactory);

        const p0 = ppf();
        await upstream.expectTimesCalled(2);
        upstream.resolve(0, 'a');
        expect(await p0).toBe('a');
        const p1 = ppf();
        await upstream.expectTimesCalled(3);
    });

    it('limits additional calls to avoid overflowing buffer', async () => {
        const upstream = new PromiseFactoryStub(4);
        upstream.resolve(0, 'a');
        upstream.resolve(1, 'b');

        const ppf = parallel(2, 2)(upstream.promiseFactory);

        expect(await ppf()).toBe('a');
        await upstream.expectTimesCalled(3);
        expect(await ppf()).toBe('b');
        await upstream.expectTimesCalled(4);
    });

    it('can be called in parallel up to the max parallel operations limit', async () => {
        const upstream = new PromiseFactoryStub(2);

        const ppf = parallel(2, 2)(upstream.promiseFactory);

        const p0 = ppf();
        const p1 = ppf();
        await upstream.expectTimesCalled(2);
        upstream.resolve(0, 'q');
        upstream.resolve(1, 'w');
        expect(await p0).toBe('q');
        expect(await p1).toBe('w');
    });

    it('returns rejected promise if called in parallel beyond the limit', async () => {
        const upstream = new PromiseFactoryStub(3);

        const ppf = parallel(2, 2)(upstream.promiseFactory);

        const p0 = ppf();
        const p1 = ppf();
        const p2 = ppf();
        await upstream.expectTimesCalled(2);
        expect(await rejected(p2)).toEqual(jasmine.any(AssertionError));
    });

    it('multiple parallel factories are independent', async () => {
        const up0 = new PromiseFactoryStub(1);
        up0.resolve(0, 'a');
        const up1 = new PromiseFactoryStub(1);
        up1.resolve(0, 'b');

        const parallelWrapperFactory = parallel(1, 1);
        const ppf0 = parallelWrapperFactory(up0.promiseFactory);
        const ppf1 = parallelWrapperFactory(up1.promiseFactory);

        expect(await ppf0()).toBe('a');
        expect(await ppf1()).toBe('b');
    });
});
