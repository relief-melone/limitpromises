function TimeoutError(Obj){
    this.obj = Obj;
    this.timedoutAfterMillis = new Date() - Obj.started;
    this.code = 408 
    return this;
}

function RetryRejectError(Obj, Err){
    this.obj = Obj;
    this.failedAfterMillis = new Date() - Obj.started;
    this.code = Err.code || null;
    this.err = Err;
    return this;
}

module.exports = {
    TimeoutError,
    RetryRejectError
} 