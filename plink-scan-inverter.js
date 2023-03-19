const { networkInterfaces } = require('os');
var modbus = require("modbus-stream");

function ValidateIPaddress(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return (true)
    }
    return (false)
}

const getListIpV4 = () => {
    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = ValidateIPaddress(net.address);
            if (familyV4Value && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    return results;
}

const scanInv = (ipDevice, model) => {
    return new Promise(function (myResolve, myReject) {
        modbus.tcp.connect(502, ipDevice, { debug: "automaton-2454" }, (err, connection) => {
            // do something with connection
            if (err) {
                //Close connection
                // console.log(err);
                connection?.close();
                myResolve({
                    "success": false,
                    "data": {
                        "device_ip": ipDevice,
                        "serial_number": ""
                    },
                    "error": err
                });
            }
            else {
                //Close connection
                connection.readInputRegisters({ address: 52, quantity: 8, extra: { unitId: 1 } }, (err, res) => {
                    if (err) {
                        myResolve({
                            "success": false,
                            "data": {
                                "device_ip": ipDevice,
                                "serial_number": ""
                            },
                            "error": err
                        });
                    }
                    myResolve({
                        "success": false,
                        "data": {
                            "device_ip": ipDevice,
                            "serial_number": res
                        },
                        "error": err
                    });
                })
                connection?.close();
            }
        });
    });
};

const getListIpV4Local = () => {
    const listIPWithName = getListIpV4();
    const IpArr = Object.values(listIPWithName);
    var listIP = [];
    IpArr.map((ips) => {
        ips.map((ip) => {
            listIP.push(ip)
        })
    });
    return listIP;
}

module.exports = function (RED) {

    function ScanSMA(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', async function (msg) {
            try {
                const { numberIPPerChunk = 100 } = config;

                this.status({ fill: "blue", shape: "ring", text: "scanning" });
                const listIp = getListIpV4Local();
                let resultArr = [];
                let resultArrRaw = [];

                for (let i = 0; i < listIp.length; i++) {
                    var IPv4 = listIp[i];
                    var baseIp = IPv4.split(".");
                    baseIp.pop();
                    baseIp = baseIp.join(".");
                    let resultInNetWork = [];
                    let resultSuccessInNetWork = [];

                    resultInNetWork
                    for (let j = 0; j < 255;) {
                        let nestedArr = [];
                        for (let k = 0; k < numberIPPerChunk; k++) {
                            if (j + k < 255) {
                                let reqIp = baseIp + "." + (i + j);
                                // requestArr.push(scanInv(reqIp));
                                nestedArr.push(scanInv(reqIp));
                            }
                        };
                        j = j + numberIPPerChunk;
                        const result = await Promise.all(nestedArr);
                        result.map((res) => {
                            resultInNetWork.push(res);
                            if (res.success) {
                                resultSuccessInNetWork.push({
                                    "device_ip": res?.data?.device_ip,
                                    "serial_number": res?.data?.device_ip,
                                });
                            }
                        });
                    }
                    resultArr.push({
                        "localIp": IPv4,
                        "result": resultSuccessInNetWork
                    });
                    resultArrRaw.push({
                        "localIp": IPv4,
                        "result": resultInNetWork
                    });
                }
                msg.raw = resultArrRaw;
                msg.payload = resultArr;
                node.send(msg);
                this.status({ fill: "green", shape: "ring", text: "scan completed" });
            } catch (error) {
                this.status({ fill: "red", shape: "ring", text: "scan error" });
                throw error;
            }
        });
    }
    RED.nodes.registerType("Plink Scan Inverter", ScanSMA);
}