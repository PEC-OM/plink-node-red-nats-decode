const { exec } = require('child_process');

export const scanInv = async (baseIp) => {
    const requestExec = [];

    for (let i = 0; i < 255; i++) {
        const execCmd = `/home/ubuntu/modpoll/arm-linux-gnueabihf/modpoll -t 4:hex -a 1 -r 40053 -c 16 -1 ${baseIp}`;
        requestExec.push(execCmd);
    };

    return requestExec;
}