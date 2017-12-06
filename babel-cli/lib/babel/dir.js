/*istanbul ignore next*/"use strict";

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var outputFileSync = require("output-file-sync");
var pathExists = require("path-exists");
var slash = require("slash");
var path = require("path");
var util = require("./util");
var fs = require("fs");
var _ = require("lodash");

module.exports = function (commander, filenames) {
  function write(src, relative) {
    // remove extension and then append back on .js
    relative = relative.replace(/\.(\w*?)$/, "") + ".js";

    var dest = path.join(commander.outDir, relative);

    var data = util.compile(src, {
      sourceFileName: slash(path.relative(dest + "/..", src)),
      sourceMapTarget: path.basename(relative)
    });
    if (!commander.copyFiles && data.ignored) return;

    // we've requested explicit sourcemaps to be written to disk
    if (data.map && commander.sourceMaps && commander.sourceMaps !== "inline") {
      var mapLoc = dest + ".map";
      data.code = util.addSourceMappingUrl(data.code, mapLoc);
      outputFileSync(mapLoc, /*istanbul ignore next*/(0, _stringify2.default)(data.map));
    }

    outputFileSync(dest, data.code);
    util.chmod(src, dest);

    util.log(src + " -> " + dest);
  }

  function handleFile(src, filename) {
    if (util.shouldIgnore(src)) return;

    if (util.canCompile(filename, commander.extensions)) {
      write(src, filename);
    } else if (commander.copyFiles) {
      var dest = path.join(commander.outDir, filename);
      outputFileSync(dest, fs.readFileSync(src));
      util.chmod(src, dest);
    }
  }

  function handle(filename) {
    if (!pathExists.sync(filename)) return;

    var stat = fs.statSync(filename);

    if (stat.isDirectory(filename)) {
      /*istanbul ignore next*/
      (function () {
        var dirname = filename;

        _.each(util.readdir(dirname), function (filename) {
          var src = path.join(dirname, filename);
          handleFile(src, filename);
        });
      })();
    } else {
      write(filename, filename);
    }
  }

  _.each(filenames, handle);

  if (commander.watch) {
    /*istanbul ignore next*/
    (function () {
      var chokidar = util.requireChokidar();

      _.each(filenames, function (dirname) {
        var watcher = chokidar.watch(dirname, {
          persistent: true,
          ignoreInitial: true
        });

        _.each(["add", "change"], function (type) {
          watcher.on(type, function (filename) {
            var relative = path.relative(dirname, filename) || filename;
            try {
              handleFile(filename, relative);
            } catch (err) {
              console.error(err.stack);
            }
          });
        });
      });
    })();
  }
};