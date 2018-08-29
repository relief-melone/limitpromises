const retryPromiseRejected = require('./service.retryPromiseRejected');
const rejectConfig  = require('../configs/config.reject');
/**
 * Handle rejects will determine how a promise is beeing handled after it the PromiseFunc has been rejected
 * 
 * @param  {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param  {Object} Obj Current Object to be treated
 * @param  {Error} Err The error returned by the PromiseFunction
 * @param  {Object} Options Options that contain information about how the Reject is handelt under Object.Reject
 * 
 * @returns {void}
 */
function handleRejects(PromiseFunc, Obj, Err, Options){
    var rejectOpts = Options.Reject || rejectConfig;
    switch(rejectOpts.rejectBehaviour){
        case "reject":
            // Every time a promise finishes start the first one from the currentPromiseArrays[typeKey]Array that hasnt been started yet;                 
            if(Obj.isRunning) return Obj.rejectResult(Err);      
            break;
        case "resolve":
            if(Obj.isRunning) return Obj.resolveResult(rejectOpts.returnOnReject);
            break;
        case "retry":
            if(Obj.isRunning) return retryPromiseRejected(PromiseFunc, Obj, Options, Err);
            break;  
        case "none":
            break;                
    }
}

module.exports = handleRejects;