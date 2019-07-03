#!/usr/bin/env node
'use strict';

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return right[Symbol.hasInstance](left); } else { return left instanceof right; } }

var icrdk = require('../');

var ERR_MESSAGE = "\nPlease create a file in this directory called 'devconfig.json', it should look like this:\n{\n    \"HOST\": \"<YOUR BIG IP IP ADDRESS>\",\n    \"USER\": \"<YOUR BIG IP USERNAME>\",\n    \"PASS\": \"<YOUR BIG IP PASSWORD>\"\n}\n";

var devConfig = function () {
  try {
    return require(process.cwd() + '/devconfig.json');
  } catch (e) {
    console.log('no devconfig found, trying environment variables');
    return {
      HOST: process.env.ICRDK_HOST,
      USER: process.env.ICRDK_USER,
      PASS: process.env.ICRDK_PASS
    };
  }
}();

var args = process.argv.slice(2);
var op = args.shift();
var ops = {
  init: function init(args) {
    var initPath = args.pop() || process.cwd();
    console.log("Initializing project at ".concat(initPath));
    icrdk.initializeProject(initPath, function (err) {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error("".concat(err.path, " could not be found, is it installed?"));
        } else {
          console.error('ERROR: ', err);
        }
      } else {
        console.log("Project created at ".concat(initPath, "!"));
      }
    });
  },
  build: function build(args) {
    var opts = {
      rpmSpecfile: args.pop()
    };
    icrdk.buildRpm(process.cwd(), opts, function (err) {
      if (err) {
        console.error(err);
        if (err.code === 127) console.error('Is rpmbuild installed?');
      } else {
        console.log("created ".concat(icrdk.fetchLatestBuild(process.cwd() + '/build')));
      }
    });
  },
  deploy: function deploy(args) {
    var target_build = function () {
      var rpm_path = args.pop();

      if (rpm_path) {
        if (!rpm_path.startsWith('/')) return "".concat(process.cwd(), "/").concat(rpm_path);else return rpm_path;
      }

      return icrdk.fetchLatestBuild('./build');
    }();

    console.log("Deploying ".concat(target_build));
    var progress = icrdk.deployToBigIp(devConfig, target_build, function (err) {
      if (err) {
        console.error(err);
      } else {
        console.log("Deployed ".concat(target_build, " successfully."));
      }
    });
    progress.on('progress', function (msg) {
      console.log(msg);
    });
  },
  query: function query(args) {
    icrdk.queryInstalledPackages(devConfig, function (err, data) {
      if (err) {
        console.error(err);
        return;
      }

      if (data.queryResponse.length <= 0) {
        console.log('No installed packages.');
        return;
      }

      data.queryResponse.forEach(function (item) {
        console.log("".concat(item.name, "\t").concat(item.version, "\t").concat(item.packageName));
      });
    });
  },
  uninstall: function uninstall(args) {
    icrdk.uninstallPackage(devConfig, args.pop(), function (err) {
      if (err) console.log(err);
    });
  },
  get: function get(args) {
    icrdk.get(devConfig, args.pop(), function (err, data) {
      if (err) console.error(err);else console.log(data);
    });
  }
};

if (_instanceof(ops[op], Function)) {
  ops[op](args);
} else {
  console.error("invalid operation: ".concat(op));
}