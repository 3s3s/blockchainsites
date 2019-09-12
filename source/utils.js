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
      NETWORK: bitcoin.networks.testnet,
      segwit: true
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
    const keyPair = bitcoin.ECPair.makeRandom({
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

////////////////////////////////

exports.getbalance = function(network = "tBTC")
{
    return exports.sendRPC('getbalance', '["*"]', network);
}
exports.sendtoaddress = function(address, amount, network = "tBTC")
{
    return exports.sendRPC('sendtoaddress', '["'+address+'", '+1*amount.toFixed(7)+']', network);
}
exports.getnewaddress = function(label = "", type = "legacy", network = "tBTC")
{
    return exports.sendRPC('getnewaddress', '["'+label+'", "'+type+'"]', network);
}
exports.testmempoolaccept1 = function(rawtx, network = "tBTC")
{
    return exports.sendRPC('testmempoolaccept', '[["'+rawtx+'"]]', network);
}
exports.importprivkey = function(privkey, network = "tBTC")
{
    return exports.sendRPC('importprivkey', '["'+privkey+'", "generated", false]', network);
}


function GetRedeemScript(keyPair)
{
    const redeemScript = bitcoin.script.compile([
      //redeem: <signature> <data> <data>
      bitcoin.opcodes.OP_DROP,
      bitcoin.opcodes.OP_DROP,
      Buffer.from(keyPair.publicKey, "hex"),
      bitcoin.opcodes.OP_CHECKSIG
      //bitcoin.opcodes.OP_DROP,
      //bitcoin.opcodes.OP_TRUE
    ])

    return redeemScript;
}

function GetP2SH(keyPair, network = "tBTC")
{
    return bitcoin.payments.p2sh({ redeem: { output: GetRedeemScript(keyPair), network: networks[network].NETWORK }, network: networks[network].NETWORK });
}

function GetP2WSH(keyPair, network = "tBTC")
{
    return bitcoin.payments.p2wsh({ redeem: { output: GetRedeemScript(keyPair), network: networks[network].NETWORK }, network: networks[network].NETWORK });
}

function chunks (buffer, chunkSize) {
	assert(Buffer.isBuffer(buffer),           'Buffer is required');
	assert(!isNaN(chunkSize) && chunkSize > 0, 'Chunk size should be positive number');

	var result = [];
	var len = buffer.length;
	var i = 0;

	while (i < len) {
		result.push(buffer.slice(i, i += chunkSize));
	}

	return result;
}

function assert (cond, err) {
	if (!cond) throw new Error(err);
}

function GetFirstTransactions(sendto1, keyPair, outArr, network)
{
  return new Promise(async ok => {
    let ret = [];
    const script = networks[network].segwit ? GetP2WSH(keyPair, network) : GetP2SH(keyPair, network);
    for (let i=0; i<outArr.length; i++)
    {
      const first_transaction = await exports.sendtoaddress(script.address, sendto1, network);

      if (!first_transaction || first_transaction.error|| !first_transaction.result.length)
        return ok({result: false, message: 'sendtoaddress - error!'});

      ret.push(first_transaction);
    }
    return ok({result: true, transactions: ret, script: script});
  })
}

function AddInputs(sendto1, first, network)
{
  return new Promise(async ok =>
  {
    const txb = new bitcoin.TransactionBuilder(networks[network].NETWORK);

    for (let i=0; i<first.transactions.length; i++)
    {
      const firstTX = await exports.getrawtransaction(first.transactions[i].result, network);
      if (!firstTX || firstTX.error)
        return ok({result: false, message: 'getrawtransaction failed!'});

      //find our output
      for (let j=0; j<firstTX.result.vout.length; j++)
      {
        if (firstTX.result.vout[j].value*1E8 != sendto1*1E8)
          continue;

        //add old output as new input
        txb.addInput(first.transactions[i].result, firstTX.result.vout[j].n, null, first.script.output);
        break;
      }
    }

    return ok({result: true, txb: txb});
  })
}

async function SaveChunkToBlockchain(buffer, keyPair, newAddress, network = "tBTC")
{
  //Splitting data string to small chunks (MAX_DATA_SIZE*2)
  const outArr = chunks(buffer, constants.tx.MAX_DATA_SIZE*2);

  if (network == 'tBTC')
    constants.tx.FEE_FOR_BYTE = 5;

  const minFee = constants.tx.EMPTY_TX_SIZE*constants.tx.FEE_FOR_BYTE;
  const fee = (buffer.length + constants.tx.EMPTY_TX_SIZE) * constants.tx.FEE_FOR_BYTE;
  const balance = await exports.getbalance();

  //check user balance
  if (!balance || balance.error || balance.result*1 < (fee*1+2*minFee)/1E8)
    return {result: false, message: 'Insufficient funds!'};

  //Send first transactions on random address
  const sendto1 = ((fee/outArr.length+2*minFee)/1E8).toFixed(7)*1;
  const first = await GetFirstTransactions(sendto1, keyPair, outArr, network);

  if (first.result == false)
    return {result: false, message: first.message};

  assert(outArr.length == first.transactions.length);

  const inputs = await AddInputs(sendto1, first, network);

  if (inputs.result == false)
    return {result: false, message: inputs.message};

  inputs.txb.addOutput(newAddress.result, fee*1+minFee);

  const tx = inputs.txb.buildIncomplete();

  const redeemScript = first.script.redeem.output;
  for (let i=0; i<first.transactions.length; i++)
  {
    //const signatureHash = tx.hashForSignature(i, redeemScript, bitcoin.Transaction.SIGHASH_ALL);
    const signatureHash = networks[network].segwit ?
      tx.hashForWitnessV0(i, redeemScript, (sendto1*1E8).toFixed(0)*1, bitcoin.Transaction.SIGHASH_ALL) :
      tx.hashForSignature(i, redeemScript, bitcoin.Transaction.SIGHASH_ALL);

    const signature = bitcoin.script.signature.encode(keyPair.sign(signatureHash), bitcoin.Transaction.SIGHASH_ALL);

    //Splitting small chunk to the script data chunks (MAX_DATA_SIZE)
    const data = chunks(outArr[i], constants.tx.MAX_DATA_SIZE);

    networks[network].segwit ?
      tx.setWitness(i, [
        signature,
        data[0],
        data.length == 2 ? data[1] : Buffer.from('00', 'hex'),
        redeemScript
      ]) :
      tx.setInputScript(i, bitcoin.script.compile([
        signature,
        data[0],
        data.length == 2 ? data[1] : Buffer.from('00', 'hex'),
        redeemScript
      ]));
  }

  const ret = await exports.broadcast(tx.toHex());

  if (ret.error)
    return {result: false, message: ret.error.message};

  return {result: true, txid: ret.result};

}

exports.SaveBufferToBlockchain = function(buffer, network = "tBTC")
{
  return new Promise(ok => {
    zlib.deflate(buffer, async (err, deflated_buffer) =>
    {
      //splitting binary data to big chunks MAX_TRANSACTION_SIZE
      const bigChunks = chunks(deflated_buffer, constants.tx.MAX_TRANSACTION_SIZE);

      //create first address pair
      const keyPair = bitcoin.ECPair.makeRandom({network: networks[network].NETWORK });

      const ret = await exports.importprivkey(keyPair.toWIF(), network);
      if (ret.error)
        return ok({result: false, message: 'importprivkey RPC error!'});

      //Get second address
      const newAddress = networks[network].segwit ?
        await exports.getnewaddress("bech32", "bech32", network) :
        await exports.getnewaddress("legacy", "legacy", network) ;

      if (!newAddress || newAddress.error)
        return ok({result: false, message: 'getnewaddress RPC error!'});

      //Save all big chunks to blockchain and get transactions to array
      const txsArray = []
      for (let i=0; i<bigChunks.length; i++)
      {
        const ret = await SaveChunkToBlockchain(bigChunks[i], keyPair, newAddress, network);
        if (!ret.result || !ret.txid)
          return ok(ret);

        txsArray.push(ret.txid);
      }

      if (txsArray.length == 0)
        return ok({result: false, message: "unknown error!"});

      if (txsArray.length == 1)
        return ok({result: true, txid: txsArray[0]});

      //Save transactions as data to blockchain
      const dataString = JSON.stringify(txsArray);
      const strJSON = JSON.stringify({type: 'txs', base64: Buffer.from(dataString).toString('base64')});

      return ok(await exports.SaveBufferToBlockchain(Buffer.from(strJSON)));
    });
  });
}

exports.SaveTextToBlockchain = async function(dataString, network = "tBTC")
{
  const strJSON = JSON.stringify({type: 'text', base64: Buffer.from(dataString).toString('base64')})
  return await exports.SaveBufferToBlockchain(Buffer.from(strJSON));
}

function GetDataFromTXID(txid, network = "tBTC")
{
  return new Promise(async ok => {
    const txData = await exports.getrawtransaction(txid, network);
    if (!txData || txData.error)
      return ok({type: 'error', data: txData});

    let fullData = "";
    for (let i=0; i<txData.result.vin.length; i++)
    {
        fullData += txData.result.vin[i].txinwitness[1];
        fullData += txData.result.vin[i].txinwitness[2] == "00" ? "" : txData.result.vin[i].txinwitness[2];
    }

    return ok({type: 'success', string: fullData});
  });
}

function GetObjectFromFullDataString(fullDataString)
{
  return new Promise(async ok => {
    zlib.inflate(Buffer.from(fullDataString, "hex"), (err, inflated_buffer) =>
    {
      try {
        return ok(JSON.parse(inflated_buffer.toString('utf8')));
      } catch (e) {
        return ok({type: 'error', data: fullDataString, err: err, error: e});
      }
    });
  });
}

function ErrorPage(message = "Error!")
{
  return "<html><body><h2>"+message+"</h2></body></html>"
}

function GetDataFromObject(obj, network = "tBTC")
{
  return new Promise(async ok => {
    if (obj.type == 'error')
      return ok(ErrorPage());

    if (obj.type == 'text')
      return ok(obj.base64);

    if (obj.type == 'txs')
    {
      try {
        const txsArray = JSON.parse(Buffer.from(obj.base64, 'base64').toString('utf8'));

        let fullData = "";
        for (let i=0; i<txsArray.length; i++)
        {
          const data = await GetDataFromTXID(txsArray[i], network);
          if (data.type == 'error')
            return ok(ErrorPage());

          fullData += data.string;
        }

        const objJSON = await GetObjectFromFullDataString(fullData);

        return ok(await GetDataFromObject(objJSON, network));
      }
      catch(e) {
        return ok(ErrorPage());
      }
    }
  });
}

exports.GetPageFromBlockchain = function(txid, network = "tBTC")
{
  return new Promise(async ok => {

    const data = await GetDataFromTXID(txid, network);
    if (data.type == 'error')
      return ok(ErrorPage());

    const obj = await GetObjectFromFullDataString(data.string);

    return ok(await GetDataFromObject(obj, network));

  });


}
