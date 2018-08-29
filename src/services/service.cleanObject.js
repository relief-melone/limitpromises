
/**
 * Will be called if a resultPromise is either rejected or resolved to clean the Object of Attributes you don't want to
 * send back to the user
 * 
 * @param  {Object} Object The Object you want to clean
 */
function cleanObject(Object){
    delete Object.resolve;
    delete Object.reject;
    delete Object.resolveResult;
    delete Object.rejectResult;
    delete Object.launchPromise;
    delete Object.promiseFunc;
}

module.exports = cleanObject;