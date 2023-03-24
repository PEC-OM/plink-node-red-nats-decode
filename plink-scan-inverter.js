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

            if (familyV4Value && !net.internal && net.address.includes("192.168.")) {
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
                        "serial_number": "",
                        "err_type": "cannot connect ip"
                    },
                    "error": err
                });
            }
            else {
                console.log("model", model)
                switch (model) {
                    case "SMA-110":
                        //Close connection
                        console.log("case sma 110")
                        connection.readHoldingRegisters({ address: 40052, quantity: 16, retry: 100, extra: { unitId: 1 } }, (err, res) => {
                            if (err) {
                                myResolve({
                                    "success": false,
                                    "data": {
                                        "device_ip": ipDevice,
                                        "serial_number": "",
                                        "err_type": "cannot read regs"
                                    },
                                    "error": err
                                });
                            }
                            else {
                                dataArr = res.response.data
                                serialNumber = ""
                                dataArr.map((e) => {
                                    serialNumber += e.toString()
                                })
                                myResolve({
                                    "success": true,
                                    "data": {
                                        "device_ip": ipDevice,
                                        "serial_number": serialNumber,
                                        "err_type": "success read regs, no error"
                                    },
                                    "error": err
                                });
                            }
                            connection?.close();
                        })
                        break;
                    case "SMA-100":
                        console.log("case sma 100")
                        //Close connection
                        connection.readHoldingRegisters({ address: 40052, quantity: 16, retry: 100, extra: { unitId: 126 } }, (err, res) => {
                            if (err) {
                                myResolve({
                                    "success": false,
                                    "data": {
                                        "device_ip": ipDevice,
                                        "serial_number": "",
                                        "err_type": "cannot read regs"
                                    },
                                    "error": err
                                });
                            }
                            else {
                                dataArr = res.response.data
                                serialNumber = ""
                                dataArr.map((e) => {
                                    if (e[0] != 0 && e[1] != 0) {
                                        serialNumber += e.toString()
                                    }
                                    else if (e[0] != 0 && e[1] == 0) {
                                        serialNumber += e[0].toString()
                                    }
                                })
                                myResolve({
                                    "success": true,
                                    "data": {
                                        "device_ip": ipDevice,
                                        "serial_number": serialNumber,
                                        "err_type": "success read regs, no error"
                                    },
                                    "error": err
                                });
                            }
                            connection?.close();
                        })
                        break;

                }



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
                const { numberIPPerChunk = 100, model } = config;

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
                                tail = parseInt(k) + parseInt(j)
                                let reqIp = baseIp + "." + tail;
                                console.log("reqIp:" + reqIp + ", model: " + model)
                                // requestArr.push(scanInv(reqIp));
                                nestedArr.push(scanInv(reqIp, model));
                            }
                        };
                        j = parseInt(j) + parseInt(numberIPPerChunk);
                        console.log('j: ', j)
                        const result = await Promise.all(nestedArr);
                        result.map((res) => {
                            // console.log(res)
                            resultInNetWork.push(res);
                            if (res.success) {
                                resultSuccessInNetWork.push({
                                    "device_ip": res?.data?.device_ip,
                                    "serial_number": res?.data?.serial_number,
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
                        "result": resultSuccessInNetWork
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