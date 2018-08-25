function TimeoutError(Obj){
    this.Obj = Obj;
    this.TimedoutAfterMillis = new Date() - Obj.started;
    this.code = 408 
    return this;
}

function RetryRejectError(Obj, Err){
    this.Obj = Obj;
    this.FailedAfterMillis = new Date() - Obj.started;
    this.code = Err.code || null;
    return this;
}

module.exports = {
    TimeoutError,
    RetryRejectError
} 