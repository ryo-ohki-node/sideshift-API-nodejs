# sideshift-API-nodejs
Sideshift API module for nodejs

# Use Cases
This module provide an user-friendly interface to the official SideShift API. It can help integrate cryptocurrency swap into various applications, such as:

- Cryptocurrency Wallets: Enhance your wallet app by allowing users to swap coins directly within the interface.

- Decentralized Exchanges: Create decentralized exchange platforms with real-time coin swapping capabilities.

- Payment Gateways: Offer customers the flexibility to pay in their preferred cryptocurrency and automatically convert it to your desired coin for processing.


# Key features
- Easy Integration: With just a few lines of code to integrate cryptocurrency swapping capabilities into your Node.js applications.

- Wide Coin Support: Access the full spectrum of 235+ coins supported by SideShift, allowing users to swap seamlessly between various cryptocurrencies.



#  Load module
const SideshiftAPI = require('./sideshift_module.js');

const SIDESHIFT_ID = "Your_shideshift_ID";

const SIDESHIFT_SECRET = "Your_shideshift_secret";

const sideshift = new SideshiftAPI(SIDESHIFT_SECRET, SIDESHIFT_ID);


# Verbose mode
const sideshift = new SideshiftAPI(SIDESHIFT_SECRET, SIDESHIFT_ID, true);

When verbose mode is enabled, all requests are logged with:
- URL and HTTP method
- Request headers
- Request body (stringified)
- Full request/response details for troubleshooting


# Error Handling
When encountering errors, the module returns an error object with the following format:

{
  "status": 400,
  "statusText": "Bad Request",
  "url": "https://sideshift.ai/api/v2/cancel-order",
  "error": {
    "message": "Order already expired"
  }
}


# GET function
- getCoin(): Returns the list of coins and their respective networks available on SideShift.ai.

return: [ {
    "networks": [
      "avax"
    ],
    "coin": "COQ",
    "name": "Coq Inu",
    "hasMemo": false,
    "fixedOnly": false,
    "variableOnly": false,
    "tokenDetails": {
      "avax": {
        "contractAddress": "0x420fca0121dc28039145009570975747295f2329",
        "decimals": 18
      }
    },
    "networksWithMemo": [],
    "depositOffline": false,
    "settleOffline": false
  }, ... ]
  
  
- getCoinIcon(): Returns the icon of the coin in svg or png format.

return an image blob.


- getPermissions(): Returns whether or not the user is allowed to create shifts on SideShift.ai. 

return: {
  "createShift": true
}


- getPair("coin-network", "coin_2-network_2"): Returns the minimum and maximum deposit amount and the rate for a pair of coins.

return: {
  "min": "0.0.00010771",
  "max": "1.43608988",
  "rate": "17.298009817772",
  "depositCoin": "BTC",
  "settleCoin": "ETH",
  "depositNetwork": "bitcoin",
  "settleNetwork": "ethereum"
}


- getPairs(arrayOfCoins): same as getPair but with multiple coins. Returns the minimum and maximum deposit amount and the rate for every possible pair of coins listed in the query string.

return: [
  {
    depositCoin: 'BTC',
    settleCoin: 'USDC',
    depositNetwork: 'bitcoin',
    settleNetwork: 'bsc',
    min: '0.00004528',
    max: '0.33413179',
    rate: '108368.634404588633'
  },
  {
    depositCoin: 'BTC',
    settleCoin: 'BCH',
    depositNetwork: 'bitcoin',
    settleNetwork: 'bitcoincash',
    min: '0.00004528',
    max: '0.5433252',
    rate: '181.965086103129'
  },
  {
    depositCoin: 'BTC',
    settleCoin: 'ETH',
    depositNetwork: 'bitcoin',
    settleNetwork: 'ethereum',
    min: '0.00004528',
    max: '0.5433252',
    rate: '25.230019148753'
  }, ...
]


- getShift(ID): Returns the shift data.
See https://docs.sideshift.ai/endpoints/v2/shift for output example


- getBulkShifts(arrayOfIDs): same as getShift but with multiple shifts ID
See https://docs.sideshift.ai/endpoints/v2/bulkshifts for output example


- getRecentShifts(limit): Returns the 10 most recent completed shifts. Use limit param to change the number of recent shifts returned. limit must be between 1-100.

return: [
  {
    "createdAt": "2023-10-17T06:48:18.622Z",
    "depositCoin": "ETH",
    "depositNetwork": "ethereum",
    "depositAmount": "0.12612806",
    "settleCoin": "BTC",
    "settleNetwork": "bitcoin",
    "settleAmount": "0.00688094"
  },...
]


- getXaiStats: Returns the statistics about XAI coin, including it's current USD price.

return: {
  "totalSupply": 210000000,
  "circulatingSupply": 126684969.93,
  "numberOfStakers": 0,
  "latestAnnualPercentageYield": "11.66",
  "latestDistributedXai": "33862.05",
  "totalStaked": "112136431.9",
  "averageAnnualPercentageYield": "22.95",
  "totalValueLocked": "8467726.7618521220990927948892813218",
  "totalValueLockedRatio": "1.12973961970448057097",
  "xaiPriceUsd": "0.07551271802",
  "svxaiPriceUsd": "0.094023361214",
  "svxaiPriceXai": "1.245132789276"
}


- getAccount: Returns the data related to an account. In order to get the data, send the account secret in the x-sideshift-secret header.

return: {
  "id": "YQMi62XMb",
  "lifetimeStakingRewards": "89190.63",
  "unstaking": "0",
  "staked": "1079394.1646",
  "available": "43034.51598382",
  "totalBalance": "1122428.68058382"
}


- getCheckout : Returns the data of a checkout created using /v2/checkout endpoint.

return: {
  "id": "32e676d3-56c2-4c06-a0cd-551a9d3db18b",
  "settleCoin": "XRP",
  "settleNetwork": "ripple",
  "settleAddress": "rsTAYkk7VQfBdD5btt2WzXYphER6F2BTuN",
  "settleMemo": "109",
  "settleAmount": "15",
  "updatedAt": "2024-09-26T01:52:56.885000000Z",
  "createdAt": "2024-09-26T01:52:56.885000000Z",
  "affiliateId": "YQMi62XMb"
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}



# POST function
- createFixedShift(settleAddress, quoteId, settleMemo, refundAddress, refundMemo)
⚠️ Important: When using refundMemo, both settleMemo and refundAddress must be set to null to maintain correct parameter positioning.

return: {
  "id": "8c9ba87d02a801a2f254",
  "createdAt": "2023-10-17T04:32:00.855Z",
  "depositCoin": "ETH",
  "settleCoin": "ETH",
  "depositNetwork": "arbitrum",
  "settleNetwork": "ethereum",
  "depositAddress": "0xa20916158958168ff5668bF90C3753EcD333b0A2",
  "settleAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "depositMin": "0.01",
  "depositMax": "10",
  "refundAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "type": "fixed",
  "quoteId": "75cb6e56-a81b-45a9-8ab4-1f95bf92246g",
  "depositAmount": "1",
  "settleAmount": "0.98088036",
  "expiresAt": "2023-10-17T04:36:47.050Z",
  "status": "waiting",
  "averageShiftSeconds": "44.526343",
  "externalId": "integration-1234"
  "rate": "0.98088036"
}


- createVariableShift(settleAddress, settleCoin, settleNetwork, depositCoin, depositNetwork, refundAddress, settleMemo, refundMemo)
⚠️ Important: When using refundMemo, the parameter order must be maintained as shown above.

return: {
  "id": "71449070046fcfee010z",
  "createdAt": "2024-01-31T01:04:14.978Z",
  "depositCoin": "ETH",
  "settleCoin": "USDT",
  "depositNetwork": "ethereum",
  "settleNetwork": "ethereum",
  "depositAddress": "0x44642E63D5a50e872Df2d162d02f9A259b247350",
  "settleAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "depositMin": "0.021551429911",
  "depositMax": "17.06368164",
  "refundAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "type": "variable",
  "expiresAt": "2024-02-07T01:04:14.978Z",
  "status": "waiting",
  "averageShiftSeconds": "45.830392",
  "externalId": "integration-1234",
  "settleCoinNetworkFee": "4.210057",
  "networkFeeUsd": "4.21"
}
