// Return the first Element of the Array that hasnt been started yet
function getLaunchIndex(PromiseArray){
    return PromiseArray.map(r => {return (r.isRunning === false && r.isRejected === false && r.isResolved === false)}).indexOf(true)
}

module.exports = getLaunchIndex;