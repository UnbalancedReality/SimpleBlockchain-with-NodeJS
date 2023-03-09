'use strict';

//let logger = require("logger");

function Block(options) {
    this.options = options;
}

Block.DETAILS = {
    alias: 'b',
    description: 'block',
    commands: ['get', 'all'],
    options: {create: Boolean},
    shorthands: {
        s: ['--get'], 
        a: ['--all']
    },
    payload: function(payload, options) 
    {
        options.start = true;
    }
};

Block.prototype.run = function() {
    let instance = this,
    options = instance.options;

    if(options.get) {
        instance.runCmd('curl http://localhost:' + options.argv.original[2] + '/getBlock?index=' + options.argv.original[3]);
    }
    if(options.all){
        instance.runCmd('Curl http://localhost:' + options.argv.original[2] + '/blocks');
    }
};

Block.prototype.runcmd = function(cmd) {
    const {exec} = require('child_process');
    logger.log(cmd);
    exec(cmd, (err,stdout, stderr) => {
        if(err) {
            logger.log('err: ${err}');
        }
        logger.log('stdout: ${stdout}');
    });
};

exports.Impl = Block;
exports.BlockHeader = class BlockHeader {
    constructor(version, previousBlockHeader, merkleRoot, time, nBits, nounce){
        this.version = version;

        //A SHA256(SHA256()) hash of the previous block's header
        this.previousBlockHeader = previousBlockHeader;
        
        //A merkle tree is a binary tree that holds hash pairs of the tree
        this.merkleRoot = merkleRoot;

        //unix epoch time when the header started hashing
        this.time = time;
    }
    
};

exports.Block = class Block {
    constructor(BlockHeader, index, txns) {
        this.BlockHeader = BlockHeader;

        //The genesis block is the first block, block 0
        this.index = index;

        //txns are the raw transactrions in the block
        this.txns = txns;
    }
}