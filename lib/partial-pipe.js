'use strict';

function partialPipe(...functions) {
    return up => functions.reduce((composite, f) => f(composite), up);
}

module.exports = partialPipe;
