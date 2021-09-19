const { inherits } = require("util");
const { Duplex } = require("readable-stream");

const noop = () => undefined;

module.exports = PostMessageStream;

inherits(PostMessageStream, Duplex);

function PostMessageStream(opts) {
  console.log("PostMessageStream");
  Duplex.call(this, {
    objectMode: true,
  });

  this._name = opts.name;
  this._target = opts.target;
  this._targetWindow = opts.targetWindow || window;
  this._origin = opts.targetWindow ? "*" : location.origin;

  // initialization flags
  this._init = false;
  this._haveSyn = false;

  window.addEventListener("message", this._onMessage.bind(this), false);
  // send syncorization message
  this._write("SYN", null, noop);
  this.cork();
  console.log("End PostMessageStream");
}

// private
PostMessageStream.prototype._onMessage = function (event) {
  console.log("ReactNativePostMessageStream onMessage");
  console.log(event);
  const msg = event.data;

  // validate message
  if (this._origin !== "*" && event.origin !== this._origin) {
    return;
  }
  if (event.source !== this._targetWindow && window === top) {
    return;
  }
  if (!msg || typeof msg !== "object") {
    return;
  }
  if (msg.target !== this._name) {
    return;
  }
  if (!msg.data) {
    return;
  }

  if (this._init) {
    // forward message
    console.log("ReactNativePostMessageStream onMessage push");
    try {
      this.push(msg.data);
    } catch (err) {
      console.log("ReactNativePostMessageStream onMessage push err");
      console.error(err);
      this.emit("error", err);
    }
  } else if (msg.data === "SYN") {
    this._haveSyn = true;
    this._write("ACK", null, noop);
  } else if (msg.data === "ACK") {
    this._init = true;
    if (!this._haveSyn) {
      this._write("ACK", null, noop);
    }
    this.uncork();
  }
};

// stream plumbing
PostMessageStream.prototype._read = noop;

PostMessageStream.prototype._write = function (data, _encoding, cb) {
  const message = {
    target: this._target,
    data,
  };
  this._targetWindow.postMessage(message, this._origin);
  cb();
};
