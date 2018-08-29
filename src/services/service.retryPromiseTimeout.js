const handleRejects = require('./service.handleRejects');
const Error = require('./services.errors');
// LimitPromises will be defined inside the function as we want to avoid a circular dependency
let limitpromises;

/**
 * Handles Timeout of promises
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Object} Obj The Object holding the current Promise request
 * @param {Object} Options Options that have been specified by the user
 * 
 * @returns {void}
 */

function retryPromiseTimeout(PromiseFunc, Obj, Options){
    let timeoutOpts = Options.Timeout;
    limitpromises = limitpromises || require('../limitpromises');
    setTimeout( () => {         
        if(Obj.isRunning && Obj.attempt <= timeoutOpts.retryAttempts){ 
            // Put a new promise on the same stack as the current one is, so you dont call more promises of one
            // group as specified. Input Value is just true as we dont need it and only make one promise
            let newPromise = limitpromises( () =>{
                return new Promise((resolve, reject) => {
                    PromiseFunc(Obj.inputValue).then(data => {
                        resolve(data);       
                    }, err => {
                        reject(err);
                    });
                });
            },[true], Obj.maxAtOnce, Obj.TypeKey);
            
            // Wait for the PromiseArray and either resolve the current promise or handle the rejects
            Promise.all(newPromise.map(r => {return r.result})).then(data => {
                if(Obj.isRunning){
                    Obj.resolveResult(data);
                }
            }, err => {
                if(Obj.isRunning){
                    handleRejects(PromiseFunc, Obj, err, Options);
                }
            });
            
            // Call the function again to check again after a given time
            retryPromiseTimeout(PromiseFunc, Obj, Options);
            
            // Count that an attempt has been made for that object
            Obj.attempt++;
            
        // If more retry attempts have been made than specified by the user, reject the result
        } else if (Obj.isRunning && Obj.attempt > timeoutOpts.retryAttempts){
            Obj.rejectResult(new Error.TimeoutError(Obj));
        }
    }, timeoutOpts.timeoutMillis);
}

module.exports = retryPromiseTimeout