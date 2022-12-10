const crypto = require('crypto');
const Swarm = require('discovery-swarm');
const defaults = require('dat-swarm-defaults');
const getPort = require('get-port');
const chain = require("./chain");
//const { join } = require('path');
const CronJob = require('cron').CronJob;
const express = require("express");
const bodyParser = require('body-parser');
const wallet = require('./wallet');
const fs = require('fs');

const peers = {};
let connSeq = 0;
let registeredMiners = [];
let lastBlockMinedBy = null;
const peerId = null;

const job = new CronJob('30 * * * * *', function() {
    let index = 0; //block 0

    if(lastBlockMinedBy) {
        let newIndex = registeredMiners.indexOf(lastBlockMinedBy);
        index = (newIndex+1 > registeredMiners.length-1) ? 0 : newIndex + 1;
    }

    lastBlockMinedBy = registeredMiners[index];
    console.log('----Requesting New Block From: ' + registeredMiners[index] + ', index: ' + index);
    console.log(JSON.stringify(registeredMiners));

    if(registeredMiners[index] === myPeerId.toString('hex')) {
        console.log('----Create Next Block----');
        let newBlock = chain.generateNextBlock(null);
        chain.addBlock(newBlock);
        console.log(JSON.stringify(newBlock));
        writeMessageToPeers(MessageType.RECVIEVE_NEW_BLOCK, newBlock);
        console.log(JSON.stringify(chain.blockchain));
        console.log('----Create Next Block----');
    }
});
job.start();

//Channel name for all nodes to connect to.
let channel = 'myBlockchain';

let MessageType = {
    REQUEST_BLOCK: 'requestBlock',
    RECIEVE_NEXT_BLOCK: 'recieveNextBlock',
    REQUEST_ALL_REGISTERD_MINERS: 'requestAllRegisterdMiners',
    REGISTER_MINER: 'registerMiner',
    RECVIEVE_NEW_BLOCK: 'recieveNewBlock'
};

const myPeerId = crypto.randomBytes(32);
console.log('myPeerId: ' + myPeerId.toString('hex'));

chain.createDb(myPeerId.toString('hex'));

let initHttpServer = (port) => {
    let http_port = '80' + port.toString().slice(-2);
    let app = express();
    app.use(bodyParser.json());

        //Blocks service gets all blocks
    app.get('/blocks', (req, res) => res.send(JSON.stringify(chain.blockchain)));
    
    //getBlock service retrieves one block based on a specific index
    app.get('/getBlock', (req, res) => {
        let blockIndex = req.query.index;
        res.send(chain.blockchain[blockIndex]);
    });

        //getDBBlock gets a LevelDB database based on an index
    app.get('/getDBBlock', (req, res) => {
        let blockIndex = req.query.index;
        chain.getDbBlock(blockIndex, res);
    });

    app.get('/getWallet', (req, res) => {
        res.send(wallet.initWallet());
    });
    app.listen(http_port, () => console.log('Listening http on port: ' + http_port));
};


//Console object to hold peerId
const config = defaults({
    id: myPeerId
});

//initalises a swarm library using the config object
const swarm = Swarm(config);

(async () =>{
    // listens to random port selection
    const port = await getPort();

    initHttpServer(port); //calls the initHttpServer
    
    swarm.listen(port);
    console.log('Listening port: ' + port);
    
    swarm.join(channel);
    swarm.on('connection', (conn, info) => {
        const seq = connSeq;
        peerId = info.id.toString('hex');
        console.log('connected #${seq} to peer: ${peerId}');
        if(info.initiator){
            try {
                //setKeepalive ensures the connection stays active with other peers
                conn.setKeepAlive(true, 600);
            }catch(exception) {
                console.log('exception', exception);
            }
        }

        conn.on('data', data => {
            let message = JSON.parse(data);
            console.log('----Revcieved Message start----');
            console.log(
                'from: ' + peerId.toString('hex'),
                'to: ' + peerId.toString(message.to),
                'my: ' + myPeerId.toString('hex'),
                'type: ' + JSON.stringify(message.type)
            );
            console.log('----End of message----');
    
            switch(message.type) {
                case MessageType.REQUEST_BLOCK:
                    console.log("----Request Block----");
                    let requestedIndex = (JSON.parse(JSON.stringify(message.data))).index;
                    let requestedBlock = chain.getBlock(requestedIndex);
                    if(requestedBlock) {
                        writeMessageToPeerToId(peerId.toString('hex'), MessageType.RECIEVE_NEXT_BLOCK, requestedBlock);
                    } else {
                        console.log('No block found at index: ' + requestedIndex);
                        console.log('----RequestBlock----');
                    }
                    break;
                case MessageType.RECIEVE_NEXT_BLOCK:
                    console.log('----Recieve Next Block----');
                    chain.addBlock(JSON.parse(JSON.stringify(message.data)));
                    console.log(JSON.stringify(chain.blockchain));
                    let nextBlockIndex = chain.getLastestBlock().index+1;
                    console.log('----Request Next Block at index: ' + nextBlockIndex);
                    writeMessageToPeers(MessageType.REQUEST_BLOCK, {index: nextBlockIndex});
                    console.log('----Recieve Next Block----');
                    break;
                case MessageType.REQUEST_ALL_REGISTERD_MINERS:
                    console.log('----Request All Registered Miners----' + message.to);
                    writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
                    registeredMiners = JSON.parse(JSON.stringify(message.data));
                    console.log('----Request All Registered Miners----' + message.to);
                    break;
                case MessageType.REGISTER_MINER:
                    console.log('----Register Miner----' + message.to);
                    let miners = JSON.stringify(message.data);
                    registeredMiners = JSON.parse(miners);
                    console.log('----Register Miner----' + message.to);
                    break;
            }
        });

        conn.on('close', () => {
            console.log('connection ${seq} closed, peerId: ${peerId}');
            if(peers[peerId].seq === seq)
            {
                delete peers[peerId]
                console.log('----RegisteredMiners before: ' + JSON.stringify(registeredMiners));
                let index = registeredMiners.indexOf(peerId);
                if(index > -1) {
                    registeredMiners.splice(index, 1);
                    console.log('----RegisteredMiners end: ' + JSON.stringify(registeredMiners));
                }
            }
        });

        if(!peers[peerId]){
            peers[peerId] = {}
        }
        peers[peerId].conn = conn;
        peers[peerId].seq = seq;
        connSeq++;
    })
})();

//setTimeout is a native Node.js function that sends a message after ten seconds to available peers
setTimeout(function(){
    writeMessageToPeers('hello', null);
}, 10000);
//writeMessageToPeers sends messages to all connected peers
writeMessageToPeers = (type, data) => {
    for(let id in peers) {
        console.log('---- writeMessageToPeers start----');
        console.log('type: ' + type + ', to: ' + id);
        console.log('----writeMessageToPeers End----');
        sendMessage(id, type, data);
    }
};

//writeMessageToPeerToId sends a message to a specific peerId
writeMessageToPeerToId = (toId, type, data) => {
    for(let id in peers) {
        if(id === toId) {
            console.log('----writeMessageToPeerToId start----');
            console.log('type: ' + type + ', to: ' + toId);
            console.log('----writeMessageToPeerToId end----');
            sendMessage(id, type, data);
        }
    }
};

/*send message is a generic method that is used to send a message formatted with params that you would like to pass
    to/from: the sender and reciever peerId
    type: the message type
    data: any data shared on the P2P Network
*/

sendMessage = (id, type, data) => {
    peers[id].conn.write(JSON.stringify({
        to: id,
        from: myPeerId,
        type: type,
        data: data
    }
    ));
};

setTimeout(function() {
    writeMessageToPeers(MessageType.REQUEST_ALL_REGISTERD_MINERS, null);
}, 5000);

setTimeout(function() {
    registeredMiners.push(myPeerId.toString('hex'));
    console.log('----Register as new miner----');
    console.log(registeredMiners);
    writeMessageToPeers(MessageType.REGISTER_MINER, registeredMiners);
    console.log('----Register as new miner----');
}, 7000);

