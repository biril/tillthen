Tillthen v0.2.0
===============

[![Build Status](https://travis-ci.org/biril/tillthen.png)](https://travis-ci.org/biril/tillthen)

A minimal implementation of [Promises/A+](https://github.com/promises-aplus/promises-spec) tested
on [Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests). 

Tillthen is useful as a consise, easy-to-digest implementation of the spec. The source (excluding
the UMD boilerplate which deals with exporting the module) is in the 100-line ballpark and an
[annotated version](http://biril.github.io/tillthen/) is also maintained. Having said that,
real-world use is not within the authors original intentions as
[richer, tried libraries](https://github.com/kriskowal/q) already exist.


Set up
------

Tillthen may be used in the browser through a plain `<script>`-tag, with an AMD module loader,
or as a CommonJS module on Node. It will be automatically exposed in the correct format depending
on the detected environment. To get it, `git clone git://github.com/biril/tillthen` or
`npm install tillthen`.

* When working in a *browser environment, without an AMD module loader*, include tillthen.js:

    ```html
    ...
    <script type="text/javascript" src="tillthen.js"></script>
    ...
    ```

    and the module will be exposed as the global `tillthen`:

    ```javascript
    console.log("working with version " + tillthen.getVersion());
    ```

* `require` when working *with CommonJS* (e.g. Node). Assuming Tillthen is `npm install`ed:

    ```javascript
    var tillthen = require("tillthen");
    console.log("working with version " + tillthen.getVersion());
    ```

* Or list as a dependency when working *with an AMD loader* (e.g. require.js):

    ```javascript
    // Your module
    define(["tillthen"], function (tillthen) {
    	console.log("working with version " + tillthen.getVersion());
    });
    ```


Usage
-----

Besides the self-explanatory `getVersion`, Tillthen features a single method `defer` which may be
used to create a deferred object, i.e. a pending promise featuring `resolve` and `reject` methods.
As an example:

```javascript
var deferred = tillthen.defer();
readFile("foo.txt", "utf-8", function (error, text) {
    if (error) {
        deferred.reject(new Error(error));
    } else {
        deferred.resolve(text);
    }
});
return deferred.promise;
```

`deferred.promise` exposes the deferred's underlying
[promise](https://github.com/promises-aplus/promises-spec) which features nothing more than a
`then` method.

`defer.resolve(result)` will resolve the promise with given `result`. Thus, it will fulfil the
promise if `result` is a _value_, or cause it to assume `result`'s (future) state if it's a
_promise_ itself. `defer.reject(reason)` will reject the promise with given `reason`. 

Note that the deffered is itself a promise and as such also features a `then` method.


Testing
-------

Tillthen is tested on
[Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests). To run it,
either `make test` or `npm test` (after `npm install`ing).


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013 Alex Lambiris
