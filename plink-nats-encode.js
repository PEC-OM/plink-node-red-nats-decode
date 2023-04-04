
const { compressSync } = require("snappy");
var protobuf = require("protobufjs");
const path = require('path');


module.exports = function (RED) {
    function PlinkNatsEncodeNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            let inputObject = msg.payload;

            inputObject['metricGroups'][0]['timestamp'] = parseInt(inputObject['metricGroups'][0]['timestamp'])
            inputObject.metricGroups[0]['metrics'].map((metric) => {
                if (metric['uint64Value']) {
                    metric['uint64Value'] = parseInt(metric['uint64Value'])
                }
            })

            protobuf.load(__dirname + "/schema.proto", (err, root) => {
                if (err) {
                    throw err;
                }

                var MetricSubmission = root.lookupType("MetricSubmission");

                // console.log('MetricSubmission.verify')
                var errMsg = MetricSubmission.verify(inputObject);
                if (errMsg) {
                    console.log('input data not valid')
                    throw Error(errMsg);
                }

                // console.log('MetricSubmission.create')
                var inputMsg = MetricSubmission.create(inputObject)

                // console.log('MetricSubmission.encode')
                var buffer = MetricSubmission.encode(inputMsg).finish();

                var snappyData = compressSync(buffer)
                msg.payload = snappyData
                node.send(msg)
            });
        });
    }
    RED.nodes.registerType("Plink Nats Encode", PlinkNatsEncodeNode);
}