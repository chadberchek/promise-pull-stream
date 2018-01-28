'use strict';

const Deferred = require('../lib/deferred');
const {promiseHandlersCalled, rejected} = require('./test-utils');

describe('Deferred', () => {
    it('has a promise property which is initially not settled', async function() {
        const d = new Deferred();
        let state = null;
        d.promise.then(
            () => state = 'fulfilled',
            () => state = 'rejected'
        );
        await promiseHandlersCalled();
        expect(state).toBeNull();
    });

    it('is fulfilled when resolve is called', async function() {
        const d = new Deferred();
        d.resolve('x');
        expect(await d.promise).toBe('x');
    });

    it('is rejected when reject is called', async function() {
        const d = new Deferred();
        d.reject('x');
        expect(await rejected(d.promise)).toBe('x');
    });
});
