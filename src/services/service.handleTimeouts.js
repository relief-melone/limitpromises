

/**
 * For the specified group, retrieve all of the users that belong to the group.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Object} Obj Current Object to be treated;
 * @param {Any} InputValue The InputValue for that Promise
 * @param {Function} Resolve The resolve of the promise
 * @param {Function} Reject The reject of that promise
 * @param {Object} Options Options that contain information about how the Timeout is handelt under Object.Timeout
 */
function handleTimeouts(PromiseFunc, Obj, Options){
    
    const timeoutConfig = require('../configs/config.timeout');
    const retryPromiseTimeout = require('./service.retryPromiseTimeout');
    const Error = require('./services.errors');

    let timeoutOpts = Options.Timeout || timeoutConfig;

    switch(timeoutOpts.timeoutBehaviour){
        case "none":
            break;
        case "retry":
        retryPromiseTimeout(PromiseFunc, Obj, Options);
            break;
        case "reject":
            setTimeout(() =>{
                if(Obj.isRunning){
                    return Obj.rejectResult(new Error.TimeoutError(Obj));
                }                
            }, timeoutOpts.timeoutMillis);
            break;
        case "resolve":
            setTimeout(() => {
                if(Obj.isRunning){
                    return Obj.resolveResult(timeoutOpts.returnOnTimeout);
                }  
            }, timeoutOpts.timeoutMillis);
                      
            break;
    }
}

module.exports = handleTimeouts;