// Demo server for SideshiftAPI.js module.
const express = require('express');
const http = require('http');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = 3000;

// parsing
const bodyParser = require('body-parser');
// for parsing application/json
app.use(bodyParser.json()); 
// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true })); 


// Load sideshift module
const SideshiftAPI = require('./sideshift_module.js');

// Set or import your ID and secret variable 
const SIDESHIFT_ID = "Your_shideshift_ID"; 
const SIDESHIFT_SECRET = "Your_shideshift_secret";

const sideshift = new SideshiftAPI(SIDESHIFT_SECRET, SIDESHIFT_ID, true);




// Routes for each function in the Sideshift API module

// GET routes

// Get list of supported coins
app.get('/coins', async (req, res) => {
	try {
		const coins = await sideshift.getCoins();
		res.json(coins);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch coins' });
	}
});

// Get coin icon
app.get('/coin-icon/:coin', async (req, res) => {
	try {
		const { coin } = req.params;
		const icon = await sideshift.getCoinIcon(coin);
		if (icon && icon instanceof Blob) {
			// Convert Blob to Buffer
			const arrayBuffer = await icon.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			res.set('Content-Type', icon.type || 'image/svg'); // adjust based on actual type
			res.send(buffer);
		} else {
			res.status(404).json({ error: 'Icon not found' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch coin icon' });
	}
});

// Get user permissions
app.get('/permissions', async (req, res) => {
	try {
		const permissions = await sideshift.getPermissions();
		res.json(permissions);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch permissions' });
	}
});

// Get pair info
app.get('/pair/:from/:to', async (req, res) => {
	try {
		const { from, to } = req.params;
		const pair = await sideshift.getPair(from, to);
		res.json(pair);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch pair info' });
	}
});

// Get shift by ID
app.get('/shifts/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const shift = await sideshift.getShift(id);
		res.json(shift);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch shift' });
	}
});

// Get recent shifts
app.get('/recent-shifts', async (req, res) => {
try {
	const { limit } = req.query;
	const shifts = await sideshift.getRecentShifts(limit ? parseInt(limit) : undefined);
	res.json(shifts);
} catch (error) {
	res.status(500).json({ error: 'Failed to fetch recent shifts' });
}
});

// Get XAI stats
app.get('/xai/stats', async (req, res) => {
try {
	const xaiStats = await sideshift.getXaiStats();
	res.json(xaiStats);
} catch (error) {
	res.status(500).json({ error: 'Failed to fetch XAI stats' });
}
});

// Get account info
app.get('/account', async (req, res) => {
try {
	const account = await sideshift.getAccount();
	res.json(account);
} catch (error) {
	res.status(500).json({ error: 'Failed to fetch account' });
}
});

// Get checkout info
app.get('/checkout/:id', async (req, res) => {
try {
	const { id } = req.params;
	const checkout = await sideshift.getCheckout(id);
	res.json(checkout);
} catch (error) {
	res.status(500).json({ error: 'Failed to fetch checkout' });
}
});





// POST routes

// Get multiple pairs
app.post('/pairs', async (req, res) => {
	try {
		const { coins } = req.body; // e.g., ['btc-mainnet', 'eth']
		const pairs = await sideshift.getPairs(coins);
		res.json(pairs);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch pairs' });
	}
});

// Get multiple shifts
app.post('/shifts/bulk', async (req, res) => {
	try {
		const { ids } = req.body; // e.g., ['id1', 'id2']
		const shifts = await sideshift.getBulkShifts(ids);
		res.json(shifts);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch bulk shifts' });
	}
});

// Request a quote for a shift
app.post('/quotes', async (req, res) => {
try {
	const {
	depositCoin,
	depositNetwork,
	settleCoin,
	settleNetwork,
	depositAmount,
	settleAmount
	} = req.body;

	const quote = await sideshift.requestQuote(
	depositCoin,
	depositNetwork,
	settleCoin,
	settleNetwork,
	depositAmount,
	settleAmount
	);

	res.json(quote);
} catch (error) {
	res.status(400).json({ error: 'Failed to request quote', details: error.message });
}
});

// Create a fixed shift
app.post('/shifts/fixed', async (req, res) => {
try {
	const {
	settleAddress,
	quoteId,
	settleMemo,
	refundAddress,
	refundMemo
	} = req.body;

	const shift = await sideshift.createFixedShift(
	settleAddress,
	quoteId,
	settleMemo,
	refundAddress,
	refundMemo
	);

	res.json(shift);
} catch (error) {
	res.status(400).json({ error: 'Failed to create fixed shift', details: error.message });
}
});

// Create a variable shift
app.post('/shifts/variable', async (req, res) => {
try {
	const {
	settleAddress,
	settleCoin,
	settleNetwork,
	depositCoin,
	depositNetwork,
	refundAddress,
	settleMemo,
	refundMemo
	} = req.body;

	const shift = await sideshift.createVariableShift(
	settleAddress,
	settleCoin,
	settleNetwork,
	depositCoin,
	depositNetwork,
	refundAddress,
	settleMemo,
	refundMemo
	);

	res.json(shift);
} catch (error) {
	res.status(400).json({ error: 'Failed to create variable shift', details: error.message });
}
});

// Set refund address for a shift
app.post('/shifts/:id/set-refund-address', async (req, res) => {
try {
	const { id } = req.params;
	const { refundAddress, refundMemo } = req.body;
	const result = await sideshift.setRefundAddress(String(id), String(refundAddress), refundMemo);
	res.json(result);
} catch (error) {
	res.status(400).json({ error: 'Failed to set refund address', details: error.message });
}
});

// Cancel an order
app.post('/cancel-order', async (req, res) => {
	try {
		const { orderId } = req.body;
		const result = await sideshift.cancelOrder(orderId);
		res.json(result);
	} catch (error) {
		res.status(400).json({ error: 'Failed to cancel order', details: error.message });
	}
});

// Create a checkout
app.post('/checkout', async (req, res) => {
try {
	const {
	settleCoin,
	settleNetwork,
	settleAmount,
	settleAddress,
	successUrl,
	cancelUrl,
	settleMemo
	} = req.body;

	const checkout = await sideshift.createCheckout(
	settleCoin,
	settleNetwork,
	settleAmount,
	settleAddress,
	successUrl,
	cancelUrl,
	settleMemo
	);
	
	res.json(checkout);
} catch (error) {
	res.status(400).json({ error: 'Failed to create checkout', details: error.message });
}
});


http.createServer(app).listen(PORT, () => {
	console.log(`HTTP Server running at http://localhost:${PORT}/`);
});
