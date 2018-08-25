function getCountRunningPromises(PromiseArray){
    // 
    return PromiseArray.filter(Entry => {return Entry.isRunning === true}).length;
}

module.exports = getCountRunningPromises;