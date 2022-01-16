const { inherits } = require("util");
const { Duplex } = require("readable-stream");

const noop = () => undefined;

module.exports = MobilePortStream;

inherits(MobilePortStream, Duplex);

/**
 * Creates a stream that's both readable and writable.
 * The stream supports arbitrary objects.
 *
 * @class
 * @param {Object} port Remote Port object
 */
function MobilePortStream(port) {
  Duplex.call(this, {
    objectMode: true,
  });
  this._name = port.name;
  this._targetWindow = window;
  this._port = port;
  this._origin = location.origin;
  window.addEventListener("message", this._onMessage.bind(this), false);
}

/**
 * Callback triggered when a message is received from
 * the remote Port associated with this Stream.
 *
 * @private
 * @param {Object} msg - Payload from the onMessage listener of Port
 */
MobilePortStream.prototype._onMessage = function (event) {
  // eslint-disable-next-line no-alert
  let msg = event.data;
  try {
    msg = JSON.parse(event.data);
  } catch (error) {}
  // validate message
  // if (this._origin !== "*" && event.origin !== this._origin) {
  //   return;
  // }
  if (!msg || typeof msg !== "object") {
    return;
  }
  if (!msg.data || typeof msg.data !== "object") {
    return;
  }
  if (msg.target && msg.target !== this._name) {
    return;
  }
  // Filter outgoing messages
  // if (msg.data.data && msg.data.data.toNative) {
  //   return;
  // }

  if (Buffer.isBuffer(msg)) {
    delete msg._isBuffer;
    const data = Buffer.from(msg);
    this.push(data);
  } else {
    this.push(msg);
  }
};

/**
 * Callback triggered when the remote Port
 * associated with this Stream disconnects.
 *
 * @private
 */
MobilePortStream.prototype._onDisconnect = function () {
  this.destroy();
};

/**
 * Explicitly sets read operations to a no-op
 */
MobilePortStream.prototype._read = noop;

/**
 * Called internally when data should be written to
 * this writable stream.
 *
 * @private
 * @param {*} msg Arbitrary object to write
 * @param {string} encoding Encoding to use when writing payload
 * @param {Function} cb Called when writing is complete or an error occurs
 */
MobilePortStream.prototype._write = function (msg, _encoding, cb) {
  // eslint-disable-next-line no-alert
  console.warn("MobilePortStream.prototype._write");
  console.warn(msg);
  try {
    const iframe = document.querySelector("iframe");
    // iframe.contentWindow.postMessage(
    //   JSON.stringify({
    //     name: "name test",
    //     data: "data test",
    //     origin: window.location.href,
    //   }),
    //   "*"
    // );
    if (Buffer.isBuffer(msg)) {
      const data = msg.toJSON();
      data._isBuffer = true;
      iframe.contentWindow.postMessage(
        JSON.stringify({ ...data, origin: window.location.href }),
        "*"
      );
    } else {
      // if (msg.data) {
      //   msg.data.toNative = true;
      // }
      iframe.contentWindow.postMessage(
        JSON.stringify({ ...msg, origin: window.location.href }),
        "*"
      );
    }
    console.log("after window.postMessage");
  } catch (err) {
    console.warn(err);
    return cb(new Error("MobilePortStream - disconnected"));
  }
  return cb();
};
