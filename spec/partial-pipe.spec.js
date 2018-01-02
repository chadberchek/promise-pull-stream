'use strict';

const partialPipe = require('../lib/partial-pipe');

function a() {
    return Promise.resolve('a');
}

function b(up) {
    return () => up().then(v => v + 'b');
}

function c(up) {
    return () => up().then(v => v + 'c');
}

describe('partial-pipe', () => {
    it('returns a function that passes its first argument to the given function', async () => {
        const pp = partialPipe(b);
        expect(await pp(a)()).toBe('ab');
    });

    it('returns a function that passes each result to the next function', async () => {
        const pp = partialPipe(b, c);
        expect(await pp(a)()).toBe('abc');
    })
});
