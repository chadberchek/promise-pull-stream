'use strict';

const {DONE} = require('./base');

function catcher(catchFunction) {
    return up => async () => {
        for (;;) {
            try {
                return await up();
            } catch (e) {
                if (e === DONE) throw e;
                catchFunction(e);
            }
        }
    };
}

module.exports = catcher;
