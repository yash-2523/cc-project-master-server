const fs = require('fs');
const exec = require("ssh-exec");
const axios = require('axios');

axios.default.timeout = 60000

async function getData() {
    const jsonData = fs.readFileSync('data.json')
    return JSON.parse(jsonData)
}

async function createMachine(req, res) {
    // iterate through the data and create a machine for each
    const data = await getData()
    let response = false;
    const {cpus, memory, disk} = req.body;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            if(response){
                break;
            }
            const machine = data[key]
            if(machine.totalInstances - machine.activeInstances > 0) {
                let tempFlag = true;
                    let resp = await axios({
                        method: 'post',
                        url: `${machine.url}/create_vm`,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: {
                            cpu: cpus,
                            ram: memory,
                            disk: disk
                        }
                    }).catch(err => {
                        console.log(err);
                        tempFlag = false;
                    })

                    if(!tempFlag) {
                        continue;
                    }
                    // get response status code
                    if(resp.status !== 200){
                        continue;
                    }                    

                    let tempobj = {};
                    let temp = resp.data[1].stdout.toString().split("\n").map(t => { let val = t.replace(/\s\s+/g, ' ').split(": "); tempobj[val[0]] = val[1]; return tempobj; });
                    console.log(temp, tempobj);

                    machine.activeInstances += 1;
                    machine.instances.push({
                        "id": "slave-1-"+(machine.instances.length+1),
                        "vm-name": tempobj["Name"],
                        "assigned-ip": tempobj["IPv4"],
                        "start-time": Date.now(),
                        "end-time": Date.now(),
                        "status": "active"
                    })
                    data[key] = machine;
                    fs.writeFileSync('data.json', JSON.stringify(data))
                    response = {
                        success: true,
                        message: "Machine stopped successfully",
                        data: {
                            machineInfo: tempobj,
                            privateKey: resp.data[2]
                        }
                    }
                    
                }
            }
        }
    if(response) {
        return res.status(200).json(response)
    }else{
        res.status(500).json({ success: false,message: "No machines available" });
    }
}

async function stopVM(req, res) {
    const data = await getData()
    let response = false;
    const {vmName} = req.body;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            for(let i=0; i<data[key].instances.length; i++) {
                if(data[key].instances[i]["vm-name"] && data[key].instances[i]["vm-name"] === vmName) {
                    // stop firecracker vm on this machine
                    let resp = await axios({
                        method: 'post',
                        url: `${data[key].url}/stop-vm`,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: {
                            name: vmName
                        }
                    }).catch(err => {
                        console.log(err);
                    })
                    // get response status code
                    if(resp.status !== 200){
                        continue;
                    }
                    data[key].instances[i].status = "inactive";
                    data[key].instances[i]["end-time"] = Date.now();
                    data[key].activeInstances -= 1;
                    response = {
                        success: true,
                        message: "Machine stopped successfully",
                        data: {
                            machineInfo: data[key].instances[i]
                        }
                    }
                    break;
                }
            }
        }
    }
    if(response) {
        fs.writeFileSync('data.json', JSON.stringify(data))
        return res.status(200).json(response)
    }else{
        res.status(500).json({ success: false,message: "No machines available" });
    }
}

async function getUsage(req, res) {
    const data = await getData()
    let response = false;
    const {vmName} = req.body;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            for(let i=0; i<data[key].instances.length; i++) {
                if(data[key].instances[i]["vm-name"] && data[key].instances[i]["vm-name"] === vmName) {
                    // stop firecracker vm on this machine
                    let resp = await axios({
                        method: 'post',
                        url: `${data[key].url}/vm-info`,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: {
                            name: vmName
                        }
                    }).catch(err => {
                        console.log(err);
                    })
                    // get response status code
                    if(!resp || !resp.status || resp.status !== 200){
                        continue;
                    }
                    let tempobj = {};
                    let temp = resp.data.stdout.toString().split("\n").map(t => { let val = t.replace(/\s\s+/g, ' ').split(": "); tempobj[val[0]] = val[1]; return tempobj; });
                    console.log(temp, tempobj);
                    response = {
                        success: true,
                        message: "Machine Usage fetched successfully",
                        data: {
                            machineInfo: data[key].instances[i],
                            usage: tempobj
                        }
                    }
                    break;
                }
            }
        }
    }
    if(response) {
        return res.status(200).json(response)
    }else{
        res.status(500).json({ success: false,message: "No machines available" });
    }
}


async function runCommand(req,res) {
    const data = await getData()
    let response = false;
    const {vmName, command} = req.body;
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            for(let i=0; i<data[key].instances.length; i++) {
                if(data[key].instances[i]["vm-name"] && data[key].instances[i]["vm-name"] === vmName) {
                    // stop firecracker vm on this machine
                    let resp = await axios({
                        method: 'post',
                        url: `${data[key].url}/give-command`,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: {
                            name: vmName,
                            command: command
                        }
                    }).catch(err => {
                        console.log(err);
                    })
                    // get response status code
                    if(!resp || !resp.status || resp.status !== 200){
                        continue;
                    }
                    response = {
                        success: true,
                        message: "Command executed successfully",
                        data: {
                            machineInfo: data[key].instances[i],
                            output: {
                                stdout: resp.data.stdout,
                                stderr: resp.data.stderr,
                                returnCode: resp.data.returnCode
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
    if(response) {
        return res.status(200).json(response)
    }else{
        res.status(500).json({ success: false,message: "No machines available" });
    }
}


module.exports = {
    createMachine,
    stopVM,
    getUsage,
    runCommand
}


