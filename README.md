LimitPromises
=========

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
let maxAtOnce = 2;
 
// Now you run limitPromises. It will return an array of objects
let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce);
```

The Contents of the array that will be returned are the following

### index
Just the index of the current entry. If you use grouping (see further down) the index will not be the same as the entry in
the current array but in the stack of promises that have in total be added to that group. E.g. you have already 4 Promises in
that group and add another 4, you'll get back an array with the length 4 but their indexes will be 4-7

### isRejected
Tells you if this promise has been rejected

### isResolved
Tells you if this promise has been resolved

### isRunning
Tells you if this promise is running at the moment

### launchPromise
is Pending as long as this promise has not been started at the moment

### promiseFunc
the function where your value will be in after the promise is resolved

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