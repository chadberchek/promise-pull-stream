'use strict';

const flatten = require('../lib/flatten-iterable');
const {DONE} = require('../lib/base');
const {PromiseFactoryStub, rejected} = require('./testUtils');

describe('flatten-iterable', () => {
    it('returns elements from an array one at a time starting from index 0', async () => {
        const upstream = new PromiseFactoryStub(1);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, ['a', 'b']);
        expect(await f()).toBe('a');
        expect(await f()).toBe('b');
    });

    it('does not invoke upstream promise factory until called', async () => {
        const upstream = new PromiseFactoryStub(1);
        const f = flatten(upstream.promiseFactory);
        await upstream.expectPendingPromises(0);
    });

    it('gets another array from upstream after exhausting the first array', async () => {
        const upstream = new PromiseFactoryStub(2);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, ['a', 'b']);
        expect(await f()).toBe('a');
        expect(await f()).toBe('b');
        upstream.resolve(1, ['c', 'd']);
        expect(await f()).toBe('c');
        expect(await f()).toBe('d');
        expect(await rejected(f())).toBe(DONE);
    });

    it('does not speculatively call upstream after exhausting first array', async () => {
        const upstream = new PromiseFactoryStub(2);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, ['a']);
        expect(await f()).toBe('a');
        await upstream.expectPendingPromises(0);
    });

    it('keeps calling upstream until it gets a non-empty array', async () => {
        const upstream = new PromiseFactoryStub(2);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, []);
        upstream.resolve(1, ['a', 'b']);
        expect(await f()).toBe('a');
        expect(await f()).toBe('b');
    });

    it('passes through rejections', async () => {
        const upstream = new PromiseFactoryStub(2);
        const f = flatten(upstream.promiseFactory);

        upstream.reject(0, 'a');
        expect(await rejected(f())).toBe('a');
        upstream.resolve(1, ['b']);
        expect(await f()).toBe('b');
        expect(await rejected(f())).toBe(DONE);
    });

    it('handles multiple arrays and multiple empty arrays', async () => {
        const upstream = new PromiseFactoryStub(7);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, []);
        upstream.resolve(1, []);
        upstream.resolve(2, ['a', 'b']);
        upstream.resolve(3, ['c', 'd']);
        upstream.resolve(4, []);
        upstream.resolve(5, []);
        upstream.resolve(6, ['e', 'f']);
        
        expect(await f()).toBe('a');
        expect(await f()).toBe('b');
        expect(await f()).toBe('c');
        expect(await f()).toBe('d');
        expect(await f()).toBe('e');
        expect(await f()).toBe('f');
        expect(await rejected(f())).toBe(DONE);
    });

    it('handles rejection between empty arrays', async () => {
        const upstream = new PromiseFactoryStub(4);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, []);
        upstream.reject(1, 'a');
        upstream.resolve(2, []);
        upstream.resolve(3, ['b', 'c']);

        expect(await rejected(f())).toBe('a');
        expect(await f()).toBe('b');
        expect(await f()).toBe('c');
    });

    it('works with iterables other than array', async () => {
        const upstream = new PromiseFactoryStub(3);
        const f = flatten(upstream.promiseFactory);

        upstream.resolve(0, new Set(['a', 'b']));
        upstream.resolve(1, new Set());
        upstream.resolve(2, new Set(['c', 'd']));

        expect(await f()).toBe('a');
        expect(await f()).toBe('b');
        expect(await f()).toBe('c');
        expect(await f()).toBe('d');
        expect(await rejected(f())).toBe(DONE);
    });
});
