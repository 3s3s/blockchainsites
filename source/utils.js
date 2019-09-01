'use strict';

const $ = require('jquery');
const zlib = require('zlib');
const g_crypto = require('crypto');
const bip65 = require('bip65');
const bitcoin = require('bitcoinjs-lib');
const fetch = require('node-fetch');
const fs = require('fs');
const Buffer = require('buffer').Buffer;
const constants = require('./constants.js');
const code = bitcoin.opcodes;

const networks = {
  'tBTC' : {
      url: 'http://127.0.0.1:18332',
      user: 'rpc_btc_test',
      password: 'rpc_btc_password_test',
      name: 'Bitcoin',
      NETWORK: bitcoin.networks.testnet
  },
};

exports.parseParams = function (argSplit)
{
  let param = (argSplit[1] != undefined) ? argSplit : [argSplit[0]];

  for(let i = 0; i < param.length; i++){
    if(+param[i] && param[i] !=  ''){
      param[i] = +param[i];
    }
    else if("true" == param[i]) {
      param[i] = true;
    }
    else if("false" == param[i]) {
      param[i] = false;
    }
    else {
      param[i] = '"' + param[i] + '"';
    }
  }

  if(param[0] == '' || param[0] == null){
    param = [];
  }
  return '[' + param.join(', ') + ']';
}

exports.commandLine = function(command)
{
  let str = command.split(' ');

  if(str.length == 1) {
    return exports.sendRPC(str[0], "[]");
  }

  const commandName = str.splice(0, 1);
  const params = exports.parseParams(str);

  return exports.sendRPC(commandName, params);
}

exports.sendRPC = function(method, params, network = "tBTC")
{
  const headers = {
      'Content-Type': 'text/plain',
      'Authorization': 'Basic ' + Buffer.from(networks[network].user + ':' + networks[network].password).toString('base64')
  }

  const body = '{"jsonrpc": "1.0", "id":"curltest", "method": "'+method+'", "params": '+params+' }';

  return fetch(networks[network].url, {
        method: 'post',
        headers: headers,
        body: body})
        .then(res => res.json());

}

exports.importaddress = function(address, label = "", network = "tBTC")
{
    return exports.sendRPC('importaddress', '["'+address+'", "'+label+'", false]', network);
}

exports.broadcast = function(hex, network = "tBTC")
{
    return exports.sendRPC('sendrawtransaction', '["'+hex+'"]', network);
}

exports.getrawtransaction = function(txid, network = "tBTC")
{
    return exports.sendRPC('getrawtransaction', '["'+txid+'", true]', network);
}

exports.listsinceblock = function(hash, network = "tBTC")
{
    return exports.sendRPC('listsinceblock', '["'+hash+'", 1, true]', network);
}

exports.unspents = function(address = "", conf = 0, maxconf = 9999999, network = "tBTC")
{
    const filter = address.length ? ', ["'+address+'"]' : "";

    return exports.sendRPC('listunspent', '['+conf+', '+maxconf+filter+']', network);
}

exports.height = function(network = "tBTC")
{
    return exports.sendRPC('getblockcount', '[]', network);
}

exports.getblockhash = function(height, network = "tBTC")
{
    return exports.sendRPC('getblockhash', '['+height+']', network);
}

exports.Hash160 = function(str)
{
    const buffer = str.length % 2 != 0 ? Buffer.from(str) : Buffer.from(str, "hex");
    return g_crypto.createHash("ripemd160").update(buffer).digest('hex')
}


//TX functions
exports.txBuild = function(data, privateKey, input, nOut)
{
  return new Promise(async (ok, error) => {
    //Start
    const txb = new bitcoin.TransactionBuilder(bitcoin.networks.testnet);
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, bitcoin.networks.testnet);

    const dataSize = data.length/2;

    //Splitting data string
    let outArr = [];
    const outCount = Math.ceil(dataSize / constants.tx.MAX_DATA_SIZE);
    for(let i = 0; i < outCount; i++) {
      outArr.push(data.substring(i * constants.tx.PART_SIZE, (i + 1) * constants.tx.PART_SIZE));
    }

    //Getting input info
    const inputTx = await exports.getrawtransaction(input);
    const allAmount = inputTx.result.vout[nOut].value * 1E8; //Convert to satoshi

    //Calculate fee and amount
    const fee = (dataSize + constants.tx.EMPTY_TX_SIZE) * constants.tx.FEE_FOR_BYTE;
    const amount = allAmount - (fee + outCount * constants.tx.AMOUNT_FOR_EXTRA);

    //Throw error if amount < allAmount
    if(amount > allAmount)
                error(new Error(`Not enough BTC on the input: ${input}`));

    //Build TX
    txb.setVersion(2);
    txb.addInput(input, nOut);

    const output = bitcoin.script.compile([Buffer.from(outArr[0]), code.OP_DROP, keyPair.publicKey, code.OP_CHECKSIG]);
    txb.addOutput(output, amount);

    for(let i = 1; i < outCount; i++) {
      let out = bitcoin.script.compile([Buffer.from(outArr[i]), code.OP_DROP, keyPair.publicKey, code.OP_CHECKSIG]);
      txb.addOutput(out, constants.tx.AMOUNT_FOR_EXTRA);
    }

    // Sign
    const tx = txb.buildIncomplete();
    const scriptSig = bitcoin.script.compile([code.OP_CHECKSIG]); //Change
    tx.setInputScript(0, scriptSig);

    //End
    ok(tx.toHex());
  });
}

//merging outputs for a multi-output transaction
exports.joinOutputs = function(txId, privateKey)
{
  return new Promise(async (ok, error) => {

    //Getting output count
    const txInfo = await exports.getrawtransaction(txId);

    const outCount = txInfo.result.vout.length;
    const allAmount = txInfo.result.vout[0].value * 1E8; //Convert to satoshi

    if(outCount == 1) return ok(txId);

    //Creating tx which join all outputs of the txId
    const txb = new bitcoin.TransactionBuilder(bitcoin.networks.testnet);
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, bitcoin.networks.testnet);

    //Calculate fee and amount
    const fee = (constants.tx.ONE_OUTPUT_SIZE * outCount + constants.tx.EMPTY_TX_SIZE) * constants.tx.FEE_FOR_BYTE;
    const amount = allAmount - fee;

    //Throw error if amount < allAmount
    if(amount > allAmount)
                error(new Error(`Not enough BTC on the input: ${input}`));

    //Build TX
    txb.setVersion(2);

    for(let i = 0; i < outCount; i++) {
      txb.addInput(txId, i);
    }

    const output = bitcoin.script.compile([keyPair.publicKey, code.OP_CHECKSIG]); //Change
    txb.addOutput(output, amount);

    // Sign
    const tx = txb.buildIncomplete();
    for(let i = 0; i < outCount; i++) {
      let scriptSig = bitcoin.script.compile([code.OP_DROP]); //Change
      tx.setInputScript(i, scriptSig);
    }

    const SendTx = await exports.broadcast(tx.toHex());

    //End
    ok(SendTx.result);

  });
}

//trimming html
exports.trimHTML = function(data)
{
  return new Promise((ok, error) => {
    let removeSpaces = data.replace(/  /g, '');
    removeSpaces = removeSpaces.replace(/(\r\n|\n|\r)/mg, '');
    ok(removeSpaces);
  });
}

//Wallet functions
exports.genPrivateKey = function(text = 'Here is any text')
{
  return new Promise((ok, error) => {
    const hash = bitcoin.crypto.sha256(Buffer.from(text));
    const keyPair = bitcoin.ECPair.fromPrivateKey(hash, {
      network: bitcoin.networks.testnet
    });
    ok(keyPair.toWIF())
  });
}

exports.getPubKey = function(privateKey)
{
  return new Promise((ok, error) => {
    const keyPair = bitcoin.ECPair.fromWIF(privateKey, bitcoin.networks.testnet);
    ok(keyPair.publicKey.toString('hex'));
  });
}

//fs functions
exports.saveLocal = function(html, path)
{
    return new Promise((ok, error) => {
      fs.writeFile(path, html, (err) => {
        ok();
      });
    });
}

exports.openHTML = function(filePath)
{
  return new Promise((ok, error) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      ok(data);
    });
  });
}
