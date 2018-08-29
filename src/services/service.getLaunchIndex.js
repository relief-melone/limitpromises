/**
 * Returns the first Element of a PromiseArray that hasn't been started yet
 * 
 * @param  {Object[]} PromiseArray The PromiseArray in which a new promise should be started
 * 
 * @returns {Number} The index where you will start the resolveLaunchPromise
 * 
 */
function getLaunchIndex(PromiseArray){
    return PromiseArray.map(r => {return (r.isRunning === false && r.isRejected === false && r.isResolved === false)}).indexOf(true)
}

module.exports = getLaunchIndex;