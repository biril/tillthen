//     Tillthen v0.1.0

//     https://github.com/biril/tillthen
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013 Alex Lambiris

/*global exports, define, require, process, _ */
(function (root, createModule) {
    "use strict";

    // Detect current environment. Tillthen will be exposed as module / global depending on that
    var env = (function () {
            // A global 'exports' object signifies CommonJS-like enviroments that support
            //  module.exports, e.g. Node
            if (typeof exports === "object") { return "CommonJS"; }

            // A global 'define' method with an 'amd' property signifies the presence of an AMD
            //  loader (require.js, curl.js)
            if (typeof define === "function" && define.amd) { return "AMD"; }

            return "browser";
        }()),
        evaluateSoon = null; // To be defined below

    // Evaluate given function f with value v, soon, i.e. *not* the same turn of the event loop
    //  (Note that support for CommonJS will be specific to node. So if the detected environment is
    //  in fact 'commonJS', the presense of node's 'process' object is assumed and the latter is
    //  used to get a reference to the 'nextTick' method)
    evaluateSoon = (function () {
        return env === "CommonJS" ? function (f, v) { process.nextTick(function () { f(v); }); } :
            function (f, v) { root.setTimeout(function () { f(v); }, 0); };
    }());

    // Expose module / global depending on environment
    switch (env) {
    case "CommonJS":
        createModule(evaluateSoon, exports, require("underscore"));
        break;

    case "AMD":
        define(["underscore", "exports"], function (_, exports) {
            return createModule(evaluateSoon, exports, _);
        });
        break;

    case "browser":
        root.tillthen = createModule(evaluateSoon, {}, _);

        // Run in no-conflict mode, setting the global tillthen variable to to its previous value.
        //  Only useful when working in a browser environment without a module-framework as this
        //  is the only case where tillthen is exposed globally. Returns a reference to tillthen.
        root.tillthen.noConflict = (function() {

            // Save a reference to the previous value of 'tillthen', so that it can be restored
            //  later on, if 'noConflict' is used
            var previousTillthen = root.tillthen;

            // noConflict
            return function () {
                var tillthen = root.tillthen;
                root.tillthen = previousTillthen;
                tillthen.noConflict = function () { return tillthen; };
                return tillthen;
            };
        }());
    }
}(this, function (evaluateSoon, tillthen, _) {
    "use strict";

    var
        // Tillthen deferred constructor
        TillthenDeferred = function () {},

        // Tillthen promise constructor
        TillthenPromise = function () {},

        // Promise (deferred) resolution procedure
        resolveDeferred = function (deferred, x) {
            var xThen = null;

            // If promise and x refer to the same object, reject promise with a TypeError as the
            //  reason.
            if (deferred.promise === x) {
                return deferred.reject(new TypeError("Cannot resolve a promise with itself"));
            }

            // If x is a promise, adopt its state (and future state)
            if (x instanceof TillthenPromise) {
                return x.then(deferred.fulfill, deferred.reject);
            }

            // if x is not a thenable fulfill promise with x. If attempting to query 'then' throws
            //  e, reject promise with e as the reason. 
            // (The procedure of first storing a reference to x.then, then testing that reference,
            //  and then calling that reference, avoids multiple accesses to the x.then property
            //  ensuring consistency in the face of an accessor property, whose value could change
            //  between retrievals.)
            try {
                if ((!_.isObject(x) && !_.isFunction(x)) || !_.isFunction(xThen = x.then)) {
                    return deferred.fulfill(x);
                }
            }
            catch (error) { deferred.reject(error); }

            // If x is a thenable
            xThen(function (value) {
                resolveDeferred(deferred, value);
            }, function (reason) {
                deferred.reject(reason);
            });
        },

        // Create an evaluator function which, when invoked with a _result_ (value or reason),
        //  will execute given 'onResulted' function passing the _result_ and will transition the
        //  'dependantPromise' to an appropriate state depending on 'onResulted's returned value
        createEvaluator = function (onResulted, dependantDeferred) {
            return function (result) {
                try { resolveDeferred(dependantDeferred, onResulted(result)); }
                catch (reason) { dependantDeferred.reject(reason); }
            };
        },

        // Create a deferred object: A pending promise with resolve, fulfil and reject methods
        createDeferred = function () {
            var // Promise's current state
                state = "pending",

                // Value of fulfillment or reason of rejection, initially unset
                result,

                // Queues of onFullfiled/onReject handlers to run on promise's fulfillment/rejection
                onFulfilledQueue = [],
                onRejectedQueue = [],

                // The actual promise. The deferred will derive from this
                promise = new TillthenPromise(),

                //
                whenFullfiled = function (onFulfilled, dependantDeferred) {
                    if (state === "rejected") { return; }

                    _.isFunction(onFulfilled) || (onFulfilled = function (value) { return value; });

                    var evaluator = createEvaluator(onFulfilled, dependantDeferred);
                    state === "fulfilled" ? evaluateSoon(evaluator, result) :
                        onFulfilledQueue.push(evaluator);
                },

                //
                whenRejected = function (onRejected, dependantDeferred) {
                    if (state === "fulfilled") { return; }

                    _.isFunction(onRejected) || (onRejected = function (error) { throw error; });

                    var evaluator = createEvaluator(onRejected, dependantDeferred);
                    state === "rejected" ? evaluateSoon(evaluator, result) :
                        onRejectedQueue.push(evaluator);
                },

                //
                fulfill = function (value) {
                    if (state !== "pending") { return; }
                    state = "fulfilled";
                    _(onFulfilledQueue).each(function (onFulfilled) { onFulfilled(value); });
                    onFulfilledQueue = [];
                    result = value;
                },

                //
                reject = function (reason) {
                    if (state !== "pending") { return; }
                    state = "rejected";
                    _(onRejectedQueue).each(function (onRejected) { onRejected(reason); });
                    onRejectedQueue = [];
                    result = reason;
                };

            // Attach the 'then' method to the promise
            _(promise).extend({
                then: function (onFulfilled, onRejected) {
                    var dependantDeferred = createDeferred();

                    whenFullfiled(onFulfilled, dependantDeferred);
                    whenRejected(onRejected, dependantDeferred);

                    return dependantDeferred.promise;
                }
            });

            // Derive a deferred from the promise and return it
            TillthenDeferred.prototype = promise;
            return _(new TillthenDeferred()).extend({
                promise: promise,
                fulfill: fulfill,
                reject: reject,
                resolve: function (valueOrPromise) { resolveDeferred(this, valueOrPromise); }
            });
        };

    // Attach the defer / getVersion methods to tillthen and return it
    return _(tillthen).extend({

        // Get a deferred object: A pending promise with resolve, fulfil and reject methods
        defer: createDeferred,

        // Get current version of Tillthen
        getVersion: function () {
            return "0.1.0"; // Keep in sync with package.json
        }
    });
}));
