'use strict';

const filter = require('./filter');

function catcher(catchFunction) {
    return filter(null, reason => {
        catchFunction(reason);
    });
}

module.exports = catcher;
