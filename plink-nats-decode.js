
const { uncompressSync } = require("snappy");
var protobuf = require("protobufjs");
const path = require('path');

module.exports = function (RED) {
    function LowerCaseNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            const data = uncompressSync(msg.payload);
            // msg.payload = data;
            // node.send(msg);
            protobuf.load(__dirname + "/schema.proto", (err, root) => {
                if (err) {
                    throw err;
                }
                // Obtain a message type
                var MetricSubmission = root.lookupType("MetricSubmission");
                var MetricSubmissionMsg = MetricSubmission.decode(data);
                var object = MetricSubmission.toObject(MetricSubmissionMsg, {
                    enums: String,  // enums as string names
                    longs: String,  // longs as strings (requires long.js)
                    bytes: String,  // bytes as base64 encoded strings
                    defaults: true, // includes default values
                    arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
                    objects: true,  // populates empty objects (map fields) even if defaults=false
                    oneofs: true    // includes virtual oneof fields set to the present field's name
                });
                msg.payload = object;
                node.send(msg);
            });
        });
    }
    RED.nodes.registerType("plink-node-red-nats-decode", LowerCaseNode);
}