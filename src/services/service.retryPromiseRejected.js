let handleRejects;
let limitPromises;
/**
 * @param  {Function} PromiseFunc The PromiseFunction that the user has specified
 * @param  {Object} Obj The Object containing the information to that promise request
 * @param  {Object} Options The Options specified by the user
 * @param  {Error} Err The error returned by the PromiseFunction
 * 
 * @returns {void}
 */
function retryPromiseRejected (PromiseFunc, Obj, Options, Err){
    handleRejects = handleRejects || require('./service.handleRejects');
    limitPromises = limitPromises || require('../limitpromises');
    const Error = require('./services.errors');

    let rejectOpts = Options.Reject;
    if(Obj.isRunning && Obj.attempt <= rejectOpts.retryAttempts){
        PromiseFunc(Obj.inputValue).then(data => {        
           
            if(Obj.isRunning){
                Obj.resolveResult(data);
            }
        
        }, err => {
            if(Obj.isRunning){
                handleRejects(PromiseFunc, Obj, err, Options);
            }
        });
        Obj.attempt++;
    } else if(Obj.isRunning && Obj.attempt > rejectOpts.retryAttempts){
            Obj.rejectResult(Error.RetryRejectError(Obj, Err));
    }    
}

module.exports = retryPromiseRejected;