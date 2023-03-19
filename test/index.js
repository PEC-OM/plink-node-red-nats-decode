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
        console.log("connect: " + ipDevice);
        modbus.tcp.connect(502, ipDevice, { debug: "automaton-2454" }, (err, connection) => {
            // do something with connection
            if (err) {
                console.log(err);
                myResolve({
                    "success": false,
                    "data": {}
                });
            }
            else {
                myResolve({
                    "success": true,
                    "data": {}
                });
            }
        });
    });
};

const scanAllIpV4Range = async (IPv4) => {
    var baseIp = IPv4.split(".");
    baseIp.pop();
    baseIp = baseIp.join(".");
    const numberIPPerChunk = 10;
    let requestArr = [];

    for (let i = 0; i < 255; i++) {
        for (j = 0; j < numberIPPerChunk; j++) {
            if (i + j < 255) {
                let reqIp = baseIp + "." + (i + j);
                requestArr.push(scanInv(reqIp));
            }
        }
    }
    // await scanInv("192.168.1.1");
    // await scanInv("192.168.1.2");
};

const scanAllNetwork = async () => {
    const listIPWithName = getListIpV4();
    const IpArr = Object.values(listIPWithName);
    var listIP = [];
    IpArr.map((ips) => {
        ips.map((ip) => {
            listIP.push(ip)
        })
    });
    let resultInvIp = [];
    for (let i = 0; i < listIP.length; i++) {
        console.log("listIP",)
        await scanAllIpV4Range(listIP[i]);
    }
}

scanAllNetwork();