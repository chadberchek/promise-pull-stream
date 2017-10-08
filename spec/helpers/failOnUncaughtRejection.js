process.on('unhandledRejection', (reason, p) => {
    fail("Promise rejection not handled. Rejection reason: " + String(reason));
});
