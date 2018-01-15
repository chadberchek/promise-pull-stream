'use strict';

const buffer = require('../lib/buffer');
const {DONE} = require('../lib/base');
const {AssertionError} = require('assert');
const {rejected, PromiseFactoryStub} = require('./test-utils');

describe('buffer', () => {
    it('requires buffer size greater than 0', () => {
        buffer(1);
        buffer(2);
        expect(()=>buffer(0)).toThrow(jasmine.any(AssertionError));
    });

    it('passes fulfilled and rejected promises through', async () => {
        const upstream = new PromiseFactoryStub(3);

        const bpf = buffer(2)(upstream.promiseFactory);

        upstream.resolve(0, 'a');
        expect(await bpf()).toBe('a');
        upstream.reject(1, 'b');
        expect(await rejected(bpf())).toBe('b');
        upstream.resolve(2, 'c');
        expect(await bpf()).toBe('c');
        expect(await rejected(bpf())).toBe(DONE);
    });

    it('does not call upstream until first called once', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();

        const bpf = buffer(2)(upstream.promiseFactory);

        await upstream.expectTimesCalled(0);
    });

    it('speculatively calls upstream to fill buffer', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();

        const bpf = buffer(2)(upstream.promiseFactory);

        bpf();
        await upstream.expectTimesCalled(3);
    });

    it('does not call upstream in parallel', async () => {
        const upstream = new PromiseFactoryStub(3);

        const bpf = buffer(2)(upstream.promiseFactory);

        bpf();
        await upstream.expectTimesCalled(1);
        upstream.resolve(0, 'a');
        await upstream.expectTimesCalled(2);
    });

    it('speculatively calls upstream to fill buffer when upstream promise rejected', async () => {
        const upstream = new PromiseFactoryStub(3);
        upstream.rejectAll();

        const bpf = buffer(2)(upstream.promiseFactory);
        
        bpf();
        await upstream.expectTimesCalled(3);
    });
});
