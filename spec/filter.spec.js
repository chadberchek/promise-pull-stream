'use strict';

const {DONE} = require('../lib/base');
const filter = require('../lib/filter');
const {PromiseFactoryStub, rejected} = require('./testUtils');

describe('filter', () => {
    it('passes through resolved promises when filter function truthy', async () => {
        const up = new PromiseFactoryStub(2);
        const filtered = filter(() => true)(up.promiseFactory);

        up.resolve(0, 'a');
        expect(await filtered()).toBe('a');
        up.resolve(1, 'b');
        expect(await filtered()).toBe('b');
    });

    it('passes resolved values to filter function', done => {
        const up = () => Promise.resolve('a');
        const filtered = filter(x => {
            expect(x).toBe('a');
            done();
            return true;
        })(up);

        filtered();
    });

    it('does not fulfill its promise if filter function returns falsey', () => {
        const up = new PromiseFactoryStub(1);
        up.resolve(0, 'a');
        const filtered = filter(() => false)(up.promiseFactory);

        filtered().then(
            () => fail('Promise should not have been fulfilled'),
            () => {}
        );
    });

    it('calls upstream until filter function truthy for fulfilled upstream value', async () => {
        const up = new PromiseFactoryStub(4);
        up.resolveAll();
        const filtered = filter(x => x === 0 || x === 3)(up.promiseFactory);

        expect(await filtered()).toBe(0);
        expect(await filtered()).toBe(3);
    });

    it('does not call upstream until called', async () => {
        const up = new PromiseFactoryStub(3);
        const filtered = filter(x => x !== 'b')(up.promiseFactory);

        await up.expectTimesCalled(0);
        
        let p = filtered();
        await up.expectTimesCalled(1);
        up.resolve(0, 'a');
        expect(await p).toBe('a');
        await up.expectTimesCalled(1);
        
        p = filtered();
        await up.expectTimesCalled(2);
        up.resolve(1, 'b'); // filter function returns false
        await up.expectTimesCalled(3); // so automatically call upstream again
        up.resolve(2, 'c');
        expect(await p).toBe('c');
        await up.expectTimesCalled(3);
    });

    it('does not invoke the fulfilled filter for rejected upstream promise', () => {
        const up = new PromiseFactoryStub(1);
        const filtered = filter(
            () => fail('Fulfilled filter should not have been called'))
            (up.promiseFactory);

        up.reject(0, 'a');
        filtered().catch(()=>{});
    });

    it('recognizes truthy fulfilled filter results other than true', async () => {
        const up = new PromiseFactoryStub(3);
        up.resolveAll();
        const filtered = filter(x => [1, 't', {}][x])(up.promiseFactory);

        expect(await filtered()).toBe(0);
        expect(await filtered()).toBe(1);
        expect(await filtered()).toBe(2);
    });

    it('recognizes falsy fulfilled filter results other than false', async () => {
        const up = new PromiseFactoryStub(3);
        up.resolveAll();
        const filtered = filter(x => [0, null, undefined][x])(up.promiseFactory);

        expect(await rejected(filtered())).toBe(DONE);
    });

    it('passes through all fulfilled upstream promises if fulfilled filter is not a function', async () => {
        const up = () => Promise.resolve(1);

        expect(await filter()(up)()).toBe(1);
        expect(await filter(null)(up)()).toBe(1);
        expect(await filter(1)(up)()).toBe(1);
    });

    it('rejects its promise if fulfilled filter throws an exception', async () => {
        const up = () => Promise.resolve(1);
        const filtered = filter(() => {throw 'x';})(up);

        expect(await rejected(filtered())).toBe('x');
    });

    it('only passes through rejected upstream promises if rejected filter returns truthy', async () => {
        const up = new PromiseFactoryStub(4);
        up.rejectAll();
        const filtered = filter(null, x => x === 0 || x === 3)(up.promiseFactory);

        expect(await rejected(filtered())).toBe(0);
        expect(await rejected(filtered())).toBe(3);
    });

    it('passes through all rejected upstream promises if rejected filter is not a function', async () => {
        const up = () => Promise.reject(1);
        
        expect(await rejected(filter(null)(up)())).toBe(1);
        expect(await rejected(filter(null, null)(up)())).toBe(1);
        expect(await rejected(filter(null, 1)(up)())).toBe(1);
    });

    it('recognizes truthy rejected filter results other than true', async () => {
        const up = new PromiseFactoryStub(3);
        up.rejectAll();
        const filtered = filter(null, x => [1, 't', {}][x])(up.promiseFactory);

        expect(await rejected(filtered())).toBe(0);
        expect(await rejected(filtered())).toBe(1);
        expect(await rejected(filtered())).toBe(2);        
    });

    it('recognizes falsy rejected filter results other than false', async () => {
        const up = new PromiseFactoryStub(3);
        up.rejectAll();
        const filtered = filter(null, x => [0, null, undefined][x])(up.promiseFactory);

        expect(await rejected(filtered())).toBe(DONE);
    });

    it('passes through DONE without calling rejected filter', async () => {
        const up = new PromiseFactoryStub(0);
        const filtered = filter(null, () => {
            fail('Rejected filter should not have been called');
            return true;
        })(up.promiseFactory);

        expect(await rejected(filtered())).toBe(DONE);
    });
});
