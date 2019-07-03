"use strict";

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var fs = require('fs');
var copyFileSync = require('fs-copy-file-sync');

var https = require('https');

var _require = require('child_process'),
    spawn = _require.spawn,
    exec = _require.exec;

var _require2 = require('stream'),
    Writable = _require2.Writable;

var _require3 = require('events'),
    EventEmitter = _require3.EventEmitter;

var ResponseBuffer =
/*#__PURE__*/
function (_Writable) {
  _inherits(ResponseBuffer, _Writable);

  function ResponseBuffer(opts) {
    var _this;

    _classCallCheck(this, ResponseBuffer);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ResponseBuffer).call(this, opts));
    _this.text = '';
    return _this;
  }

  _createClass(ResponseBuffer, [{
    key: "_write",
    value: function _write(chunk, encoding, callback) {
      this.text += chunk;
      callback();
    }
  }]);

  return ResponseBuffer;
}(Writable);

exports.ResponseBuffer = ResponseBuffer; //allow self signed cert

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //const strings, urls etc

var ICR_PACKAGE_MANAGEMENT_TASKS = '/mgmt/shared/iapp/package-management-tasks'; // utility method to set up HTTP options based on API options argument (i.e. devconfig.json)

var prepareReqOptions = function prepareReqOptions(user_opts, path) {
  // support both basic auth via USER/PASS or token auth via header
  if (user_opts.HOST === 'localhost' && user_opts.PORT == 8100) https = require('http');
  return {
    hostname: user_opts.HOST,
    port: user_opts.PORT || 443,
    auth: user_opts.USER ? "".concat(user_opts.USER, ":").concat(user_opts.PASS) : undefined,
    headers: user_opts.AUTH_TOKEN ? {
      'x-f5-auth-token': user_opts.AUTH_TOKEN
    } : {},
    path: path
  };
}; //slated for removal, only used for SCP which is currently unused


var shExec = function shExec(command, done) {
  console.log(command);
  return exec(command, function (error, stdout, stderr) {
    if (error) {
      console.error("exec error: ".concat(error));
    } else {
      console.log("stdout: ".concat(stdout));
      console.log("stderr: ".concat(stderr));
    }

    if (done) done();
  });
};

var version = Date.now();

var initializeProject = function initializeProject(path, cb) {
  var srcDir = "".concat(path, "/src");

  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir);
  }

  var nodejsDir = "".concat(srcDir, "/nodejs");

  if (!fs.existsSync(nodejsDir)) {
    fs.mkdirSync(nodejsDir);
  }

  copyFileSync("".concat(__dirname, "/../res/f5-project.spec"), "".concat(path, "/f5-project.spec"));
  copyFileSync("".concat(__dirname, "/../res/devconfig.json"), "".concat(path, "/devconfig.json"));
  copyFileSync("".concat(__dirname, "/../res/skeletonWorker.js"), "".concat(nodejsDir, "/skeletonWorker.js"));
  var npm_init = spawn('npm', ['init'], {
    stdio: [process.stdin, process.stdout, process.stderr],
    cwd: nodejsDir
  });
  npm_init.on('exit', function () {
    if (cb) cb();
  });
  npm_init.on('error', function (err) {
    if (cb) cb(err);
  });
};

exports.initializeProject = initializeProject;

var fetchLatestBuild = function fetchLatestBuild(builds_dir) {
  var builds = fs.readdirSync(builds_dir).map(function (fname) {
    var ctime = fs.statSync("".concat(builds_dir, "/").concat(fname)).ctimeMs;
    return {
      file: fname,
      ctime: ctime
    };
  }).sort(function (a, b) {
    return a.ctime >= b.ctime;
  }).map(function (item) {
    return item.file;
  });
  return "".concat(builds_dir, "/").concat(builds.pop());
};

exports.fetchLatestBuild = fetchLatestBuild;

var buildRpm = function buildRpm(cwd, opts, done) {
  var npmPackageJson = './src/nodejs/package.json';
  var rpmSpec = opts.rpmSpecfile || 'f5-project.spec';
  var destDir = opts.destDir || './build';
  var cb = _instanceof(opts, Function) ? opts : done;
  var config = fs.existsSync(npmPackageJson) ? JSON.parse(fs.readFileSync(npmPackageJson)) : {
    name: "icontrol-lx-extension",
    description: "New iControl LX Extention",
    license: "No License",
    author: "unspecified",
    version: "0.0.1"
  };

  if (!fs.existsSync(rpmSpec)) {
    var err = new Error("File Not Found: ".concat(rpmSpec));
    if (cb) cb(err);
    return;
  }

  var command = ['rpmbuild', '-v', '-bb', "--define \"main ".concat(cwd, "\""), "--define \"_topdir %{main}/_rpmbuild".concat(version, "\""), "--define \"_release ".concat(version, "\""), "--define \"_ilx_name ".concat(config.name, "\""), "--define \"_ilx_description ".concat(config.description, "\""), "--define \"_ilx_version ".concat(config.version, "\""), "--define \"_ilx_license ".concat(config.license, "\""), "--define \"_ilx_author ".concat(config.author, "\""), rpmSpec].join(' ');
  return exec(command, function (error, stdout, stderr) {
    if (error) {
      if (cb) cb(error, stderr);
    } else {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
      }

      var rpm_fname = "".concat(config.name, "-").concat(config.version, "-").concat(version, ".noarch.rpm");
      copyFileSync("".concat(cwd, "/_rpmbuild").concat(version, "/RPMS/noarch/").concat(rpm_fname), "".concat(cwd, "/build/").concat(rpm_fname));
      if (cb) cb(null, stdout);
    }
  });
};

exports.buildRpm = buildRpm;

var scpUploadToHost = function scpUploadToHost(opts, done) {
  var command = ['scp', "-i ".concat(opts.KEY), "".concat(opts.rpmPath), "".concat(opts.USER, "@").concat(opts.HOST, ":/var/config/rest/downloads/")].join(' ');
  shExec(command, function () {
    done("/var/config/rest/downloads/".concat(opts.rpmName.split('/').pop()));
  });
};

var checkForHttpError = function checkForHttpError(res) {
  if (res.statusCode >= 400) {
    var err = new Error("Status Code ".concat(res.statusCode, " ").concat(res.req._header.split('\n')[0]));
    return err;
  }

  return null;
};

var multipartUpload = function multipartUpload(opts, file_path, cb) {
  var eventLog = new EventEmitter();
  var fstats = fs.statSync(file_path);
  var CHUNK_SIZE = 1000000;

  var upload_part = function upload_part(start, end) {
    eventLog.emit('progress', 'Sending chunk ' + start + '-' + end + ' of ' + fstats.size + '...');
    var req = https.request(opts, function (res) {
      eventLog.emit('progress', "UPLOAD REQUEST STATUS (".concat(start, "-").concat(end, "): ").concat(res.statusCode));
      res.setEncoding('utf8');
      var resbuf = new ResponseBuffer();
      res.pipe(resbuf);
      res.on('end', function () {
        var error = checkForHttpError(res);

        if (error) {
          error.body = resbuf.text;
          if (cb) cb(error);
          return;
        }

        if (end === fstats.size - 1) {
          if (cb) cb();
        } else {
          var next_start = start + CHUNK_SIZE;

          var next_end = function () {
            if (end + CHUNK_SIZE > fstats.size - 1) return fstats.size - 1;
            return end + CHUNK_SIZE;
          }();

          upload_part(next_start, next_end);
        }
      });
    });
    req.on('error', function (err) {
      if (cb) cb(err);
    });
    req.setHeader('Content-Type', 'application/octet-stream');
    req.setHeader('Content-Range', start + '-' + end + '/' + fstats.size);
    req.setHeader('Content-Length', end - start + 1);
    req.setHeader('Connection', 'keep-alive');
    var fstream = fs.createReadStream(file_path, {
      start: start,
      end: end
    });
    fstream.on('end', function () {
      req.end();
    });
    fstream.pipe(req);
  };

  setImmediate(function () {
    if (CHUNK_SIZE < fstats.size) upload_part(0, CHUNK_SIZE - 1);else upload_part(0, fstats.size - 1);
  });
  return eventLog;
};

var httpCopyToHost = function httpCopyToHost(opts, rpmPath, done) {
  var rpmName = rpmPath.split('/').pop();
  var http_options = prepareReqOptions(opts, "/mgmt/shared/file-transfer/uploads/".concat(rpmName));
  http_options.method = 'POST';
  return multipartUpload(http_options, rpmPath, function (err) {
    done(err, "/var/config/rest/downloads/".concat(rpmName));
  });
};

var copyToHost = httpCopyToHost;
exports.copyToHost = copyToHost;

var pollTaskStatus = function pollTaskStatus(opts, link, cb) {
  var options = prepareReqOptions(opts, link);
  var req = https.request(options, function (res) {
    res.setEncoding('utf8');
    var res_buffer = new ResponseBuffer();
    res.pipe(res_buffer);
    res.on('end', function () {
      var error = checkForHttpError(res);

      if (error) {
        error.body = resbuf.text;
        if (cb) cb(error);
        return;
      }

      var status = JSON.parse(res_buffer.text);

      if (status.status === 'STARTED') {
        setTimeout(function () {
          pollTaskStatus(opts, link, cb);
        }, 2000);
      } else {
        if (cb) cb(status.errorMessage, status.status);
      }
    });
  });
  req.on('error', function (err) {
    if (cb) cb(err);
  });
  req.end();
};

exports.pollTaskStatus = pollTaskStatus;

var installRpmOnBigIp = function installRpmOnBigIp(opts, rpmpath, cb) {
  var post_body = {
    operation: "INSTALL",
    packageFilePath: rpmpath
  };
  var options = prepareReqOptions(opts, ICR_PACKAGE_MANAGEMENT_TASKS);
  options.method = 'POST';
  var req = https.request(options, function (res) {
    res.setEncoding('utf8');
    var res_buffer = new ResponseBuffer();
    res.pipe(res_buffer);
    res.on('end', function () {
      var error = checkForHttpError(res);

      if (error) {
        error.body = resbuf.text;
        if (cb) cb(error);
        return;
      }

      var inst_data = JSON.parse(res_buffer.text);
      var status_link = inst_data.selfLink.slice(17);
      pollTaskStatus(opts, status_link, cb);
    });
  });
  req.on('error', function (err) {
    if (cb) cb(err);
  });
  req.write(JSON.stringify(post_body));
  req.end();
};

exports.installRpmOnBigIp = installRpmOnBigIp;

exports.deployToBigIp = function (options, rpmPath, cb) {
  return copyToHost(options, rpmPath, function (err, rpm) {
    if (err) {
      if (cb) cb(err);
    } else {
      installRpmOnBigIp(options, rpm, cb);
    }
  });
};

var queryInstalledPackages = function queryInstalledPackages(opts, cb) {
  var options = prepareReqOptions(opts, ICR_PACKAGE_MANAGEMENT_TASKS);
  options.method = 'POST';
  options.headers = Object.assign(opts.headers || {}, {
    'Content-Type': 'application/json'
  });
  var req = https.request(options, function (res) {
    res.setEncoding('utf8');
    var res_buffer = new ResponseBuffer();
    res.pipe(res_buffer);
    res.on('end', function () {
      var error = checkForHttpError(res);

      if (error) {
        if (cb) cb(error);
        return;
      }

      var inst_data = JSON.parse(res_buffer.text);
      options.path = options.path + '/' + inst_data.id;
      options.method = 'GET';
      https.request(options, function (res) {
        var error = checkForHttpError(res);

        if (error) {
          error.body = resbuf.text;
          if (cb) cb(error);
          return;
        }

        var res_buffer = new ResponseBuffer();
        res.pipe(res_buffer);
        res.on('end', function () {
          var data = JSON.parse(res_buffer.text);
          if (cb) cb(null, data);
        });
      }).end();
    });
  });
  req.on('error', function (err) {
    if (cb) cb(err);
  });
  req.write('{ "operation": "QUERY" }');
  req.end();
};

exports.queryInstalledPackages = queryInstalledPackages;

var uninstallRpmOnBigIp = function uninstallRpmOnBigIp(opts, rpmpath, cb) {
  var post_body = {
    operation: "UNINSTALL",
    packageName: rpmpath
  };
  var options = prepareReqOptions(opts, ICR_PACKAGE_MANAGEMENT_TASKS);
  options.method = 'POST';
  var req = https.request(options, function (res) {
    var error = checkForHttpError(res);

    if (error) {
      if (cb) cb(error);
      return;
    }

    res.setEncoding('utf8');
    var res_buffer = new ResponseBuffer();
    res.pipe(res_buffer);
    res.on('end', function () {
      var inst_data = JSON.parse(res_buffer.text);
      var status_link = inst_data.selfLink.slice(17);
      pollTaskStatus(opts, status_link, cb);
    });
  });
  req.on('error', function (err) {
    if (cb) cb(err);
  });
  req.write(JSON.stringify(post_body));
  req.end();
};

exports.uninstallPackage = function (options, packageName, cb) {
  if (packageName) {
    uninstallRpmOnBigIp(options, packageName, cb);
  } else {
    cb(new Error('nothing to do, please specify package name'));
  }
};

var simpleHttpsGet = function simpleHttpsGet(opts, path, cb) {
  var options = prepareReqOptions(opts, path);
  var req = https.request(options, function (res) {
    var error = checkForHttpError(res);

    if (error) {
      if (cb) cb(error);
      return;
    }

    res.setEncoding('utf8');
    var res_buffer = new ResponseBuffer();
    res.pipe(res_buffer);
    res.on('end', function () {
      if (cb) cb(res_buffer.text);
    });
  });
  req.on('error', function (err) {
    if (cb) cb(err);
  });
  req.end();
};

exports.get = simpleHttpsGet;