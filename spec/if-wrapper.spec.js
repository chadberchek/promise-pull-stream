'use strict';

const ifWrapper = require('../lib/if-wrapper');

describe('if wrapper', () => {
    function a(x) {
        return x + 'a';
    }

    function b(x) {
        return x + 'b';
    }

    it('returns an identity function when condition is falsy', () => {
        const unique = Symbol('x');
        expect(ifWrapper(0, a)(unique)).toBe(unique);
    });

    it('returns the given function when condition is truthy', () => {
        expect(ifWrapper(1, a)).toBe(a);
    });

    it('returns a function which composes multiple given functions when condition is truthy', () => {
        const composedAB = ifWrapper(1, a, b);
        expect(composedAB('L')).toBe('Lab');
    });
});
