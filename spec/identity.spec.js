'use strict';

const identity = require('../lib/identity');

describe('identity', () => {
    it('returns argument', function() {
        const arg = Symbol('arg');
        expect(identity(arg)).toBe(arg);
    });
});
