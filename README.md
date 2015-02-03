Tillthen
========

[![Build Status](https://travis-ci.org/biril/tillthen.png)](https://travis-ci.org/biril/tillthen)
[![NPM version](https://badge.fury.io/js/tillthen.png)](http://badge.fury.io/js/tillthen)

A minimal implementation of [Promises/A+](https://github.com/promises-aplus/promises-spec) tested
on [Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests).

**Please note that the current implementation conforms to v1.0 of Promises/A+ as expressed by
v1.3.2 of the test suite. Compliance with Promises/A+ v1.1 (2.x versions of the test suite) is work
in progess.**

Tillthen is useful as a consise, easy-to-digest implementation of the spec. The source (excluding
the UMD boilerplate which deals with exporting the module) is in the 100-line ballpark and an
[annotated version](http://biril.github.io/tillthen/) is also maintained. Having said that,
real-world use is not within the authors original intentions as
[richer, tried libraries](https://github.com/kriskowal/q) already exist.


Set up
------

Tillthen may be used as a CommonJS module on Node or in a browser, either through a plain `<script>`
tag or as an AMD module. It will be automatically exported in the correct format depending on the
detected environment. To get it, `git clone git://github.com/biril/tillthen` or
`npm install tillthen`.

* When working in a *browser, without an AMD module loader*, include tillthen.js:

    ```html
    ...
    <script type="text/javascript" src="tillthen.js"></script>
    ...
    ```

    and the module will be exposed as the global `tillthen`:

    ```javascript
    console.log("working with version " + tillthen.version);
    ```

* `require` when working *with CommonJS* (e.g. Node). Assuming Tillthen is `npm install`ed:

    ```javascript
    var tillthen = require("tillthen");
    console.log("working with version " + tillthen.version);
    ```

* Or list as a dependency when working *with an AMD loader* (e.g. require.js):

    ```javascript
    // Your module
    define(["tillthen"], function (tillthen) {
    	console.log("working with version " + tillthen.version);
    });
    ```


Usage
-----

Besides the self-explanatory `version` property, Tillthen features a single method `defer` which
may be used to create a deferred object, i.e. a pending promise featuring `resolve` and `reject`
methods. As an example:

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

`defer.resolve(result)` will resolve the promise with given `result`. Thus, it will fulfill the
promise if `result` is a *value*, or cause it to assume `result`'s (future) state if it's a
*promise* itself. `defer.reject(reason)` will reject the promise with given `reason`.

`deferred.promise` exposes the deferred's underlying
[promise](https://github.com/promises-aplus/promises-spec). Besides the `then` method, it features
a `state` property exposing the current state, and a `result` property exposing the eventual
fulfillment value or rejection reason.

Note that the deferred object may be used in place of the underlying promise as it also implements
`then` and exposes `state` and `result`.


Testing
-------

Tillthen is tested on
[Promises/A+ Compliance Test Suite](https://github.com/promises-aplus/promises-tests). To run it,
either `make test` or `npm test` (after `npm install`ing).


License
-------

Licensed and freely distributed under the MIT License (LICENSE.txt).

Copyright (c) 2013-2015 Alex Lambiris
