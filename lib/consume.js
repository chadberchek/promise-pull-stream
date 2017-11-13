'use strict';

const {DONE} = require('./base');

async function consume(promiseFactory) {
    try {
        for (;;) {
            await promiseFactory();
        } 
    } catch (e) {
        if (e !== DONE) throw e;
    }
}

module.exports = consume;
