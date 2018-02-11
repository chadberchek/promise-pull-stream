'use strict';

const {PromiseFactoryStub, rejected} = require('./test-utils');
const Deferred = require('../lib/deferred');
const {DONE} = require('../lib/base');
const tryMap = require('../lib/try-map');
const {AssertionError} = require('assert');

function nop() {
}

describe('tryMap', function() {
    it('calls upstream and maps the result to a new promise', async function() {
        const upstream = new PromiseFactoryStub(1);
        const mapped = tryMap(x => x + "b", nop)(upstream.promiseFactory);
        upstream.resolve(0, 'a');
        expect(await mapped()).toBe('ab');
    });

    it('returns a promise that follows a promise returned by the mapping function', async function() {
        const upstream = () => Promise.resolve('a');
        const deferred = new Deferred();
        const mapped = tryMap(_=> deferred.promise, nop)(upstream);
        const promise = mapped();
        deferred.resolve('b');
        expect(await promise).toBe('b');
    });

    it('does not invoke upstream until called', async function() {
        const upstream = new PromiseFactoryStub(0);
        tryMap(x => x, nop)(upstream.promiseFactory);
        await upstream.expectTimesCalled(0);
    });

    it('passes through rejected upstream promises without calling mapping or catch functions', async function() {
        const upstream = new PromiseFactoryStub(1);
        const mapped = tryMap(_=> fail("Should not have called mapping function"), 
            _=> fail("Should not have called catch function"))(upstream.promiseFactory);
        upstream.reject(0, 'a');
        expect(await rejected(mapped())).toBe('a');
    });

    it('calls catch function if mapping function throws an exception', async function() {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolve(0, 'a');
        let caughtValue, upstreamValue;
        const mapped = tryMap(
            _=> {throw 'b'}, 
            (e, v) => {
                caughtValue = e;
                upstreamValue = v;
            }
        )(upstream.promiseFactory);
        expect(await rejected(mapped())).toBe(DONE);
        expect(caughtValue).toBe('b');
        expect(upstreamValue).toBe('a');
    });

    it('calls catch function if mapping function returns rejected promise', async function() {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolve(0, 'a');
        let caughtValue, upstreamValue;
        const mapped = tryMap(
            _=> Promise.reject('b'),
            (e, v) => {
                caughtValue = e;
                upstreamValue = v;
            }
        )(upstream.promiseFactory);
        expect(await rejected(mapped())).toBe(DONE);
        expect(caughtValue).toBe('b');
        expect(upstreamValue).toBe('a');
    });

    it('calls upstream to get another value after catching', async function() {
        const upstream = new PromiseFactoryStub(2);
        upstream.resolve(0, 'a');
        upstream.resolve(1, 'b');
        const mapped = tryMap(
            x => {
                if (x === 'a') throw 'c';
                return x + 'd';
            },
            nop
        )(upstream.promiseFactory);
        expect(await mapped()).toBe('bd');
    });

    it('returns rejected promise if catch function throws', async function() {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolveAll();
        const mapped = tryMap(_=> Promise.reject('b'), _=> {throw 'c'})(upstream.promiseFactory);
        expect(await rejected(mapped())).toBe('c');
        await upstream.expectTimesCalled(1);
    });

    it('returns rejected promise if catch function returns rejected promise', async function() {
        const upstream = new PromiseFactoryStub(1);
        upstream.resolveAll();
        const mapped = tryMap(_=> Promise.reject('b'), _=> Promise.reject('c'))(upstream.promiseFactory);
        expect(await rejected(mapped())).toBe('c');
        await upstream.expectTimesCalled(1);
    });

    it('waits for promise returned by catch function to fulfill before calling upstream again', async function() {
        const upstream = new PromiseFactoryStub(2);
        upstream.resolveAll();
        const deferredCatchResult = new Deferred();
        const mapped = tryMap(_=> Promise.reject('a'), _=> deferredCatchResult.promise)(upstream.promiseFactory);
        mapped();
        await upstream.expectTimesCalled(1);
    });

    it('rejects promise after max tries', async function() {
        const upstream = new PromiseFactoryStub(3);
        upstream.resolveAll();
        let rejectCounter = 0;
        const mapped = tryMap(_=> Promise.reject(++rejectCounter), nop, 3)(upstream.promiseFactory);
        expect(await rejected(mapped())).toBe(3);
    });

    it('calls catch function for last error after max tries', async function() {
        const upstream = () => Promise.resolve();
        const catcher = jasmine.createSpy('catcher');
        const mapped = tryMap(_=> Promise.reject(), catcher, 1)(upstream);
        await rejected(mapped());
        expect(catcher).toHaveBeenCalledTimes(1);
    });

    it('resets the error count after map function is called successfully', async function() {
        const upstream = new PromiseFactoryStub(4);
        upstream.resolveAll();
        const mapFunction = jasmine.createSpy('mapFunction').and.returnValues(
            Promise.reject('err0'), 
            Promise.resolve('value1'), 
            Promise.reject('err2'), 
            Promise.resolve('value3')
        );
        const mapped = tryMap(mapFunction, nop, 2)(upstream.promiseFactory);
        expect(await mapped()).toBe('value1');
        expect(await mapped()).toBe('value3');
    });

    it('requires maxConsecutiveErrors to be at least 1 if specified', function() {
        expect(() => tryMap(nop, nop, 0)).toThrowError(AssertionError);
        expect(() => tryMap(nop, nop, -1)).toThrowError(AssertionError);
        expect(() => tryMap(nop, nop, 1)).not.toThrow();
        expect(() => tryMap(nop, nop)).not.toThrow();
    }); 
});
