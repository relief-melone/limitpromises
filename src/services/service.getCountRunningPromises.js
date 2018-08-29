/**
 * Returns the number of currently running Promises in the PromiseArray
 * 
 * @param  {Object[]} PromiseArray PromiseArray you want to get the number of running Promises from
 * 
 * @returns {Number} Number of currently running Promises in that PromiseArray
 */
function getCountRunningPromises(PromiseArray){
    // 
    return PromiseArray.filter(Entry => {return Entry.isRunning === true}).length;
}

module.exports = getCountRunningPromises;