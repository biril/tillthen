/*jshint node:true */
"use strict";
var tillthen = require("../tillthen.js");
exports.pending = function () { return tillthen.defer(); };
