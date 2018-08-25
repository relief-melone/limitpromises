const handleRejects = require('./service.handleRejects');
const Error = require('./services.errors');

function retryPromiseTimeout(PromiseFunc, Obj, Options){
    let timeoutOpts = Options.Timeout;
   
    setTimeout( () => {         
        if(Obj.isRunning && Obj.attempt <= timeoutOpts.retryAttempts){ 
            PromiseFunc(Obj.inputValue).then(data => {
                if(Obj.isRunning){
                    Obj.resolveResult(data);
                }
            }, err => {
                if(Obj.isRunning){
                    handleRejects(PromiseFunc, Obj, err, Options);
                }
            });
            
            if(Obj.isRunning){
                retryPromiseTimeout(PromiseFunc, Obj, Options);
            }
            Obj.attempt++;
            
        } else if (Obj.isRunning && Obj.attempt > timeoutOpts.retryAttempts){
            Obj.rejectResult(new Error.TimeoutError(Obj));
        }
    }, timeoutOpts.timeoutMillis);
}

module.exports = retryPromiseTimeout