'use strict'
const ipcRender = electron.ipcRenderer;

const browser = new Navigation({
  defaultFavicons: true
});

//function override for specific URL tbtc://
browser._purifyUrl = function (url) {
    if (urlRegex({
            strict: false,
            exact: true
        }).test(url)) {
        url = (url.match(/^https?:\/\/.*/)) ? url : 'http://' + url;
    } else {
      if(url.slice(0, 7) == 'tbtc://') return 'http://github.com';    //Specific URL
        url = (!url.match(/^[a-zA-Z]+:\/\//)) ? 'https://www.google.com/search?q=' + url.replace(' ', '+') : url;
    }
    return url;
}

const slideMove = function(anchorLink, index, slideAnchor, slideIndex) {
  $('.nav-item').removeClass('active');
  switch (slideIndex) {
    case 0:
      $('#itemInfo').addClass('active');
      ipcRender.send('getbalance');
      break;
    case 1:
      $('#itemConstructor').addClass('active');
      ipcRender.send('getbalance');
      break;
    case 2:
      $('#itemSearch').addClass('active');
      break;
    case 3:
      $('#itemTools').addClass('active');
      break;
    case 4:
      $('#itemBrowser').addClass('active');
      break;
  }
}

const loadPage = function() {
  $('#itemInfo').addClass('active');
  ipcRender.send('getbalance');
}

$(document).ready(function() {
  // browser.newTab('http://github.com/');

  $('#fullpage').fullpage({
    scrollingSpeed: 500,
    anchors: ["first", "second", "third"],
    verticalCentered: false,
    scrollOverflow: true,
    scrollOverflowOptions: {preventDefault:false},
    afterSlideLoad: slideMove,
    afterLoad: loadPage
  });

  $('#createBtn').click(() => {
    $.fn.fullpage.reBuild();
  });

  $('.openBtn').click(() => {
    $.fn.fullpage.reBuild();
  });

  $('#formRPC').submit(() => {
    setTimeout(() => {
      $.fn.fullpage.reBuild();
    }, 500);
  });
});

const commandNames = [
  'getbestblockhash',
  'getblock',
  'getblockchaininfo',
  'getblockcount',
  'getblockhash',
  'getblockheader',
  'getblockstats',
  'getchaintips',
  'getchaintxstats',
  'getdifficulty',
  'getmempoolancestors',
  'getmempooldescendants',
  'getmempoolentry',
  'getmempoolinfo',
  'getrawmempool',
  'gettxout',
  'gettxoutproof',
  'gettxoutsetinfo',
  'preciousblock',
  'pruneblockchain',
  'savemempool',
  'scantxoutset',
  'verifychain',
  'verifytxoutproof',
  'getmemoryinfo',
  'getrpcinfo',
  'help',
  'logging',
  'stop',
  'uptime',
  'generate',
  'generatetoaddress',
  'getblocktemplate',
  'getmininginfo',
  'getnetworkhashps',
  'prioritisetransaction',
  'submitblock',
  'submitheader',
  'addnode',
  'clearbanned',
  'disconnectnode',
  'getaddednodeinfo',
  'getconnectioncount',
  'getnettotals',
  'getnetworkinfo',
  'getnodeaddresses',
  'getpeerinfo',
  'listbanned',
  'ping',
  'setban',
  'setnetworkactive',
  'analyzepsbt',
  'combinepsbt',
  'combinerawtransaction',
  'converttopsbt',
  'createpsbt',
  'createrawtransaction',
  'decodepsbt',
  'decoderawtransaction',
  'decodescript',
  'finalizepsbt',
  'fundrawtransaction',
  'getrawtransaction',
  'joinpsbts',
  'sendrawtransaction',
  'signrawtransactionwithkey',
  'testmempoolaccept',
  'utxoupdatepsbt',
  'createmultisig',
  'deriveaddresses',
  'estimatesmartfee',
  'getdescriptorinfo',
  'signmessagewithprivkey',
  'validateaddress',
  'verifymessage',
  'abandontransaction',
  'abortrescan',
  'addmultisigaddress',
  'backupwallet',
  'bumpfee',
  'createwallet',
  'dumpprivkey',
  'dumpwallet',
  'encryptwallet',
  'getaddressesbylabel',
  'getaddressinfo',
  'getbalance',
  'getnewaddress',
  'getrawchangeaddress',
  'getreceivedbyaddress',
  'getreceivedbylabel',
  'gettransaction',
  'getunconfirmedbalance',
  'getwalletinfo',
  'importaddress',
  'importmulti',
  'importprivkey',
  'importprunedfunds',
  'importpubkey',
  'importwallet',
  'keypoolrefill',
  'listaddressgroupings',
  'listlabels',
  'listlockunspent',
  'listreceivedbyaddress',
  'listreceivedbylabel',
  'listsinceblock',
  'listtransactions',
  'listunspent',
  'listwalletdir',
  'listwallets',
  'loadwallet',
  'lockunspent',
  'removeprunedfunds',
  'rescanblockchain',
  'sendmany',
  'sendtoaddress',
  'sethdseed',
  'setlabel',
  'settxfee',
  'signmessage',
  'signrawtransactionwithwallet',
  'unloadwallet',
  'walletcreatefundedpsbt',
  'walletlock',
  'walletpassphrase',
  'walletpassphrasechange',
  'walletprocesspsbt',
  'help getzmqnotifications',
  'help getbestblockhash',
  'help getblock',
  'help getblockchaininfo',
  'help getblockcount',
  'help getblockhash',
  'help getblockheader',
  'help getblockstats',
  'help getchaintips',
  'help getchaintxstats',
  'help getdifficulty',
  'help getmempoolancestors',
  'help getmempooldescendants',
  'help getmempoolentry',
  'help getmempoolinfo',
  'help getrawmempool',
  'help gettxout',
  'help gettxoutproof',
  'help gettxoutsetinfo',
  'help preciousblock',
  'help pruneblockchain',
  'help savemempool',
  'help scantxoutset',
  'help verifychain',
  'help verifytxoutproof',
  'help getmemoryinfo',
  'help getrpcinfo',
  'help logging',
  'help stop',
  'help uptime',
  'help generate',
  'help generatetoaddress',
  'help getblocktemplate',
  'help getmininginfo',
  'help getnetworkhashps',
  'help prioritisetransaction',
  'help submitblock',
  'help submitheader',
  'help addnode',
  'help clearbanned',
  'help disconnectnode',
  'help getaddednodeinfo',
  'help getconnectioncount',
  'help getnettotals',
  'help getnetworkinfo',
  'help getnodeaddresses',
  'help getpeerinfo',
  'help listbanned',
  'help ping',
  'help setban',
  'help setnetworkactive',
  'help analyzepsbt',
  'help combinepsbt',
  'help combinerawtransaction',
  'help converttopsbt',
  'help createpsbt',
  'help createrawtransaction',
  'help decodepsbt',
  'help decoderawtransaction',
  'help decodescript',
  'help finalizepsbt',
  'help fundrawtransaction',
  'help getrawtransaction',
  'help joinpsbts',
  'help sendrawtransaction',
  'help signrawtransactionwithkey',
  'help testmempoolaccept',
  'help utxoupdatepsbt',
  'help createmultisig',
  'help deriveaddresses',
  'help estimatesmartfee',
  'help getdescriptorinfo',
  'help signmessagewithprivkey',
  'help validateaddress',
  'help verifymessage',
  'help abandontransaction',
  'help abortrescan',
  'help addmultisigaddress',
  'help backupwallet',
  'help bumpfee',
  'help createwallet',
  'help dumpprivkey',
  'help dumpwallet',
  'help encryptwallet',
  'help getaddressesbylabel',
  'help getaddressinfo',
  'help getbalance',
  'help getnewaddress',
  'help getrawchangeaddress',
  'help getreceivedbyaddress',
  'help getreceivedbylabel',
  'help gettransaction',
  'help getunconfirmedbalance',
  'help getwalletinfo',
  'help importaddress',
  'help importmulti',
  'help importprivkey',
  'help importprunedfunds',
  'help importpubkey',
  'help importwallet',
  'help keypoolrefill',
  'help listaddressgroupings',
  'help listlabels',
  'help listlockunspent',
  'help listreceivedbyaddress',
  'help listreceivedbylabel',
  'help listsinceblock',
  'help listtransactions',
  'help listunspent',
  'help listwalletdir',
  'help listwallets',
  'help loadwallet',
  'help lockunspent',
  'help removeprunedfunds',
  'help rescanblockchain',
  'help sendmany',
  'help sendtoaddress',
  'help sethdseed',
  'help setlabel',
  'help settxfee',
  'help signmessage',
  'help signrawtransactionwithwallet',
  'help unloadwallet',
  'help walletcreatefundedpsbt',
  'help walletlock',
  'help walletpassphrase',
  'help walletpassphrasechange',
  'help walletprocesspsbt',
  'help getzmqnotifications'
]

$('#rpcCommand').autocomplete({
  lookup: commandNames,
  maxHeight: 250,
  autoSelectFirst: true
});
