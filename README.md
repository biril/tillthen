Tillthen v0.1.1
===============

[![Build Status](https://travis-ci.org/biril/tillthen.png)](https://travis-ci.org/biril/tillthen)

A minimal implementation of [Promises/A+](https://github.com/promises-aplus/promises-spec) tested against the
[Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests). 

May be used in the browser (with or without an AMD module framework) or Node. Although authors of real-world
applications should go with [a richer library](https://github.com/kriskowal/q), Tillthen is useful as a consise,
easy-to-digest implementation of the spec. The source (excluding the UMD boilerplate which deals with exporting
the module) is in the 100-line ballpark. An [annotated version](http://biril.github.io/tillthen/) is also
maintained.


Set up
------

`git clone git://github.com/biril/tillthen` or `npm install tillthen` to get up and running. Will be
exposed as a Global, a CommonJS module or an AMD module depending on the detected environment.

* When working in a *browser environment, without a module-framework,* include tillthen.js:

    ```html
    ...
    <script type="text/javascript" src="underscore.js"></script>
    <script type="text/javascript" src="tillthen.js"></script>
    ...
    ```

    and Tillthen will be exposed as the global `tillthen`:

    ```javascript
    console.log("working with version " + tillthen.getVersion());
    ```

* `require` when working *with CommonJS* (e.g. Node.js). Assuming Tillthen is `npm install`ed:

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

    (you'll probably be using the AMD-compliant version of [Underscore](https://github.com/amdjs/underscore))


Usage
-----

Besides the self-explanatory `getVersion`, Tillthen features a single method `defer` which may be used to create a
deferred object, i.e. a pending promise with `resolve`, `fulfil` and `reject` methods. For example

```javascript
var deferred = tillthen.defer();
readFile("foo.txt", "utf-8", function (error, text) {
    if (error) {
        deferred.reject(new Error(error));
    } else {
        deferred.fulfil(text);
    }
});
return deferred.promise;
```

`deferred.promise` exposes the deferred's underlying [promise](https://github.com/promises-aplus/promises-spec) which
features nothing more than a `then` method.

`defer.fulfil(value)` will fulfil the promise with given value while `defer.reject(reason)` will reject it with given
reason. `defer.resolve(anotherPromise)` will cause the promise to assume `anotherPromise`'s (future) state. Passing a
value to `resolve` is equivalent to calling `fulfil`. Note that the deffered is itself a promise and as such also
features a `then` method.


Testing
-------

Tillthen passes the [Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests). To run it,
either `make test` or `npm test` (after `npm install`ing).


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013 Alex Lambiris
