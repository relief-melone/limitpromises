const retryPromiseRejected = require('./service.retryPromiseRejected');
const rejectConfig  = require('../configs/config.reject');

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