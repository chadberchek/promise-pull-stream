'use strict';

function passThrough(onFulfilled) {
    return up => async () => {
        const upValue = await up();
        await onFulfilled(upValue);
        return upValue;
    }
}

module.exports = passThrough;
