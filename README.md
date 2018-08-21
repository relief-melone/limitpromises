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
Just the index of the current entry

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
this

```js
// Use limitpromises with a group
let promiseArray = limitPromises(PromiseFunction, InputValues, maxAtOnce, 'TCP');
```

Now every time you call the function with the Group TCP, limitpromises will notice that it's a member of this group and will only execute the promises as soon as they become available.