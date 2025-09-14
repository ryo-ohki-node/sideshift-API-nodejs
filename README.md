# sideshift-API-nodejs
Sideshift API module for nodejs

## Use Cases
This module provide an user-friendly interface to the official SideShift API. It can help integrate cryptocurrency swap into various applications, such as:

- Cryptocurrency Wallets: Enhance your wallet app by allowing users to swap coins directly within the interface.

- Decentralized Exchanges: Create decentralized exchange platforms with real-time coin swapping capabilities.

- Payment Gateways: Offer customers the flexibility to pay in their preferred cryptocurrency and automatically convert it to your desired coin for processing.


## Key features
- Easy Integration: With just a few lines of code to integrate cryptocurrency swapping capabilities into your Node.js applications.

- Wide Coin Support: Access the full spectrum of 235+ coins supported by SideShift, allowing users to swap seamlessly between various cryptocurrencies.


## Installation
This module use Fetch.

Demo Server Dependencies:
```
npm install --save express http fs
```
Module Dependencies:
```
npm install --save node-fetch
```

##  Load module
```
const SideshiftAPI = require('./sideshift_module.js');
or import { SideshiftAPI } from './sideshift_module.js';

const SIDESHIFT_ID = "Your_shideshift_ID";

const SIDESHIFT_SECRET = "Your_shideshift_secret";

const COMMISSION_RATE = "0.5"; // Min 0 and max 2, set your commission rate from 0 to 2%. Default is 0.5

const sideshift = new SideshiftAPI({
  secret: SIDESHIFT_SECRET,
  id: SIDESHIFT_ID,
  commisssionRate: "1", // Optional
  verbose: true // Optional
});
```


## Verbose mode
When verbose mode is enabled, all requests are logged with:
- URL and HTTP method
- Request headers
- Request body (stringified)
- Full request/response details for troubleshooting


**Log example**
```
=== DEBUG REQUEST ===
URL: https://sideshift.ai/api/v2/cancel-order
Method: POST
Headers: {
  "Content-Type": "application/json",
  "x-sideshift-secret": '[FILTERED]'
}
Body: {"orderId":"4f72a1852d8b2c10537b"}
=====================
```


## Error Handling
When encountering errors, the module returns an error object with the following format:

```
{
  "status": 400,
  "statusText": "Bad Request",
  "url": "https://sideshift.ai/api/v2/cancel-order",
  "error": {
    "message": "Order already expired"
  }
}
```

## Server call and response
For detailed API call and response examples, see [SERVER_RESPONSES.md](SERVER_RESPONSES.md)

