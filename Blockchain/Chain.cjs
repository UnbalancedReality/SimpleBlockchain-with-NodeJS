const Block = require("./Block.cjs").Block;
const blockHeader = require("./Block.cjs").BlockHeader;
const moment = require("moment");
const CryptoJS = require("crypto-js");
const {Level} = require('level');
const fs = require('fs');
const { BlockHeader } = require("./Block.cjs");
let db;

let createDb = (peerId) => {
    let dir = __dirname + '/db/' + peerId;
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        db = new Level(dir);
        storeBlock(getGenesisBlock());
    }
}

let getGenesisBlock = () => {
    let BlockHeader = new blockHeader(1, null, "0xbc000000000000000000000000000000000000000000000000000000", moment().unix(), 0x171b7320, '1CAD2B8C');
    console.log('\n');
    return new Block(blockHeader, 0, null);
};

let getLatestBlock = () => blockchain[blockchain.length-1];

let addBlock = (newBlock) => {
    let prevBlock = getLatestBlock();
    if(prevBlock.index < newBlock.index) {
        blockchain.push(newBlock);
    }
}

let getBlock = (index) => {
    if(blockchain.length-1 >= index) {
        return blockchain[index];
    }else {
        return null;
    }
}

let getDbBlock = (index, res) => {
    db.get(index, function (err, value) {
        if(err) return res.send(JSON.stringify((err)), (res.send(value)));
    });
}

//storeBlock stores the new block
let storeBlock = (newBlock) => {
    db.put(newBlock.index, JSON.stringify(newBlock), function (err) {
        if(err) return console.log('Oops!', err) //a type of I/O error
        console.log('----Inserting Block Index: ' + newBlock.index);
    })
}

const generateNextBlock = (txns) => {
    const prevBlock = getLatestBlock(), prevMerkleRoot = prevBlock.BlockHeader.merkleRoot;
    nextIndex = prevBlock.index + 1, nextTime = moment().unix, nextMerkleRoot = CryptoJS.SHA256(1, prevMerkleRoot, nextTime).toString();

    const blockHeader = new BlockHeader(1, prevMerkleRoot, nextMerkleRoot, nextTime);
    const newBlock= new Block(blockHeader, nextIndex, txns);
    blockchain.push(newBlock);
    storeBlock(newBlock);
    return newBlock;
}

const blockchain = [getGenesisBlock()];

if(typeof exports !='undefined') {
    exports.addBlock = addBlock;
    exports.getBlock = getBlock;
    exports.blockchain = blockchain;
    exports.getLatestBlock = getLatestBlock;
    exports.createDb = createDb;
    exports.generateNextBlock = generateNextBlock;
    exports.getDbBlock = getDbBlock;
    exports.dir = __dirname;
}

