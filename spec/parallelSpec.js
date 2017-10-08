'use strict';

const parallel = require('../lib/parallel');
const {DONE} = require('../lib/base');
const {AssertionError} = require('assert');
const {expectFulfilled, expectRejected, PromiseFactoryStub} = require('./testUtils');

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

        const ppf = parallel(0, 1, upstream.promiseFactory);

        upstream.resolve(0);
        await expectFulfilled(ppf(), upstream.fulfilledValue(0));
        upstream.resolve(1);
        await expectFulfilled(ppf(), upstream.fulfilledValue(1));
        await expectRejected(ppf(), DONE);
    });

    it('continues working after an upstream promise is rejected', async () => {
        const upstream = new PromiseFactoryStub(2);

        const ppf = parallel(0, 1, upstream.promiseFactory);

        upstream.reject(0);
        upstream.resolve(1);

        await expectRejected(ppf(), upstream.rejectedReason(0));
        await expectFulfilled(ppf(), upstream.fulfilledValue(1));
    });

    it('does not execute upstream factory until called', async () => {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolveAll();

        const ppf = parallel(0, 1, upstream.promiseFactory);

        await upstream.expectTimesCalled(0);
        ppf();
        await upstream.expectTimesCalled(1);
    });

    it('speculatively executes upstream factory to fill buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();
        const bufferSize = 2;

        const ppf = parallel(bufferSize, 1, upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(bufferSize + 1); // 1 is returned by the initial call
    });

    it('returns promises from the buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();
        
        const ppf = parallel(2, 1, upstream.promiseFactory);

        await expectFulfilled(ppf(), upstream.fulfilledValue(0));
        await upstream.expectTimesCalled(3);
        await expectFulfilled(ppf(), upstream.fulfilledValue(1));
        await expectFulfilled(ppf(), upstream.fulfilledValue(2));
        await expectRejected(ppf(), DONE);
    });

    it('can pass resolved and rejected promises through the buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolve(0);
        upstream.reject(1);
        upstream.resolve(2);
        
        const ppf = parallel(2, 1, upstream.promiseFactory);

        await expectFulfilled(ppf(), upstream.fulfilledValue(0));
        await expectRejected(ppf(), upstream.rejectedReason(1));
        await expectFulfilled(ppf(), upstream.fulfilledValue(2));
        await expectRejected(ppf(), DONE);
    });

    it('does not execute upstream operation in parallel if max parallel is 1', async () => {
        const upstream = new PromiseFactoryStub(3);

        const ppf = parallel(1, 1, upstream.promiseFactory);

        const p = ppf();
        await upstream.expectTimesCalled(1);
        upstream.resolve(0);
        await expectFulfilled(p, upstream.fulfilledValue(0));
        await upstream.expectTimesCalled(2);
    });

    it('continues filling buffer when upstream promise rejects', async () => {
        const upstream = new PromiseFactoryStub(1);

        const ppf = parallel(1, 1, upstream.promiseFactory);

        const p = ppf();
        await upstream.expectTimesCalled(1);
        upstream.reject(0);
        await expectRejected(p, upstream.rejectedReason(0));
        await upstream.expectTimesCalled(2);
    });

    it('fills buffer and respects buffer bounds when promises are rejected', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.rejectAll();

        const ppf = parallel(2, 1, upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(3);
    });

    it('keeps the buffer filled as promises are returned', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();

        const ppf = parallel(1, 1, upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(2);
        ppf();
        await upstream.expectTimesCalled(3);
    });

    it('starts specified number of parallel upstream operations', async () => {
        const upstream = new PromiseFactoryStub(3);
        
        const ppf = parallel(2, 2, upstream.promiseFactory);

        ppf();
        await upstream.expectTimesCalled(2);
    });

    it('limits number of parallel operations when called repeatedly', async () => {
        const upstream = new PromiseFactoryStub(3);
        
        const ppf = parallel(2, 2, upstream.promiseFactory);

        const p0 = ppf();
        await upstream.expectTimesCalled(2);
        upstream.resolve(0);
        await expectFulfilled(p0, upstream.fulfilledValue(0));
        const p1 = ppf();
        await upstream.expectTimesCalled(3);
    });

    it('limits additional calls to avoid overflowing buffer', async () => {
        const upstream = new PromiseFactoryStub(4);
        upstream.resolveAll();

        const ppf = parallel(2, 2, upstream.promiseFactory);

        await expectFulfilled(ppf(), upstream.fulfilledValue(0));
        await upstream.expectTimesCalled(3);
        await expectFulfilled(ppf(), upstream.fulfilledValue(1));
        await upstream.expectTimesCalled(4);
    });

    it('can be called in parallel up to the max parallel operations limit', async () => {
        const upstream = new PromiseFactoryStub(2);

        const ppf = parallel(2, 2, upstream.promiseFactory);

        const p0 = ppf();
        const p1 = ppf();
        await upstream.expectTimesCalled(2);
        upstream.resolve(0);
        upstream.resolve(1);
        await expectFulfilled(p0, upstream.fulfilledValue(0));
        await expectFulfilled(p1, upstream.fulfilledValue(1));
    });

    it('returns rejected promise if called in parallel beyond the limit', async () => {
        const upstream = new PromiseFactoryStub(3);

        const ppf = parallel(2, 2, upstream.promiseFactory);

        const p0 = ppf();
        const p1 = ppf();
        const p2 = ppf();
        await upstream.expectTimesCalled(2);
        await expectRejected
        try {
            const v = await p2;
            fail(`expected error about too many parallel operations; got fulfilled ${String(v)}`);
        } catch (e) {
            expect(e).toEqual(jasmine.any(AssertionError));
        }
    });
});
