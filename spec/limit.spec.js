'use strict';

const limit = require('../lib/limit');
const {DONE} = require('../lib/base');
const {PromiseFactoryStub, rejected} = require('./test-utils');

describe('limit', () => {
    it('only calls upstream specified number of times and then is DONE', async () => {
        const upstream = new PromiseFactoryStub(3);
        const limited = limit(2)(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        upstream.resolve(1, 'b');
        upstream.resolve(2, 'c');

        expect(await limited()).toBe('a');
        expect(await limited()).toBe('b');
        expect(await rejected(limited())).toBe(DONE);
        await upstream.expectTimesCalled(2);
    });

    it('can be called in parallel', async () => {
        const upstream = new PromiseFactoryStub(3);
        const limited = limit(2)(upstream.promiseFactory);

        const p = [limited(), limited(), limited()];

        upstream.resolve(0, 'a');
        expect(await p[0]).toBe('a');
        upstream.resolve(1, 'b');
        expect(await p[1]).toBe('b');
        upstream.resolve(2, 'c');
        expect(await rejected(p[2])).toBe(DONE);
        await upstream.expectTimesCalled(2);
    });

    it('produces independent promise stream wrappers when called repeatedly', async () => {
        const upstream1 = new PromiseFactoryStub(1);
        const upstream2 = new PromiseFactoryStub(1);
        const once = limit(1);
        const limited1 = once(upstream1.promiseFactory);
        const limited2 = once(upstream2.promiseFactory);

        upstream1.resolve(0, 'a');
        upstream2.resolve(0, 'b');

        expect(await limited1()).toBe('a');
        expect(await rejected(limited1())).toBe(DONE);
        expect(await limited2()).toBe('b');
        expect(await rejected(limited2())).toBe(DONE);
    });
});
