'use strict';

const batch = require('../lib/batch');
const {DONE} = require('../lib/base');
const {PromiseFactoryStub, rejected} = require('./testUtils');
const {AssertionError} = require('assert');

describe('batch', () => {
    it('requires a batch size greater than 0', () => {
        expect(() => batch(0)).toThrowError(AssertionError);
        expect(() => batch(-1)).toThrowError(AssertionError);
    });

    it('does not call upstream until called', async () => {
        const up = new PromiseFactoryStub(1);
        const batched = batch(1)(up.promiseFactory);

        await up.expectTimesCalled(0);
        batched();
        await up.expectTimesCalled(1);
    });

    it('fulfills its promise only after batch size values have been collected', async () => {
        const up = new PromiseFactoryStub(3);        
        up.resolveAll();
        const batched = batch(2)(up.promiseFactory);

        expect(await batched()).toEqual([0, 1]);
    });

    it('calls upstream sequentially not in parallel', async () => {
        const up = new PromiseFactoryStub(2);
        const batched = batch(2)(up.promiseFactory);

        batched();
        await up.expectTimesCalled(1);
        up.resolve(0, 'a');
        await up.expectTimesCalled(2);
    });
    
    it('fulfills its promise with the current batch when upstream DONE', async () => {
        const up = new PromiseFactoryStub(2);
        up.resolveAll();
        const batched = batch(3)(up.promiseFactory);
        
        expect(await batched()).toEqual([0, 1]);
    });

    it('rejects with DONE on next call after fulfilling partial batch when upstream DONE', async () => {
        const up = new PromiseFactoryStub(1);
        const batched = batch(2)(up.promiseFactory);
        up.resolve(0, 'a');

        expect(await batched()).toEqual(['a']);
        expect(await rejected(batched())).toBe(DONE);
    });
    
    it('can produce multiple separate batches', async () => {
        const up = new PromiseFactoryStub(5);
        up.resolveAll();
        const batched = batch(2)(up.promiseFactory);

        expect(await batched()).toEqual([0, 1]);
        expect(await batched()).toEqual([2, 3]);
        expect(await batched()).toEqual([4]);
    });

    it('produces independent promise factories', async () => {
        const up0 = new PromiseFactoryStub(2);
        const up1 = new PromiseFactoryStub(2);

        const batchByTwo = batch(2);
        const b0 = batchByTwo(up0.promiseFactory);
        const b1 = batchByTwo(up1.promiseFactory);

        up0.resolve(0, 'a');
        up1.resolve(0, 'b');
        up0.resolve(1, 'c');
        up1.resolve(1, 'd');
        const p0 = b0();
        const p1 = b1();

        expect(await p0).toEqual(['a', 'c']);
        expect(await p1).toEqual(['b', 'd']);
    });

    it('passes through DONE on first upstream call', async () => {
        const up = new PromiseFactoryStub(0);
        const batched = batch(2)(up.promiseFactory);

        expect(await rejected(batched())).toBe(DONE);
    });

    it('passes through DONE if current batch is empty', async () => {
        const up = new PromiseFactoryStub(2);
        up.resolveAll();
        const batched = batch(2)(up.promiseFactory);

        expect(await batched()).toEqual([0, 1]);
        expect(await rejected(batched())).toBe(DONE);
    });

    it('passes through rejections other than DONE and continues building batch afterward', async () => {
        const up = new PromiseFactoryStub(5);
        const batched = batch(3)(up.promiseFactory);

        up.resolve(0, 'a');
        up.reject(1, 'b');
        up.resolve(2, 'c');
        up.reject(3, 'd');
        up.resolve(4, 'e');

        expect(await rejected(batched())).toBe('b');
        expect(await rejected(batched())).toBe('d');
        expect(await batched()).toEqual(['a', 'c', 'e']);
    });

    it('fulfills its promise with partial batch if last upstream before DONE was rejected', async () => {
        const up = new PromiseFactoryStub(3);
        const batched = batch(3)(up.promiseFactory);

        up.resolve(0, 'a');
        up.resolve(1, 'b');
        up.reject(2, 'c');

        expect(await rejected(batched())).toBe('c');
        expect(await batched()).toEqual(['a', 'b']);
        expect(await rejected(batched())).toBe(DONE);
    });
});
