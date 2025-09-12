/**
 * Sideshift module - API v2
 */

class SideshiftAPI {
    /**
     * Create a Sideshift API client
     * @param {string} secret - Your Sideshift secret key
     * @param {string} id - Your Sideshift ID
     * @param {string} verbose - If true, activate console.error output.
     */
    constructor(secret, id, verbose = false) {
        /** Auth Configuration */
        if (!secret || typeof secret !== 'string' || !secret.trim()) {
            throw new Error(`SIDESHIFT_SECRET must be a non-empty string. Provided: ${secret}`);
        }
        if (!id || typeof id !== 'string' || !id.trim()) {
            throw new Error(`SIDESHIFT_ID must be a non-empty string. Provided: ${id}`);
        }

        this.SIDESHIFT_SECRET = secret;
        this.SIDESHIFT_ID = id;

        /**  Verbose mode true/false */
        this.verbose = !!verbose;

        /** Header configurations */
        this.HEADER = {
            "Content-Type": "application/json",
        };

        this.HEADER_WITH_TOKEN = {
            ...this.HEADER,
            "x-sideshift-secret": this.SIDESHIFT_SECRET
        };

        this.imageHeader = {
                headers: {"Accept": "image/svg"},
                method: "GET"
        };

        this.requestHeader = {
                headers: this.HEADER,
                method: "GET"
        };

        this.requestHeaderWithToken = {
                headers: this.HEADER_WITH_TOKEN,
                method: "GET"
        };
        
        /** Base URL */
        this.BASE_URL = "https://sideshift.ai/api/v2";
    }


    /**
     * Handle the API request
     * @private
     * @param {Object} response - Fetch response object
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Resolves with the response object if successful
     * @throws {Error} Throws an error with HTTP status details and error data when response is not ok
     */
    async _handleResponse(response, url, options) {
        if(this.verbose){
            console.log('\n=== DEBUG REQUEST ===');
            console.log('URL:', url);
            console.log('Method:', options.method);
            console.log('Headers:', options.headers);
            console.log('Body (stringified):', typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            console.log('=====================');
        }
        if (!response.ok) {
            let errorData = {};
            
            try {
                errorData = await response.json();
            } catch (jsonError) {
                errorData = await response.text();
            }
            
            const error = new Error(`HTTP ${response.status} ${response.statusText}`);
            error.status = response.status;
            error.statusText = response.statusText;
            error.url = url;
            error.options = options;
            error.error = errorData.error || { message: 'Unknown error' };
            
            throw error;
        }
        
        return response;
    }

    /**
     * Make an API request
     * @private
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data or error object
     */
    async _request(url, options = {}) {
       
        const response = await fetch(url, options);
        const handledResponse = await this._handleResponse(response, url, options);
        
        return await handledResponse.json();
    }

    /**
     * Make an image API request
     * @private
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Blob|Object>} Image blob or error object
     */    
    async _requestImage(url, options = {}) {
        
        const response = await fetch(url, options);
        const handledResponse = await this._handleResponse(response, url, options);
        
        return await handledResponse.blob();
    }


    /** Error message for Input Validation */
    errorMsg(fieldName, source) {
        const error = `Error from ${source}: Missing or invalid ${fieldName} parameter`;
        return error;
    }

    /** Input Validation */
    validateString(value, fieldName, source) {
        if (!value || typeof value !== 'string' || !value.trim()) {
            const error = this.errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        return value.trim();
    }
    validateOptinalString(value, fieldName, source) {
        if (value && typeof value !== 'string') {
            const error = this.errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        if(value === null || value === undefined){
            return value;
        } else{
            return value.trim();
        }
    }
    validateNumber(value, fieldName, source) {
        if (value !== null && (typeof value !== 'number' || value < 0)) {
            const error = this.errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        return value;
    }


    /** API functions - GET */
    /**
     * Get list of supported coins
     * @returns {Promise<Object>} Coins data from API
     */
    async getCoins() {
        return this._request(`${this.BASE_URL}/coins`, this.requestHeader);
    }

    /**
     * Get coin icon
     * @param {string} coin - Coin symbol
     * @returns {Promise<Blob|Object>} Image blob or error object
     */
    async getCoinIcon(coin) {
        return this._requestImage(`${this.BASE_URL}/coins/icon/${coin}`, this.imageHeader);
    }

    /**
     * Get permissions
     * @returns {Promise<Object>} Permissions data from API
     */
    async getPermissions() {
        return this._request(`${this.BASE_URL}/permissions`, this.requestHeader);
    }

    /**
     * Get pair information
     * @param {string} from - From coin
     * @param {string} to - To coin
     * @returns {Promise<Object>} Pair data from API
     */
    async getPair(from, to) {
        return this._request(`${this.BASE_URL}/pair/${from}/${to}`, this.requestHeaderWithToken);
    }

    /**
     * Get multiple pairs
     * @param {string[]} arrayOfCoins - Array of coin: "name-network", "BNB-bsc" "BTC-mainnet"
     * @returns {Promise<Object>} Pairs data from API
     */
    async getPairs(arrayOfCoins) {
        const queryParams = new URLSearchParams({
            pairs: arrayOfCoins.join(',') // 'btc-mainnet,usdc-bsc,bch,eth'
        });
        return this._request(`${this.BASE_URL}/pairs/?${queryParams}`, this.requestHeaderWithToken);
    }

    /**
     * Get shift by ID
     * @param {string} shiftId - Shift ID
     * @returns {Promise<Object>} Shift data from API
     */
    async getShift(shiftId) {
        return this._request(`${this.BASE_URL}/shifts/${shiftId}`, this.requestHeader);
    }

    /**
     * Get multiple shifts by IDs
     * @param {string[]} arrayOfIDs - Array of shift IDs
     * @returns {Promise<Object>} Bulk shifts data from API
     */
    async getBulkShifts(arrayOfIDs) {
        const queryParams = new URLSearchParams({
            ids: arrayOfIDs.join(',') // 'f173118220f1461841da,dda3867168da23927b62'
        });
        return this._request(`${this.BASE_URL}/shifts?${queryParams}`, this.requestHeader);
    }

    /**
     * Get recent shifts
     * @param {number} [limit=10] - Number of results (1-100)
     * @returns {Promise<Object>} Recent shifts data from API
     */
    async getRecentShifts(limit) {
        if(limit){
            limit = Math.min(Math.max(limit || 10, 1), 100);
            const queryParams = new URLSearchParams({ limit });
            return this._request(`${this.BASE_URL}/recent-shifts?${queryParams}`, this.requestHeader);
        } else{
            return this._request(`${this.BASE_URL}/recent-shifts`, this.requestHeader);
        }
    }

    /**
     * Get XAI statistics
     * @returns {Promise<Object>} XAI stats data from API
     */
    async getXaiStats() {
        return this._request(`${this.BASE_URL}/xai/stats`, this.requestHeader);
    }

    /**
     * Get your Sideshift account information
     * @returns {Promise<Object>} Account data from API
     */
    async getAccount() {
        return this._request(`${this.BASE_URL}/account`, this.requestHeaderWithToken);
    }

    /**
     * Get checkout information
     * @param {string} checkoutId - Checkout ID
     * @returns {Promise<Object>} Checkout data from API
     */
    async getCheckout(checkoutId) {
        return this._request(`${this.BASE_URL}/checkout/${checkoutId}`, this.requestHeaderWithToken);
    }



    /** API functions - POST */
    /**
     * Request a quote for a shift
     * @param {string} depositCoin - Deposit coin symbol
     * @param {string} depositNetwork - Deposit network
     * @param {string} settleCoin - Settle coin symbol
     * @param {string} settleNetwork - Settle network
     * @param {number} depositAmount - Deposit amount
     * @param {number} settleAmount - Settle amount
     * @returns {Promise<Object>} Quote data from API
     */
    async requestQuote(depositCoin, depositNetwork, settleCoin, settleNetwork, depositAmount, settleAmount) {
        this.validateString(depositCoin, "depositCoin", "requestQuote");
        this.validateString(depositNetwork, "depositNetwork", "requestQuote");
        this.validateString(settleCoin, "settleCoin", "requestQuote");
        this.validateString(settleNetwork, "settleNetwork", "requestQuote");
        this.validateNumber(depositAmount, "depositAmount", "requestQuote");
        this.validateNumber(settleAmount, "settleAmount", "requestQuote");

        const quoteBody = {
            "depositCoin": depositCoin,
            "depositNetwork": depositNetwork,
            "settleCoin": settleCoin,
            "settleNetwork": settleNetwork, 
            "depositAmount": depositAmount,
            "settleAmount": settleAmount,
            "affiliateId": this.SIDESHIFT_ID
        };

        return this._request(`${this.BASE_URL}/quotes`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(quoteBody),
            method: "POST"
        });
    }

    /**
     * Create a fixed shift
     * @param {string} settleAddress - Settle address
     * @param {string} quoteId - Quote ID
     * @param {string} [settleMemo] - Settle memo (optional)
     * @param {string} [refundAddress] - Refund address (optional)
     * @param {string} [refundMemo] - Refund memo (optional)
     * @returns {Promise<Object>} Created shift data from API
     */
    async createFixedShift(settleAddress, quoteId, settleMemo, refundAddress, refundMemo) {
        this.validateString(settleAddress, "settleAddress", "createFixedShift");
        this.validateString(quoteId, "quoteId", "createFixedShift");
        this.validateOptinalString(settleMemo, "settleMemo", "createFixedShift");
        this.validateOptinalString(refundAddress, "refundAddress", "createFixedShift");
        this.validateOptinalString(refundMemo, "refundMemo", "createFixedShift");

        const fixedShiftBody = {
            settleAddress,
            affiliateId: this.SIDESHIFT_ID,
            quoteId,
            ...(settleMemo && { settleMemo }),
            ...(refundAddress && { refundAddress }),
            ...(refundMemo && { refundMemo }),
        };

        return this._request(`${this.BASE_URL}/shifts/fixed`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(fixedShiftBody),
            method: "POST"
        });
    }

    /**
     * Create a variable shift
     * @param {string} settleAddress - Settle address
     * @param {string} settleCoin - Settle coin symbol
     * @param {string} settleNetwork - Settle network
     * @param {string} depositCoin - Deposit coin symbol
     * @param {string} depositNetwork - Deposit network
     * @param {string} [refundAddress] - Refund address (optional)
     * @param {string} [settleMemo] - Settle memo (optional)
     * @param {string} [refundMemo] - Refund memo (optional)
     * @returns {Promise<Object>} Created shift data from API
     */
    async createVariableShift(settleAddress, settleCoin, settleNetwork, depositCoin, depositNetwork, refundAddress, settleMemo, refundMemo) {
        this.validateString(settleAddress, "settleAddress", "createVariableShift");
        this.validateString(settleCoin, "settleCoin", "createVariableShift");
        this.validateString(settleNetwork, "settleNetwork", "createVariableShift");
        this.validateString(depositCoin, "depositCoin", "createVariableShift");
        this.validateString(depositNetwork, "depositNetwork", "createVariableShift");
        this.validateOptinalString(refundAddress, "refundAddress", "createVariableShift");
        this.validateOptinalString(settleMemo, "settleMemo", "createVariableShift");
        this.validateOptinalString(refundMemo, "refundMemo", "createVariableShift");

        const variableShiftBody = {
            settleAddress,
            settleCoin,
            settleNetwork,
            depositCoin,
            depositNetwork,
            affiliateId: this.SIDESHIFT_ID,
            ...(settleMemo && { settleMemo }),
            ...(refundAddress && { refundAddress }),
            ...(refundMemo && { refundMemo }),
        };        

        return this._request(`${this.BASE_URL}/shifts/variable`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(variableShiftBody),
            method: "POST"
        });
    }

    /**
     * Set refund address for a shift
     * @param {string} shiftId - Shift ID
     * @param {string} refundAddress - Refund address
     * @param {string} [refundMemo] - Refund memo (optional)
     * @returns {Promise<Object>} Update result from API
     */
    async setRefundAddress(shiftId, refundAddress, refundMemo) {
        this.validateString(shiftId, "shiftId", "setRefundAddress");
        this.validateString(refundAddress, "refundAddress", "setRefundAddress");
        this.validateOptinalString(refundMemo, "refundMemo", "setRefundAddress");

        const bodyObj = { 
            "address": refundAddress,
        };
        
        if (refundMemo) bodyObj.memo = refundMemo;

        return this._request(`${this.BASE_URL}/shifts/${shiftId}/set-refund-address`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(bodyObj),
            method: "POST"
        });
    }

    /**
     * Cancel an order
     * @param {string} orderID - Order ID to cancel
     * @returns {Promise<Object>} Cancel result from API
     */
    async cancelOrder(orderID) {
        this.validateString(orderID, "orderID", "cancelOrder");
        
        const bodyObj = { 
            "orderId": orderID 
        };

        return this._request(`${this.BASE_URL}/cancel-order`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(bodyObj),
            method: "POST"
        });
    }

    /**
     * Create a checkout
     * @param {string} settleCoin - Settle coin symbol
     * @param {string} settleNetwork - Settle network
     * @param {number} settleAmount - Settle amount
     * @param {string} settleAddress - Settle address
     * @param {string} successUrl - Success URL
     * @param {string} cancelUrl - Cancel URL
     * @param {string} [settleMemo] - Settle memo (optional)
     * @returns {Promise<Object>} Checkout data from API
     */
    async createCheckout(settleCoin, settleNetwork, settleAmount, settleAddress, successUrl, cancelUrl, settleMemo) {
        this.validateString(settleCoin, "settleCoin", "createVariableShift");
        this.validateString(settleNetwork, "settleNetwork", "createVariableShift");
        this.validateNumber(settleAmount, "settleAmount", "createVariableShift");
        this.validateString(settleAddress, "settleAddress", "createVariableShift");
        this.validateString(successUrl, "successUrl", "createVariableShift");
        this.validateString(cancelUrl, "cancelUrl", "createVariableShift");
        this.validateOptinalString(settleMemo, "settleMemo", "createVariableShift");

        const checkoutBody = {
            settleCoin,
            settleNetwork,
            settleAmount,
            settleAddress,
            successUrl,
            cancelUrl,
            affiliateId: this.SIDESHIFT_ID,
            ...(settleMemo && { settleMemo })
        };   

        return this._request(`${this.BASE_URL}/checkout`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(checkoutBody),
            method: "POST"
        });
    }
}


module.exports = SideshiftAPI;
