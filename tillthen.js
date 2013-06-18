//     Tillthen v0.3.1

//     https://github.com/biril/tillthen
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*global exports, define, process */
(function (root, createModule) {
    "use strict";

    var
        // Package various utility functions we'll be reusing
        _ = {
            isObject: function (o) {
                return Object.prototype.toString.call(o) === "[object Object]";
            },

            isFunction: function (f) {
                return Object.prototype.toString.call(f) === "[object Function]";
            }
        },

        // Detect the current environment (can be CommonJS, AMD or browser). Tillthen will be
        //  exposed as a module or global depending on that
        env = (function () {
            // A global `exports` object signifies CommonJS-like enviroments that support
            //  `module.exports`, e.g. Node
            if (_.isObject(exports)) { return "CommonJS"; }

            // A global `define` method with an `amd` property signifies the presence of an AMD
            //  loader (require.js, curl.js)
            if (_.isObject(define) && define.amd) { return "AMD"; }

            // If none of the above, then assume a browser, without AMD
            return "browser";
        }());

    // Create a next-turn-evaluation function: A function that evaluates given function `f` on
    //  given value `v`, *soon*, i.e. *not* in the same turn of the event loop
    //
    // (Note that support for CommonJS will be specific to node. So if the detected environment
    //  is in fact 'CommonJS', the presense of node's `process` object is assumed and the latter
    //  is used to get a reference to Node's `nextTick` method)
    _.evaluateOnNextTurn = (function () {
        return env === "CommonJS" ? function (f, v) {
                process.nextTick(function () { f(v); });
            } :
            function (f, v) { root.setTimeout(function () { f(v); }, 0); };
    }());

    // Expose as a module or global depending on the detected environment
    switch (env) {
    case "CommonJS":
        createModule(_, exports);
        break;

    case "AMD":
        define(["exports"], function (exports) { return createModule(_, exports); });
        break;

    case "browser":
        root.tillthen = createModule(_, {});

        // When running in a browser (without AMD modules), attach a `noConflict` onto the
        //  `tillthen` global
        root.tillthen.noConflict = (function () {

            // Save a reference to the previous value of 'tillthen', so that it can be restored
            //  later on, if 'noConflict' is used
            var previousTillthen = root.tillthen;

            // Run in no-conflict mode, setting the `tillthen` global to to its previous value.
            //  Returns `tillthen`
            return function () {
                var tillthen = root.tillthen;
                root.tillthen = previousTillthen;
                tillthen.noConflict = function () { return tillthen; };
                return tillthen;
            };
        }());
    }
}(this, function (_, tillthen) {
    "use strict";

    var
        // Tillthen deferred constructor
        TillthenDeferred = function () {},

        // Tillthen promise constructor
        TillthenPromise = function () {},

        // Resolve `deferred`, i.e. transition it to an appropriate state depending on given `x`
        resolveDeferred = function (deferred, x) {
            var xThen = null;

            // If `promise` and `x` refer to the same object, reject promise with a TypeError as
            //  the reason
            if (deferred.promise === x) {
                return deferred.reject(new TypeError("Cannot resolve a promise with itself"));
            }

            // If `x` is a promise, adopt its (future) state
            if (x instanceof TillthenPromise) {
                if (x.state === "fulfilled") { return deferred.fulfill(x.result); }
                if (x.state === "rejected") { return deferred.reject(x.result); }
                return x.then(deferred.fulfill, deferred.reject);
            }

            // if `x` is *not* a thenable, fulfill promise with `x`. If attempting to query `then`
            //  throws an error, reject promise with that error as the reason
            //
            // (The procedure of first storing a reference to `x.then`, then testing that reference,
            //  and then calling that reference, avoids multiple accesses to the `x.then` property
            //  ensuring consistency in the face of an accessor property, whose value could change
            //  between retrievals)
            try {
                if (!(_.isObject(x) || _.isFunction(x)) || !_.isFunction(xThen = x.then)) {
                    return deferred.fulfill(x);
                }
            }
            catch (error) { deferred.reject(error); }

            // If `x` is a thenable adopt its (future) state
            xThen(function (value) {
                resolveDeferred(deferred, value);
            }, function (reason) {
                deferred.reject(reason);
            });
        },

        // Create an evaluator for given `onResulted` function and `deferred` object. When invoked
        //  with a `result` (value or reason), the evaluator will evaluate `onResulted(result)`
        //  and will use the returned value to resolve `deferred`
        createEvaluator = function (onResulted, deferred) {
            return function (result) {
                try { resolveDeferred(deferred, onResulted(result)); }
                catch (reason) { deferred.reject(reason); }
            };
        },

        // Create a deferred object: A pending promise with `resolve`, `fulfill` and `reject`
        //  methods
        createDeferred = function () {
            var
                // Promise's current state
                state = "pending",

                // Value of fulfillment or reason of rejection. Will be set when fulfillment or
                //  rejection actually occurs
                result,

                // Queues of fulfillment / rejection handlers. Handlers are added whenever the
                //  promise's `then` method is invoked
                fulfillQueue = [],
                rejectQueue = [],

                // The actual promise. The deferred will derive from this
                promise = new TillthenPromise(),

                // The deferred to be returned
                deferred = null,

                // Queue a handler and a dependant deferred for fulfillment. When (and if) the
                //  promise is fulfilled, the handler will be evaluated on promise's value and the
                //  result will be used to resolve the dependant deferred
                queueForFulfillment = function (onFulfilled, dependantDeferred) {

                    // If the promise is already rejected, there's nothing to be done
                    if (state === "rejected") { return; }

                    // If given `onFulfilled` is not a function then use a pass-through function in
                    //  its place
                    _.isFunction(onFulfilled) || (onFulfilled = function (value) { return value; });

                    // Create an evaluator to do the dirty work and either run it 'now' if the
                    //  promise is already fulfilled or as soon as (and if) that eventually happens
                    var evaluator = createEvaluator(onFulfilled, dependantDeferred);
                    state === "fulfilled" ? _.evaluateOnNextTurn(evaluator, result) :
                        fulfillQueue.push(evaluator);
                },

                // Queue a handler and a dependant deferred for rejection. When (and if) the promise
                //  is rejected, the handler will be evaluated on promise's reason and the result
                //  will be used to resolve the dependant deferred
                queueForRejection = function (onRejected, dependantDeferred) {

                    // If the promise is already fulfilled, there's nothing to be done
                    if (state === "fulfilled") { return; }

                    // If given `onRejected` is not a function then use a pass-through function in
                    //  its place
                    _.isFunction(onRejected) || (onRejected = function (error) { throw error; });

                    // Create an evaluator to do the dirty work and either run it 'now' if the
                    //  promise is already rejected or as soon as (and if) that eventually happens
                    var evaluator = createEvaluator(onRejected, dependantDeferred);
                    state === "rejected" ? _.evaluateOnNextTurn(evaluator, result) :
                        rejectQueue.push(evaluator);
                },

                // Fulfil the promise. Will run the queued fulfillment-handlers and resolve
                //  dependant promises. Note that the `fulfill` method will be exposed on the
                //  returned deferred *only* - not on any returned promise: not by the deferred's
                //  underlying promise or those returned by invoking `then`
                fulfill = function (value) {

                    // Dont fulfill the promise unless it's currently in a pending state
                    if (state !== "pending") { return; }

                    // Fulfil the promise
                    state = "fulfilled";
                    for (var i = 0, l = fulfillQueue.length; i < l; ++i) { fulfillQueue[i](value); }
                    fulfillQueue = [];
                    result = value;

                    return promise;
                },

                // Reject the promise. Will run the queued rejection-handlers and resolve
                //  dependant promises. As with the `fulfill` method, the `reject` method will be
                //  exposed on the returned deferred *only* - not on any returned promise
                reject = function (reason) {

                    // Dont reject the promise unless it's currently in a pending state
                    if (state !== "pending") { return; }

                    // Reject the promise
                    state = "rejected";
                    for (var i = 0, l = rejectQueue.length; i < l; ++i) { rejectQueue[i](reason); }
                    rejectQueue = [];
                    result = reason;

                    return promise;
                };

            // Attach `then` method as well as `state` and `result` getters to the promise:
            Object.defineProperties(promise, {

                // Access the promise's current or eventual fulfillment value or rejection reason.
                //  As soon as (if ever) the promise is fulfilled, the `onFulfilled` handler will
                //  be evaluated on the promise's fulfillment value. Similarly, as soon as (if ever)
                //  the promise is rejected, the `onRejected` handler will be evaluated on the
                //  rejection reason. Returns a new promise which will be eventually resolved
                //  with the value / reason / promise returned by `onFulfilled` or `onRejected`
                then: {
                    value: function (onFulfilled, onRejected) {
                        // Create a new deferred, one which is *dependant* on (and will be resolved
                        //  with) the the value / reason / promise returned by `onFulfilled` or
                        //  `onRejected`
                        var dependantDeferred = createDeferred();

                        // Queue `onFulfilled` and `onRejected` for evaluation upon the promise's
                        //  eventual fulfillment or rejection
                        queueForFulfillment(onFulfilled, dependantDeferred);
                        queueForRejection(onRejected, dependantDeferred);

                        // Return the dependant deferred's underlying promise
                        return dependantDeferred.promise;
                    }
                },

                // Get the promise's current state ('pending', 'fulfilled' or 'rejected')
                state: { get: function () { return state; } },

                // Get the promise's result (value or reason). Valid only after the promise has
                //  either been fulfilled or rejected
                result: { get: function () { return result; } }
            });

            // Derive a deferred from the promise, attach needed methods and return it
            TillthenDeferred.prototype = promise;
            deferred = new TillthenDeferred();
            Object.defineProperties(deferred, {

                // Get the deferred's underlying promise
                promise: { get: function () { return promise; } },

                // Fulfill the promise with given value
                fulfill: { value: fulfill },

                // Reject the promise with given reason
                reject: { value: reject },

                // Resolve the promise with given `result`: Fulfill it if `result` is a _value_, or
                //  cause it to assume `result`'s (future) state if it's a _promise_ itself
                resolve: { value: function (result) { resolveDeferred(this, result); } }
            });
            return deferred;
        };

    // Attach the `defer` / `getVersion` methods to Tillthen and return it
    Object.defineProperties(tillthen, {

        // Get a deferred object: A pending promise with `resolve`, `fulfill` and `reject` methods
        defer: { value: createDeferred },

        // Get current version of Tillthen
        version: { get: function () { return "0.3.1"; } }
    });
    return tillthen;
}));
