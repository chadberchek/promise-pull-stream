'use strict';

const {PromiseFactoryStub, promiseHandlersCalled, expectNotFulfilled} = require('./test-utils');
const parallelWrapper = require('../lib/parallel-wrapper');
const then = require('../lib/then');

function Deferred() {
    this.promise = new Promise((res, rej) => {
        this.resolve = res;
        this.reject = rej;
    });
}
Deferred.stub = function(spy) {
    const deferrals = [];
    spy.and.callFake(() => {
        const d = new Deferred();
        deferrals.push(d);
        return d.promise;
    });
    return deferrals;
};

describe('parallel wrapper', function() {
    beforeEach(function() {
        this.setUpFixture = function(promiseFactoryStubCount, parallelWrapperParams) {
            this.throughSpy = jasmine.createSpy('throughSpy');
            this.throughSpyDeferrals = Deferred.stub(this.throughSpy);
            this.promiseFactoryStub = new PromiseFactoryStub(promiseFactoryStubCount);
            const parallelThrough = parallelWrapper(parallelWrapperParams, then(this.throughSpy));
            this.stream = parallelThrough(this.promiseFactoryStub.promiseFactory);
        };
    });

    it('does not call wrapped function or upstream until called', async function() {
        this.setUpFixture(1, {parallelOperations: 2});
        await this.promiseFactoryStub.expectTimesCalled(0);
        expect(this.throughSpy).not.toHaveBeenCalled();
    });

    it('calls the wrapped function in parallel', async function() {
        this.setUpFixture(3, {parallelOperations: 2});        
        this.promiseFactoryStub.resolveAll();

        await this.promiseFactoryStub.expectTimesCalled(0);
        expect(this.throughSpy).not.toHaveBeenCalled();

        const promise0 = this.stream();
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(2);
        expect(this.throughSpy.calls.allArgs()).toEqual([[0], [1]]);
        this.throughSpyDeferrals[0].resolve('a');
        expect(await promise0).toBe('a');
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(3);
    });

    it('runs specified number of parallel operations', async function() {
        this.setUpFixture(3, {parallelOperations: 3});
        this.promiseFactoryStub.resolveAll();
        this.stream();
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(3);
    });

    it('does not call upstream in parallel', async function() {
        this.setUpFixture(2, {parallelOperations: 2});
        this.stream();
        await this.promiseFactoryStub.expectPendingPromises(1);
    });

    it('passes through settled promises first if requested', async function() {
        this.setUpFixture(2, {parallelOperations: 2, completedFirst: true});
        this.promiseFactoryStub.resolveAll();
        
        const promise0 = this.stream();
        await promiseHandlersCalled();
        this.throughSpyDeferrals[1].resolve('a');
        expect(await promise0).toBe('a');
        this.throughSpyDeferrals[0].resolve('b');
        expect(await this.stream()).toBe('b');
    });

    it('passes through promises in original order if completedFirst not set', async function() {
        this.setUpFixture(2, {parallelOperations: 2});
        this.promiseFactoryStub.resolveAll();
        
        const promise0 = this.stream();
        await promiseHandlersCalled();
        this.throughSpyDeferrals[1].resolve('a');
        await expectNotFulfilled(promise0);
        this.throughSpyDeferrals[0].resolve('b');
        expect(await promise0).toBe('b');
        expect(await this.stream()).toBe('a');
    });

    it('uses specified promise buffer size', async function () {
        this.setUpFixture(3, {parallelOperations: 1, bufferSize: 2});
        this.promiseFactoryStub.resolveAll();

        this.stream(); // returns first promise, so buffer is still empty
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(1); // buf size == 0
        this.throughSpyDeferrals[0].resolve();
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(2); // buf size == 1
        this.throughSpyDeferrals[1].resolve();
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(3); // buf size == 2
    });

    it('uses number of parallel operations as default buffer size', async function () {
        this.setUpFixture(4, {parallelOperations: 3});
        this.promiseFactoryStub.resolveAll();

        this.stream(); // start 3 parallel operations; 1 promise returned, 2 in buffer
        await promiseHandlersCalled();
        expect(this.throughSpy).toHaveBeenCalledTimes(3); // buf size == 2
        for (let d of this.throughSpyDeferrals) d.resolve();
        await promiseHandlersCalled(); // all ops complete; now limited by buffer
        expect(this.throughSpy).toHaveBeenCalledTimes(4); // buf size == 3        
    });

    it('can chain multiple throughs', async function() {
        const promiseFactoryStub = new PromiseFactoryStub(1);
        const parallelThrough = parallelWrapper({parallelOperations: 2},
            then(x => x + 'a'),
            then(x => x + 'r')
        );
        const stream = parallelThrough(promiseFactoryStub.promiseFactory);
        promiseFactoryStub.resolve(0, 'St');
        expect(await stream()).toBe('Star');
    });
});
