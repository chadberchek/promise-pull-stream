'use strict';

module.exports = pull;

function pull(...functions) {
    return functions.reduce((composite, f) => f(composite));
}
