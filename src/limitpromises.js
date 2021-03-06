// this module will give you the possibility to make add alot of promises, but it will make sure, that only a fixed number is open.
// It was initially created to limit the number of promises making a tcp request (as windows only allows 5000 at once by default)

// If you provide a key you can make sure that you limit all the operations of a similar type. For example name your Type 'TCP' and all the functons
// calling with that key will use the same launch array. So if F1 calls it with 5000 Promises and F2 calls it with 5000 Promises the total limit will
// still be intact and not doubled

const handleRejects = require('./services/service.handleRejects');
const handleTimeouts = require('./services/service.handleTimeouts');
const cleanObject = require('./services/service.cleanObject');
const getCountRunningPromises = require('./services/service.getCountRunningPromises');
const getLaunchIndex = require('./services/service.getLaunchIndex');


let currentPromiseArrays = {};
let currentPromiseMaxNumbers = {};
let insertedInTotal = {};
//Used to create internal TypeKeys if noone has been specified by user
let iCount = 0;

/**
 * Returns an Array of Objects that are used in the PromisesWithMaxAtOnce Function.
 *
 * @public
 * @param {Function} PromiseFunc Function that returns a Promise with one InputParameter that is used
 * @param {Array} InputValues Array with the Inputvalues. One promise for each entry is created
 * @param {Number} StartingIndex Every entry will have an index to later determin which promise of the array was resolved
 * 
 * @returns {Object[]} Returns an array of Objects. One for each Promise that has to be created
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
        obj.started = new Date();
        obj.typeKey = TypeKey;
        obj.maxAtOnce = currentPromiseMaxNumbers[TypeKey];
        obj.indexInGroup = insertedInTotal[TypeKey] = insertedInTotal[TypeKey] ? ++insertedInTotal[TypeKey] : 0;

        obj.queueOnInsert = startingIndex + Index;
        
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
            handleTimeouts(PromiseFunc, obj, options);
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
 * 
 * @returns {Object[]} Returns an array of Objects. One for each Promise that has to be created
 */
function PromisesWithMaxAtOnce (PromiseFunc, InputValues, MaxAtOnce, TypeKey, Options){
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

// As the stack in currentPromiseArrays might get very long and slow down the application we will splice all of the launchArrays already
// completely resolved out of the currentPromiseArrays
/**
 * As currentPromiseArrays can get extremely large and we want to keep the app performant, autoSplice will automatically
 * remove a LaunchArray from the currentPromiseArrays after all of them have either been resolved or one is rejected
 * 
 * @param  {Object[]} LaunchArray LaunchArray you want to enable autosplice for
 * @param  {String} TypeKey The TypeKey or Group that the Launcharray is of
 * 
 * @returns {void}
 */
function autoSpliceLaunchArray(LaunchArray, TypeKey){
    var indFirstElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[0]);
    var indLastElement = currentPromiseArrays[TypeKey].indexOf(LaunchArray[LaunchArray.length-1]);
    Promise.all(LaunchArray.map(e => {return e.result})).then(() => {
        currentPromiseArrays[TypeKey].splice(indFirstElement, indLastElement); 
    }, err => {
        currentPromiseArrays[TypeKey].splice(indFirstElement, indLastElement); 
    });
}
/**
 * Will return the internal Array name for a launchArray where no Group or TypeKey has been assigned
 * 
 * @returns {String} The Name under which launchArray will be added to currentPromiseArrays
 */
function getInternalArrayName(){
    return "internal" + iCount++;
}

module.exports = PromisesWithMaxAtOnce;