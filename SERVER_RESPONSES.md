# API Endpoints

## GET function

###getCoin()
Returns the list of coins and their respective networks available on SideShift.ai.

**Example Response:**
```
[ {
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
```
  
  
### getCoinIcon()
Returns the icon of the coin in svg or png format.

return an image blob.


### getPermissions()
Returns whether or not the user is allowed to create shifts on SideShift.ai. 

```
{
  "createShift": true
}
```

### getPair()
Returns the minimum and maximum deposit amount and the rate for a pair of coins.

```
json
{
  "min": "0.0.00010771",
  "max": "1.43608988",
  "rate": "17.298009817772",
  "depositCoin": "BTC",
  "settleCoin": "ETH",
  "depositNetwork": "bitcoin",
  "settleNetwork": "ethereum"
}
```

### getPairs(arrayOfCoins)
Same as getPair but with multiple coins. Returns the minimum and maximum deposit amount and the rate for every possible pair of coins listed in the query string.

```
[
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
```

### getShift(ID)
Returns the shift data.

See https://docs.sideshift.ai/endpoints/v2/shift for output example


### getBulkShifts(arrayOfIDs): 
Same as getShift but with multiple shifts ID

See https://docs.sideshift.ai/endpoints/v2/bulkshifts for output example


### getRecentShifts(limit)
Returns the 10 most recent completed shifts. Use limit param to change the number of recent shifts returned. limit must be between 1-100.

```
[
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
```

### getXaiStats()
Returns the statistics about XAI coin, including it's current USD price.

```
{
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
```

### getAccount()
Returns the data related to an account. In order to get the data, send the account secret in the x-sideshift-secret header.

```
{
  "id": "YQMi62XMb",
  "lifetimeStakingRewards": "89190.63",
  "unstaking": "0",
  "staked": "1079394.1646",
  "available": "43034.51598382",
  "totalBalance": "1122428.68058382"
}
```

### getCheckout()
Returns the data of a checkout created using /v2/checkout endpoint.

```
{
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
```


## POST function

### requestQuote({depositCoin, depositNetwork, settleCoin, settleNetwork, depositAmount, settleAmount, userIP})
For fixed rate shifts, a quote should be requested first. A quote can be requested for either a depositAmount or a settleAmount.

**How to Call it**
```
const quote = await client.requestQuote({
    depositCoin: 'BTC',
    depositNetwork: 'bitcoin',
    settleCoin: 'ETH',
    settleNetwork: 'ethereum',
    depositAmount: null,
    settleAmount: 2.3,
    userIP: 'ip_address' // Optional
});
```

**Example response**
```
{
  "id": "c1d79240-0117-4867-afed-9cc4605c53aa",
  "createdAt": "2023-10-17T03:33:21.230Z",
  "depositCoin": "ETH",
  "settleCoin": "ETH",
  "depositNetwork": "arbitrum",
  "settleNetwork": "ethereum",
  "expiresAt": "2023-10-17T03:48:21.230Z",
  "depositAmount": "0.14364577",
  "settleAmount": "0.14078454",
  "rate": "0.980081348723",
  "affiliateId": "YQMi62XMb"
}
```

### createFixedShift({settleAddress, quoteId, settleMemo, refundAddress, refundMemo, userIP})
After requesting a quote, use the quoteId to create a fixed rate shift with the quote. The affiliateId must match the one used to request the quote.

**How to Call it**
```
const fixed_shift = await client.createFixedShift({
    settleAddress: '0x...',
    quoteId: 'quote123',
    settleMemo: 'memo', // Optional
    refundAddress: '0x...', // Optional
    refundMemo: 'WalletMemo', // Optional
    userIP: 'ip_address' // Optional
});
```

**Example response**
```
{
  "id": "8c9ba87d02a801a2f254",
  "createdAt": "2023-10-17T04:32:00.855Z",
  "depositCoin": "ETH",
  "settleCoin": "ETH",
  "depositNetwork": "arbitrum",
  "settleNetwork": "ethereum",
  "depositAddress": "0xa20916158958168ff5668bF90C3753EcD333b0A2",
  "settleAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "depositMin": "1",
  "depositMax": "1",
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
```

### createVariableShift({settleAddress, settleCoin, settleNetwork, depositCoin, depositNetwork, refundAddress, settleMemo, refundMemo, userIP})
For variable rate shifts, the settlement rate is determined when the user's deposit is received.

**How to Call it**
```
const variable_shift = await client.createVariableShift({
    settleAddress: '0x...',
    settleCoin: 'ETH',
    settleNetwork: 'ethereum',
    depositCoin: 'BTC',
    depositNetwork: 'bitcoin',
    refundAddress: '0x...', // Optional
    settleMemo: 'memo', // Optional
    userIP: 'ip_address' // Optional
});
```

**Example response**
```
{
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
```

⚠️ For createFixedShift and createVariableShiftIf the API requests are sent from the integrations own server, the x-user-ip header must be set to the end-user IP address. Otherwise the requests can be blocked.



### setRefundAddress({shiftId, refundAddress, refundMemo})
**How to Call it**
```
const set_refund_address = await setRefundAddress({
  shiftId: '6f7d6442bbcea03b3fs6',
  refundAddress: 'bc1...9ya',
  refundMemo: 'memo' // optional
});
```

**Example response**
```
{
  "id": "6f7d6442bbcea03b3fs6",
  "createdAt": "2023-10-17T05:36:46.797Z",
  "depositCoin": "BTC",
  "settleCoin": "ETH",
  "depositNetwork": "bitcoin",
  "settleNetwork": "ethereum",
  "depositAddress": "37SELkizWCbbRgpDe5ozZDP6TvvA91a6WB",
  "settleAddress": "0xde2642b2120fd3011fe9659688f76e9E4676F472",
  "depositMin": "0.00010655",
  "depositMax": "1.42067752",
  "refundAddress": "bc1qe6duc4mztzh9jvjnqcalf65hr9579vel8mv9ya",
  "type": "variable",
  "expiresAt": "2023-10-24T05:36:46.796Z",
  "status": "waiting",
  "averageShiftSeconds": "46.880018"
}

```

### cancelOrder(orderID)
**How to Call it**
```
const cancel_shift = await cancelOrder('71449070046fcfee010z')
```

**Example response**
```
{
  success: true,
  orderId: "71449070046fcfee010z"
};
```

### createCheckout({settleCoin, settleNetwork, settleAmount, settleAddress, successUrl, cancelUrl, settleMemo, userIP})
**How to Call it**
```
const cancel_shift = await client.createCheckout({
    settleCoin: 'ETH',
    settleNetwork: 'ethereum',
    settleAmount: 2.5,
    settleAddress: '0x...',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    settleMemo: 'memo', // optional
    userIP: 'ip_address' // optional
});
```

**Example response**
```
{
  "id": "32e676d3-56c2-4c06-a0cd-551a9d3db89a",
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

```
