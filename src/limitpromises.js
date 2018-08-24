// this module will give you the possibility to make add alot of promises, but it will make sure, that only a fixed number is open.
// It was initially created to limit the number of promises making a tcp request (as windows only allows 5000 at once by default)

// If you provide a key you can make sure that you limit all the operations of a similar type. For example name your Type 'TCP' and all the functons
// calling with that key will use the same launch array. So if F1 calls it with 5000 Promises and F2 calls it with 5000 Promises the total limit will
// still be intact and not doubled
const timeoutConfig = require('../configs/config.timeout');
const rejectConfig = require('../configs/config.reject');
let currentPromiseArrays = {};
let currentPromiseMaxNumbers = {};
let processedInGroup = {};
//Used to create internal TypeKeys if noone has been specified by user
let iCount = 0;

/**
 * Returns an Array of Objects that are used in the PromisesWithMaxAtOnce Function.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Array} InputValues Array with the Inputvalues. One promise for each entry is created
 * @param {Number} StartingIndex Every entry will have an index to later determin which promise of the array was resolved
 */

const getLaunchArray = (PromiseFunc, InputValues, StartingIndex, TypeKey, Options, Attempt) => {
    // This function will return a launch Array. It takes a function that returns a promise and it's input Values as an array
    // The output is an array with each entry having 3 elements
    // resolveLaunchPromise is the function that resolves tha launchPromise with the same index
    // launchPromise triggers the execution of promisewithTcpRequest
    // promiseFunc The Input Promise with the correlating Inputvalue

    let options = Options || {};
    let attempt = Attempt || 1;
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
        obj.inputValue = InputValue;
        obj.attempt = Attempt || 1;
        obj.typeKey = TypeKey;

        obj.index = startingIndex + Index;

        obj.promiseFunc = new Promise((resolve, reject) => {
            handleTimeout(PromiseFunc, obj, resolve, reject, options);
            obj.launchPromise.then(() => {
                PromiseFunc(InputValue).then((data) =>{
                    
                    obj.isRunning = false;
                    obj.isResolved = true;
                    
                    processedInGroup[TypeKey] = processedInGroup[TypeKey] ? processedInGroup[TypeKey]++ : 1;
                    // Every time a promise finishes start the first one from the alreadyRunningArray that hasnt been started yet;
                    if(getLaunchIndex(currentPromiseArrays[TypeKey]) !== -1){
                        currentPromiseArrays[TypeKey][getLaunchIndex(currentPromiseArrays[TypeKey])].resolveLaunchPromise();
                    
                }
                
                    resolve(data);
                }, (err) => {
                    handleRejects(PromiseFunc, obj, resolve, reject, err, options);                    
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
    let typeKey = TypeKey || "internal" + iCount++;
    let options = Options || {};
    
    currentPromiseArrays[typeKey] = currentPromiseArrays[typeKey] || [];
    MaxAtOnce = currentPromiseMaxNumbers[typeKey] ? currentPromiseMaxNumbers[typeKey] : MaxAtOnce;
    
    if(!currentPromiseMaxNumbers[typeKey]) currentPromiseMaxNumbers[typeKey] = MaxAtOnce;

    
    let alreadyRunning = typeKey ? (currentPromiseArrays[typeKey] ): [];
    let runningPromises = getCountRunningPromises(alreadyRunning);      
    let launchArray = getLaunchArray(PromiseFunc, InputValues, alreadyRunning.length, typeKey, options);    

    // Turn on AutoSplice for the LaunchArray if there is a TypeKey
    autoSpliceLaunchArray(launchArray, typeKey);

    alreadyRunning = alreadyRunning.concat(launchArray);
    // Launch idex is the current index of the promise in the array that is beeing started; 

    // First start as much promises as are allowed at once (if there are less in the array than max allowed, start all of them)
    // null counts as infinite so the maxAtOnceStatement will just be true if null has been submitted
    let maxAtOnceStatment = MaxAtOnce ? (runningPromises<MaxAtOnce) : true;
    for(let i=0; maxAtOnceStatment && i < launchArray.length; i++){
        launchArray[i].resolveLaunchPromise();
        runningPromises = getCountRunningPromises(alreadyRunning);
        maxAtOnceStatment = MaxAtOnce ? (runningPromises<MaxAtOnce) : true;
    }
    
    // For each Promise that finishes start a new one until all are launched
    
    currentPromiseArrays[typeKey] = alreadyRunning;
    
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

/**
 * For the specified group, retrieve all of the users that belong to the group.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Object} Obj Current Object to be treated;
 * @param {Any} InputValue The InputValue for that Promise
 * @param {Function} Resolve The resolve of the promise
 * @param {Function} Reject The reject of that promise
 * @param {Object} Options Options that contain information about how the Timeout is handelt under Object.Timeout
 */
function handleTimeout(PromiseFunc, Obj, Resolve, Reject, Options){
    let timeoutOpts = Options.Timeout || timeoutConfig;
    
    switch(timeoutOpts.timeOutBehaviour){
        case "none":
            break;
        case "retry":
            setTimeout(() => {
                if(!Obj.isResolved && !Obj.isRejected){
                    
                    if(Obj.attempt>timeoutOpts.retryAttempts){
                        console.log(currentPromiseArrays);
                        Obj.isRejected = true;
                        Obj.isRunning = false;
                        return Reject();
                    }
                    Obj.attempt++;
                    
                    let launchArray = getLaunchArray(PromiseFunc, [Obj.inputValue], null, null, Options, Obj.attempt);
                    Promise.all(launchArray.map(r => {return r.promiseFunc})).then(data => {
                        Obj.isResolved = true;
                        Obj.isRunning = false;
                        return Resolve(data[0]);
                    }, err => {
                        console.log('Retry failed. Number', Obj.attempt);
                    });
                }               
            }, timeoutOpts.timeoutMillis);
            break;
        case "reject":
            reject();
            break;
        case "resolve":
            resolve([]);
            break;
    }
}


function handleRejects(PromiseFunc, Obj, Resolve, Reject, Err, Options){
    var rejectOpts = Options.Reject || rejectConfig;

    switch(rejectOpts.rejectBehaviour){
        case "reject":
            obj.isRunning = false;
            obj.isRejected = true;
            // Every time a promise finishes start the first one from the alreadyRunningArray that hasnt been started yet;            
            if(getLaunchIndex(currentPromiseArrays[Obj.TypeKey]) !== -1){
                currentPromiseArrays[Obj.TypeKey][getLaunchIndex(currentPromiseArrays[Obj.TypeKey])].resolveLaunchPromise();
            }            
            Reject(Err);
            break;
        case "ignore":
            obj.isRunning = false;
            obj.isResolved = true;
            Resolve(rejectOpts.returnOnIgnore);
            break;
        case "retry":
            if(Obj.attempt>rejectOpts.retryAttempts){
                Obj.isRejected = true;
                Obj.isRunning = false;
                return Reject(Err);
            }
            Obj.attempt++;
            
            let launchArray = getLaunchArray(PromiseFunc, [Obj.inputValue], null, null, Options, Obj.attempt);
            Promise.all(launchArray.map(r => {return r.promiseFunc})).then(data => {
                Obj.isResolved = true;
                Obj.isRunning = false;
                return Resolve(data[0]);
            }, err => {
                console.log('Retry failed. Number', Obj.attempt);
            });
            break;            
    }
}



module.exports = PromisesWithMaxAtOnce;