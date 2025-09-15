#!/bin/bash

SERVER_URL=${1:-"http://localhost:3000"}

# Function to test GET route
test_get() {
    local route=$1
    local description=$2
    echo -e "\n\n🔍 Testing: $description"
    curl -s -X GET "${SERVER_URL}${route}" | jq .
    sleep 5

}

# Function to test Icon and display it
test_get_image() {
    local route=$1
    local description=$2
    echo -e "\n\n🔍 Testing: $description"
    curl -s -X GET "${SERVER_URL}${route}" | display -resize 200x200 -
    sleep 5

}

# Function to test POST route
test_post() {
	local route=$1
	local description=$2
	local data=$3
	echo -e "\n\n🔍 Testing: $description"
	curl -s -X POST "${SERVER_URL}${route}" \
		-H "Content-Type: application/json" \
		-d "$data" | jq .
	sleep 5

}


# Test GET/POST routes
test_get "/coins" "GET /coins"
test_get_image "/coin-icon/BTC-mainnet" "GET /coin-icon/:coin"
test_get "/permissions" "GET /permissions"
test_get "/pair/BTC-mainnet/ETH-mainnet" "GET /pair/:from/:to"
test_post "/pairs" "POST /pairs" '{"coins": ["BTC-mainnet", "ETH-mainnet", "BNB-bsc"]}'
test_get "/shifts/b159b97dd01df2ff39fd" "GET /shifts/:id"
test_post "/shifts/bulk" "POST /shifts/bulk" '{"ids": ["b159b97dd01df2ff39fd", "8b9bef65f98856222d5d"]}'
test_get "/recent-shifts?limit=3" "GET /recent-shifts"
test_get "/xai/stats" "GET /xai/stats"
test_get "/account" "GET /account"




# Test POST routes
# POST /quotes - Request a quote for a shift
echo -e "\n\n🔍 Testing: POST /quotes"
Q_ID=$(curl -s -X POST "${SERVER_URL}/quotes" \
  -H "Content-Type: application/json" \
  -d '{
    "depositCoin": "BTC",
    "depositNetwork": "bitcoin",
    "settleCoin": "ETH",
    "settleNetwork": "ethereum",
    "depositAmount": 0.01,
    "settleAmount": null
  }')
echo $Q_ID | jq .
Q_ID=$(echo $Q_ID | jq .id)
sleep 5


# POST /shifts/fixed - Create a fixed shift
echo -e "\n\n🔍 Testing: POST /shifts/fixed"
FIXED_ID=$(curl -s -X POST "${SERVER_URL}/shifts/fixed" \
  -H "Content-Type: application/json" \
  -d '{
    "settleAddress": "0x346da4f11f4Fe717A20718f843cEADB479D47128",
    "quoteId": '"$Q_ID"',
    "settleMemo": null,
    "refundAddress": null
  }')
echo $FIXED_ID | jq .
FIXED_ID=$(echo $FIXED_ID | jq .id)
sleep 5


# POST /shifts/variable - Create a variable shift
echo -e "\n\n🔍 Testing: POST /shifts/variable"
VARIABLE_ID=$(curl -s -X POST "${SERVER_URL}/shifts/variable" \
  -H "Content-Type: application/json" \
  -d '{
    "settleAddress": "0x346da4f11f4Fe717A20718f843cEADB479D47128",
    "settleCoin": "ETH",
    "settleNetwork": "ethereum",
    "depositCoin": "BTC",
    "depositNetwork": "bitcoin",
    "refundAddress": null,
    "settleMemo": null,
    "refundMemo": null
  }')
echo $VARIABLE_ID | jq .
VARIABLE_ID=$(echo $VARIABLE_ID | jq .id)
sleep 5


# POST /shifts/:id/set-refund-address - Set refund address for a shift
VARIABLE_ID_FORMAT=${VARIABLE_ID//\"/}
URL="/shifts/$VARIABLE_ID_FORMAT/set-refund-address"
test_post "$URL" "POST /set-refund-address" '{"refundAddress": "1KVpKve3LXGAvZGmX19EaPbuubm6K9cG7M", "refundMemo": null}'

# POST /checkout - Create a checkout
echo -e "\n\n🔍 Testing: POST /checkout"
CHECHOUT_ID=$(curl -s -X POST "${SERVER_URL}/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "settleCoin": "ETH",
    "settleNetwork": "ethereum",
    "settleAmount": 0.01,
    "settleAddress": "0x346da4f11f4Fe717A20718f843cEADB479D47128",
    "successUrl": "https://mywesite.com/success",
    "cancelUrl": "https://mywesite.com/cancel",
    "settleMemo": null
  }')
echo $CHECHOUT_ID | jq .
CHECHOUT_ID=$(echo $CHECHOUT_ID | jq .id)
CHECHOUT_ID_FORMAT=${CHECHOUT_ID//\"/}
sleep 5


# GET /checkout/:id - Get checkout info
test_get "/checkout/${CHECHOUT_ID_FORMAT}" "GET /checkout"


echo -e "\n\nTesting  /cancel-order - without waiting"

# POST /cancel-order - Cancel order
echo -e "\n\n🔍 Testing: /cancel-order"
  -H "Content-Type: application/json" \
  -d '{
    "orderId": '"$FIXED_ID"'
  }' | jq .
  
echo -e "\n\nWaiting 5 min to cancel shifts"
sleep 300

 echo -e "\n\n🔍 Testing: /cancel-order"
curl -s -X POST "${SERVER_URL}/cancel-order" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": '"$VARIABLE_ID"'
  }' | jq .

echo -e "\n\n🔍 Testing: /cancel-order"
curl -s -X POST "${SERVER_URL}/cancel-order" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": '"$FIXED_ID"'
  }' | jq .



echo -e "\n✅ All API routes tests completed!"
