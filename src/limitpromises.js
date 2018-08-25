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
        obj.result = new Promise((resolveResult, rejectResult) => {
           obj.resolveResult = resolveResult;
           obj.rejectResult = rejectResult;
        });
        obj.result.then(data => {
            if(getLaunchIndex(currentPromiseArrays[TypeKey]) !== -1){
                currentPromiseArrays[TypeKey][getLaunchIndex(currentPromiseArrays[TypeKey])].resolveLaunchPromise();
            
            } 
            obj.isRunning = false;
            obj.isResolved = true;
            
            return cleanObject(obj);
        }, err => {
            if(getLaunchIndex(currentPromiseArrays[TypeKey]) !== -1){
                currentPromiseArrays[TypeKey][getLaunchIndex(currentPromiseArrays[TypeKey])].resolveLaunchPromise();
            
            } 
            obj.isRunning = false;
            obj.isRejected = true;
            return cleanObject(obj);
        })
        
        obj.launchPromise.then(() => {
            handleTimeout(PromiseFunc, obj, options);
            PromiseFunc(InputValue).then((data) =>{
                if(obj.isRunning){                    
                    return obj.resolveResult(data);                        
                }    
                return;
                
            }, (err) => {
                return handleRejects(PromiseFunc, obj, err, options);         
            });           
        });
        return obj;
    });
    currentPromiseArrays[TypeKey] = [].concat(currentPromiseArrays[TypeKey] || [], launchArray);
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
    let typeKey = TypeKey || getInternalArrayName();
    let options = Options || {};
    
    MaxAtOnce = currentPromiseMaxNumbers[typeKey] ? currentPromiseMaxNumbers[typeKey] : MaxAtOnce;
    
    if(!currentPromiseMaxNumbers[typeKey]) currentPromiseMaxNumbers[typeKey] = MaxAtOnce;

    
    let runningPromises = getCountRunningPromises(currentPromiseArrays[typeKey] || []);      
    let launchArray = getLaunchArray(
        PromiseFunc, 
        InputValues, 
        currentPromiseArrays[typeKey] ? currentPromiseArrays[typeKey].length : 0, 
        typeKey,
        options
    );    

    // Turn on AutoSplice for the LaunchArray if there is a TypeKey
    autoSpliceLaunchArray(launchArray, typeKey);

    // Launch idex is the current index of the promise in the array that is beeing started; 

    // First start as much promises as are allowed at once (if there are less in the array than max allowed, start all of them)
    // null counts as infinite so the maxAtOnceStatement will just be true if null has been submitted
    let maxAtOnceStatment = MaxAtOnce ? (runningPromises<MaxAtOnce) : true;
    for(let i=0; maxAtOnceStatment && i < launchArray.length; i++){
        launchArray[i].resolveLaunchPromise();
        runningPromises = getCountRunningPromises(currentPromiseArrays[typeKey]);
        maxAtOnceStatment = MaxAtOnce ? (runningPromises<MaxAtOnce) : true;
    }
    
    // For each Promise that finishes start a new one until all are launched
    
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
    Promise.all(LaunchArray.map(e => {return e.result})).then(() => {
        var indFirstElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[0]);
        var indLastElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[LaunchArray.length-1]);

        currentPromiseArrays[TypeKey].splice(indFirstElement, indLastElement); 
    }, err => {

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
function handleTimeout(PromiseFunc, Obj, Options){
    let timeoutOpts = Options.Timeout || timeoutConfig;

    switch(timeoutOpts.timeoutBehaviour){
        case "none":
            break;
        case "retry":
            retryPromise(PromiseFunc, Obj, timeoutOpts);
            break;
        case "reject":
            setTimeout(() =>{
                if(Obj.isRunning){
                    return Obj.rejectResult({msg: "Timeout"});
                }                
            }, timeoutOpts.timeoutMillis);
            break;
        case "resolve":
            if(!Obj.isRunning){
                return Obj.resolveResult(timeoutOpts.returnOnTimeout);
            }            
            break;
    }
}


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
            if(Obj.isRunning) return retryPromiseRejected(PromiseFunc, Obj, rejectOpts);
            break;                  
    }
}

function cleanObject(Object){
    delete Object.resolve;
    delete Object.reject;
    delete Object.resolveResult;
    delete Object.rejectResult;
    delete Object.launchPromise;
    delete Object.promiseFunc;
}

function getInternalArrayName(){
    return "internal" + iCount++;
}

function retryPromise(PromiseFunc, Obj, TimeoutOptions){
    setTimeout( () => {        
        if(Obj.isRunning && Obj.attempt++ <= TimeoutOptions.retryAttempts){
            PromiseFunc(Obj.inputValue).then(data => {
                if(Obj.isRunning){
                    Obj.resolveResult(data);
                }
            }, err => {
                if(Obj.isRunning){
                    Obj.rejectResult(err);
                }
            }, TimeoutOptions.timeoutMillis);
            
            if(Obj.isRunning){
                retryPromise(PromiseFunc, Obj, TimeoutOptions);
            }
                

        } else if (Obj.isRunning && Obj.attempt > TimeoutOptions.retryAttempts){
            Obj.rejectResult({msg: "Timed out after " + TimeoutOptions.retryAttempts + " attempts"});
        }
    }, TimeoutOptions.timeoutMillis);
}

function retryPromiseRejected (PromiseFunc, Obj, RejectOptions){
    PromiseFunc(Obj.inputValue).then(data => {
        if(Obj.isRunning && Obj.attempt++ <= RejectOptions.retryAttempts){
            PromiseFunc(Obj.inputValue).then(data => {
                if(Obj.isRunning){
                    Obj.resolveResult(data);
                }
            }, err => {
                if(Obj.isRunning){
                    retryPromiseRejected(PromiseFunc, Obj, Reject);
                }
            })
        } else if(Obj.isRunning && Obj.attempt > RejectOptions.retryAttempts){
            Obj.rejectResult({msg: "Rejected after " + RejectOptions.retryAttempts + " attempts"});
        }
    })
}

module.exports = PromisesWithMaxAtOnce;