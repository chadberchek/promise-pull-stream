'use strict';

const pull = require('../lib/pull');

function a() {
    return Promise.resolve('a');
}

function b(up) {
    return () => up().then(v => v + 'b');
}

function c(up) {
    return () => up().then(v => v + 'c');
}

describe('pull', () => {
    it('passes a single function through directly', async () => {
        const f = pull(a);
        expect(await f()).toBe('a');
    });

    it('passes the first function to the second and returns its result', async () => {
        const f = pull(a, b);
        expect(await f()).toBe('ab');
    });

    it('passes each function result to the next in a chain', async () => {
        const f = pull(a, b, c);
        expect(await f()).toBe('abc');
    });

    it('throws an exception if there are no functions passed in', () => {
        expect(pull).toThrowError(TypeError);
    });
});
