----------------Blockchain using NodeJS---------------

Features:

1. This blockchain contains a basic Peer-to-peer network that can find peers, and deploy servers to the users TCP address. It utilizes the 'discovery-swarm', 'dat-swarm-defaults', and 'get-port' libraries for the network to function.
2. The Block object contains a BlockHeader object with a version, previous BlockHeader's hash, Merkle root, and a timestamp.
3. Contains a basic Proof of Work that uses nounce and nBits
4. Uses a Proof of Stake to register miners, and entrusting them to generate blocks. The Cron library is used to keep track of the miners, keep track of which miner mined the last block.
5. The LevelDB library stores the block's and transaction information.
6. A basic private-public wallet is created by using the Elliptic-Curve library, which makes private and public key combinations.
7. An API is included by using the HTTP service, and the Express and Body-Parser libraries. The following commands can be used: blocks, getBlock, getDBBlock, and getWallet. The Block command displays all the blocks in the chain. the GetBlock command displays a block with a specific index. The getWallet command displays the wallet information. 
