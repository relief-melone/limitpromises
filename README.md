LimitPromises
=========

** With version 1.4.0 promiseFunc is no longer available. Instead you will find your resolved promises
in result. New features are the handling of timeouts and rejects. See the topics further down **


This little module will make it easy to fire out a large number of promises, where you make sure only a number of them are beeing 
processed at any given time (e.g. if you have a large amount of TCP requests, if you fire all of them at once you might run into
problems as for example windows computers will only allow 5000 at once)

Installation
--------------

```sh
npm install limitpromises
```


Usage
--------


```js
const limitPromises = require('limitpromises');
 
// First you need the InputValues that will be used in each of your promises
let InputValues = [1000,2000,3000,4000];
 
// Then you will need a Function that returns a Promise. You only get one Input Value but you can use Objects to have access 
// to more parameters. In this case we will just set different timeouts.
const started = new Date();
let PromiseFunction = function(Input){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Resolved after " + parseInt((new Date() -started)/1000) + " s");
            resolve("Resolved after " + Input + " ms");
        }, Input);
    });
}
 
// At last you say how many Promises shall be executed at each time
// null or undefined will count as inifinite
let maxAtOnce = 2;
 
// Now you run limitPromises. It will return an array of objects
let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce);

Promise.all(promiseArray.map(p => {return p.result})).then(data => {
    // Stuff you will do with your data;
});
```

The Contents of the array that will be returned are the following


### indexInGroup
Tells you how many promises have been added to that group. If you don't use grouping this will be identical to the index of the array
returned

### queueOnInsert
Just the index of the current entry. If you use grouping (see further down) the queueOnInsert will not be the same as the entry in
the current array but in the stack of promises that have in total be added to that group. E.g. you have already 4 Promises in
that group and add another 4, you'll get back an array with the length 4 but their indexes will be 4-7. 
queueOnInserts will not be unique as the internal stack will automatically be cleared of resolved promise chunks. 
insertion.

### isRejected
Tells you if this promise has been rejected

### isResolved
Tells you if this promise has been resolved

### isRunning
Tells you if this promise is running at the moment

### result
The Promise where your result will end up in

### resolveLaunchPromise
Can be executed to manually start the Promise


## Grouping

You can create groups. For example you might have multiple functions that make tcp requests But the total TCP requests at any given time
cannot exceed a certain number. So in total you will need less requests than that running. To realize this you can call limitPromises like
this.

Here is an Example to explain this (PromiseFunction is the same as in the first code and left out for readability here)

```js
// Use limitpromises with a group

let InputValues1 = [1000, 1000, 1000, 1000];
let InputValues2 = [1000, 1000, 1000, 1000];

let maxAtOnce = 4

let promiseArray = limitPromises(PromiseFunction, InputValues1, maxAtOnce, 'SomeGroup');
let promiseArray2 = limitPromises(PromiseFunction, InputValues, maxAtOnce, 'SomeGroup');


```
console logs will show you that with the group set the promises resolve in 2 packs the first one after 1 second and the
second one after 2 seconds. If you wouldn't have used a group al would have resolved after 1 second as they would only make sure they are max 4 at once within their own InputValues.

One thing to keep in mind. The group is initiated on the first call of limitpromises. This sets the maxAtOnce Value. All other maxAtOnce
values to that same group further down will be ignored.

## Timeout Handling

By default there is no timeout handling meaning limitpromise will wait till infinity for your promises to resolve. But that might not always
be the best solution. To change this you can set it in the options

### None

This is the default option. But if you want to do it explicitly
```js
let options = {
    Timeout: {
        timeoutBehaviour: "none"
    }    
}

let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce, 'someGroup', options);

```

### Reject

This will cause your promise to be rejected automatically after a certain amout of time. In this case after 30 seconds

```js
let options = {
    Timeout: {
        timeoutBehaviour : "reject",
        timeoutMillis : 30000
    }
}
let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce, 'someGroup', options);

```

### Resolve
You might also want to resolve your promise and just return something if e.g. its not crucial to gather all the info

```js
let options = {
    Timeout: {
        timeoutBehaviour : "resolve",
        returnOnTimeout : [],
        timeoutMillis: 30000
    }
}
let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce, 'someGroup', options);
```


### Retry
You can also tell limitpromises to retry a promise for a certain number of times before it rejects. If you retry you might want 
to consider to turn the rejection behaviour of the promise to "none". limitpromises will wait for your initial promise and all retrys you make and will resolve your result with whatever brings back a result first. So if you have 3 retry attempts and none of them have failed so far, all of those would still be able to resole.

```js
let options = {
    Timeout: {
        timeoutBehaviour : "retry",
        retryAttempts : 3,
        timeoutMillis: 30000
    }
}

```

## Rejection Handling
By default if your promise rejects so will the promiseFunc in limitpromises. You can choose another behaviour like this

### Reject
As mentioned the default behaviour. You'll explicitly set it like this
```js
let options = {
    Reject : {
        rejectBehaviour : "reject"
    }
}
```

### Resolve
Instead of rejecting your promise, it will be resolved returning an answer you specify.
```js
let options = {
    Reject : {
        rejectBehaviour : "resolve",
        returnOnReject : []
    }
}
```

### Retry
Works the same way as in the timeout handling.
```js
let options = {
    Reject : {
        rejectBehaviout : "retry",
        retryAttempts : 3
    }
}
```

### None
The last thing you can do is none. The difference between none and resolve is that none will not return anything. So if you use this, be it's
advised that you set a Timeout option as well to not leave the promise pending forever. A case where this is useful is where you instead of 
waiting for an error to return after a long period of time just retry your promise after a certain period

```js
let options = {
    Reject : {
        rejectBehaviour : "none",
    },
    Timeout : {
        timeoutBehaviour : "retry",
        timeoutMillis : 30000,
        retryAttempts : 3
    }
}
```

