'use strict';

function then(onfulfilled, onrejected) {
    return up => () => {
         return up().then(onfulfilled, onrejected);
    };
}

module.exports = then;
