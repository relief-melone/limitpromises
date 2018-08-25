let handleRejects;

function retryPromiseRejected (PromiseFunc, Obj, Options, Err){
    handleRejects = handleRejects || require('./service.handleRejects');
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