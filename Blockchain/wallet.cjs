const EC = require('elliptic').ec;
const fs = require('fs');
const chain = require('./Chain.cjs');

const ec = new EC('secp256k1');//creates and initialises the EC context
const privateKeyLocation = __dirname + '/wallet/private_key';

exports.initWallet = () => {
    let privateKey;
    
    // Generates a new wallet if one doesn't exist
    if(fs.existsSync(privateKeyLocation)) {
        const buffer = fs.readFileSync(privateKeyLocation, 'utf-8');
        privateKey = buffer.toString();
    } else {
        privateKey = generatePrivateKey();
        fs.writeFileSync(privateKeyLocation, privateKey);
    }

    const key = ec.keyFromPrivate(privateKey, 'hex');
    const publicKey = key.getPublic().encode('hex');
    return({'privateKeyLocation' : privateKeyLocation, 'publicKey' : publicKey});
};

const generatePrivateKey = () => {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

let wallet = this;
let retVal = wallet.initWallet();
console.log(JSON.stringify(retVal));
