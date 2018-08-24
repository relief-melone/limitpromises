// this module will give you the possibility to make add alot of promises, but it will make sure, that only a fixed number is open.
// It was initially created to limit the number of promises making a tcp request (as windows only allows 5000 at once by default)

// If you provide a key you can make sure that you limit all the operations of a similar type. For example name your Type 'TCP' and all the functons
// calling with that key will use the same launch array. So if F1 calls it with 5000 Promises and F2 calls it with 5000 Promises the total limit will
// still be intact and not doubled

let currentPromiseArrays = {};
let currentPromiseMaxNumbers = {};
let processedInGroup = {};

/**
 * Returns an Array of Objects that are used in the PromisesWithMaxAtOnce Function.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Array} InputValues Array with the Inputvalues. One promise for each entry is created
 * @param {Number} StartingIndex Every entry will have an index to later determin which promise of the array was resolved
 */

const getLaunchArray = (PromiseFunc, InputValues, StartingIndex, TypeKey) => {
    // This function will return a launch Array. It takes a function that returns a promise and it's input Values as an array
    // The output is an array with each entry having 3 elements
    // resolveLaunchPromise is the function that resolves tha launchPromise with the same index
    // launchPromise triggers the execution of promisewithTcpRequest
    // promiseFunc The Input Promise with the correlating Inputvalue


    let startingIndex = StartingIndex ? StartingIndex : 0;
    let launchArray = InputValues.map(function(InputValue, Index) {
        let obj = {};
        let resLPromise;
        // Expose the resolve of the promise, so it can be called from outsite
        obj.launchPromise = new Promise((resolve, reject) => {
            resLPromise = resolve;
        });
        // Add some logic to the resolvePromise
        obj.resolveLaunchPromise = () => {
            obj.isRunning = true;
            resLPromise();            
        }

        obj.isRunning = false;
        obj.isRejected = false;
        obj.isResolved = false;
        obj.index = startingIndex + Index;

        obj.promiseFunc = new Promise((resolve, reject) => {
            obj.launchPromise.then(() => {
                PromiseFunc(InputValue).then((data) =>{
                    obj.isRunning = false;
                    obj.isResolved = true;
                    if(TypeKey){
                        processedInGroup[TypeKey] = processedInGroup[TypeKey] ? processedInGroup[TypeKey]++ : 1
                    }
                    resolve(data);
                }, (err) => {
                    obj.isRunning = false;
                    obj.isRejected = true;
                    reject(err)
                });
            });
        });
        return obj;
    });

    return launchArray;    
}

/**
 * For the specified group, retrieve all of the users that belong to the group.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Array} InputValues Array with the Inputvalues. One promise for each entry is created
 * @param {Number} MaxAtOnce Number of Promises that can run at the same time
 * @param {String} TypeKey A Key that is set to group promises together. So e.g. you set the key to TCP no matter which function calls with that Key it wont exceed the maxAtOnce Promises 
 */

const PromisesWithMaxAtOnce = (PromiseFunc, InputValues, MaxAtOnce, TypeKey, Options) => {
    // You can input any promise that should be limited by open at the same time
    // PromiseFunc is a function that returns a promise and takes in an input value
    // InputValue is an Array of those InputValues
    // MaxAtOnce is the number of Promises maximum pending at the same time
    let options = Options || {};
    if(TypeKey){
        currentPromiseArrays[TypeKey] = currentPromiseArrays[TypeKey] || [];
        MaxAtOnce = currentPromiseMaxNumbers[TypeKey] ? currentPromiseMaxNumbers[TypeKey] : MaxAtOnce;
        
        if(!currentPromiseMaxNumbers[TypeKey]) currentPromiseMaxNumbers[TypeKey] = MaxAtOnce;

    }
    let alreadyRunning = TypeKey ? (currentPromiseArrays[TypeKey] ): [];
    let runningPromises = getCountRunningPromises(alreadyRunning);      
    let launchArray = getLaunchArray(PromiseFunc, InputValues, alreadyRunning.length, TypeKey);    

    // Turn on AutoSplice for the LaunchArray if there is a TypeKey
    if(TypeKey) autoSpliceLaunchArray(launchArray, TypeKey);

    alreadyRunning = alreadyRunning.concat(launchArray);
    // Launch idex is the current index of the promise in the array that is beeing started; 

    // First start as much promises as are allowed at once (if there are less in the array than max allowed, start all of them)
    for(let i=0; runningPromises < MaxAtOnce && i < launchArray.length; i++){
        launchArray[i].resolveLaunchPromise();
        runningPromises = getCountRunningPromises(alreadyRunning);
    }
    
    // Every time a promise finishes start the first one from the alreadyRunningArray that hasnt been started yet;
    launchArray.map((Value) => {
        Value.promiseFunc.then(() => {
            if(getLaunchIndex(alreadyRunning) !== -1){
                alreadyRunning[getLaunchIndex(alreadyRunning)].resolveLaunchPromise();
            }
            
        }, err => {
            if(getLaunchIndex(alreadyRunning) !== -1){
                alreadyRunning[getLaunchIndex(alreadyRunning)].resolveLaunchPromise();
            }
        });
    })

    // For each Promise that finishes start a new one until all are launched


    if(TypeKey){
        currentPromiseArrays[TypeKey] = alreadyRunning;
    }
    return launchArray;
}

function getCountRunningPromises(PromiseArray){
    // 
    return PromiseArray.filter(Entry => {return Entry.isRunning === true}).length;
}

function getCountFinishedOrRunningPromises(PromiseArray){
    return PromiseArray.filter(Entry => {return Entry.isRunning || Entry.isResolved || Entry.isRejected}).length;
}

// Return the first Element of the Array that hasnt been started yet
function getLaunchIndex(PromiseArray){
    return PromiseArray.map(r => {return (r.isRunning === false && r.isRejected === false && r.isResolved === false)}).indexOf(true)
}

// As the stack in currentPromiseArrays might get very long and slow down the application we will splice all of the launchArrays already
// completely resolved out of the currentPromiseArrays
function autoSpliceLaunchArray(LaunchArray, TypeKey){
    Promise.all(LaunchArray.map(e => {return e.promiseFunc})).then(() => {
        var indFirstElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[0]);
        var indLastElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[LaunchArray.length-1]);

        currentPromiseArrays[TypeKey].splice(indFirstElement, indLastElement); 
    });
}



module.exports = PromisesWithMaxAtOnce;