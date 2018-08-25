

function cleanObject(Object){
    delete Object.resolve;
    delete Object.reject;
    delete Object.resolveResult;
    delete Object.rejectResult;
    delete Object.launchPromise;
    delete Object.promiseFunc;
}

module.exports = cleanObject;