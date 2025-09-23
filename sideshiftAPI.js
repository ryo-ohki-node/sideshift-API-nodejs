/**
 * Sideshift module - API v2
 */

class SideshiftAPI {
    /**
     * Create a Sideshift API client
     * @param {string} secret - Your Sideshift secret key
     * @param {string} id - Your Sideshift ID
     * @param {string} commisssionRate - Your commission rate from 0 to 2.
     * @param {string} verbose - If true, activate console.error output.
     */
    constructor({ secret, id, commisssionRate = "0.5", verbose = false, retries = {} }) {
        /** Auth Configuration */
        if (!secret || typeof secret !== 'string' || !secret.trim()) {
            throw new Error(`SIDESHIFT_SECRET must be a non-empty string. Provided: ${secret}`);
        }
        if (!id || typeof id !== 'string' || !id.trim()) {
            throw new Error(`SIDESHIFT_ID must be a non-empty string. Provided: ${id}`);
        }

        this.SIDESHIFT_SECRET = secret;
        this.SIDESHIFT_ID = id;
        this.COMMISSION_RATE = String(commisssionRate);

        /** Max retries configurations */
        this.maxRetries = retries.maxRetries || 5;
        this.retryDelay = retries.retryDelay || 2000; // 2 seconds
        this.retryBackoff = retries.retryBackoff || 2; // exponential backoff multiplier
        this.retryCappedDelay = retries.retryCappedDelay || 10000; // 10 secondes

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

        this.HEADER_COMMISSION = {
            ...this.HEADER_WITH_TOKEN,
            ...(this.COMMISSION_RATE !== "0.5" && { commissionRate: this.COMMISSION_RATE }),
        };

        this.imageHeader = {
            headers: { "Accept": "image/svg" },
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

        this.requestHeaderCommission = {
            headers: this.HEADER_COMMISSION,
            method: "GET"
        };

        /** Base URL */
        this.BASE_URL = "https://sideshift.ai/api/v2";
    }


    /** Filter API key from the log */
    _filterHeaders(headers) {
        if (!headers) return 'None';

        const filtered = { ...headers };
        const sensitiveKeys = 'x-sideshift-secret';

        if (filtered[sensitiveKeys]) {
            filtered[sensitiveKeys] = '[FILTERED]';
        }

        return JSON.stringify(filtered, null, 2);
    }

    /** Retries helpers */
    _shouldRetry(error) {
        if (!error) return false;
        
        const message = error.message || '';
        
        if (error.name === 'TypeError' || error.name === 'AbortError' || message.includes('fetch') || message.includes('timeout')) {
            return true;
        }

        if (error.status && error.status >= 500) {
            return true;
        }

        if (error.status && error.status >= 400 && error.status < 500) {
            return error.status === 429;
        }

        return false;
    }

    _calculateBackoffDelay(retries) {
        if (retries >= this.maxRetries) {
            return this.retryCappedDelay;
        }

        const baseDelay = Math.pow(this.retryBackoff, retries) * this.retryDelay;
        const cappedBaseDelay = Math.min(baseDelay, this.retryCappedDelay);
        const jitter = Math.floor(Math.random() * this.retryDelay * 0.2);
        return cappedBaseDelay + jitter;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /**
     * Set common error properties on an Error object
     * @private
     * @param {string} message - The error message
     * @param {Object} response - Fetch response object
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @param {*} errorData - Error data
     * @returns {Error}
     */
    _createError(message, response, url, options, errorData) {
        const error = new Error(message);
        error.status = response?.status;
        error.statusText = response?.statusText;
        error.url = url;
        error.options = options;
        error.error = errorData;
        if (errorData?.stack) {
            error.stack = errorData.stack;
        }
        return error;
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
        if (this.verbose) {
            console.log('\n=== DEBUG REQUEST ===');
            console.log('URL:', url);
            console.log('Method:', options?.method);
            console.log('Headers:', options?.headers ? this._filterHeaders(options.headers) : 'None');
            console.log('Body:', options?.body ? typeof options.body === 'string' ? options.body : JSON.stringify(options.body, null, 2) : 'No body');
            console.log('=====================');
        }
        if (!response.ok) {
            let errorData = {};

            try {
                errorData = await response.json();
            } catch {
                try {
                    errorData = await response.text();
                } catch {
                    errorData = { message: 'Failed to parse error details' };
                }
            }

            const error = this._createError(`HTTP ${response?.status} ${response?.statusText}`,
                response,
                url,
                options,
                errorData.error || errorData
            );

            throw error;
        }

        return response;
    }

    /**
     * Make an API request
     * @private
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @param {Number} retries - Number of retry done
     * @returns {Promise<Object>} Response data or error object
     */
    async _request(url, options = {}, retries = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const handledResponse = await this._handleResponse(response, url, options, retries);

            if (url === `${this.BASE_URL}/cancel-order` && handledResponse.status === 204) {
                let orderId = null;
                if (options?.body && typeof options?.body === 'string') {
                    try {
                        const parsedBody = JSON.parse(options.body);
                        orderId = parsedBody.orderId;
                    } catch (e) {
                        if (this.verbose) console.error('Failed to parse request body:', e);
                    }
                }
                return { success: true, orderId };
            }

            return await handledResponse.json();
        } catch (err) {
            clearTimeout(timeoutId);

            // Retry on specific types of errors
            const shouldRetry = retries < this.maxRetries && this._shouldRetry(err);

            if (shouldRetry) {
                const delay = this._calculateBackoffDelay(retries);

                if (this.verbose) console.warn(`Request failed, retrying in ${delay}ms...`, err.message);

                await this._delay(delay);
                return this._request(url, options, retries + 1);
            }

            const error = this._createError(`Fetch API error: ${err.error?.message || err.message || err}`,
                null,
                url,
                options,
                err
            );

            throw error;
        }
    }

    /**
     * Make an image API request
     * @private
     * @param {string} url - The API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Blob|Object>} Image blob or error object
     */
    async _requestImage(url, options = {}, retries = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const handledResponse = await this._handleResponse(response, url, options);

            try {
                return await handledResponse.blob();
            } catch (e) {
                const error = this._createError(`Failed to process image response: ${e.message || e}`,
                    response,
                    url,
                    options,
                    e
                );
                throw error;
            }
        } catch (err) {
            clearTimeout(timeoutId);
            
            // Retry on specific types of errors
            const shouldRetry = retries < this.maxRetries && this._shouldRetry(err);

            if (shouldRetry) {
                const delay = this._calculateBackoffDelay(retries);

                if (this.verbose) console.warn(`Image request failed, retrying in ${delay}ms...`, err.message);

                await this._delay(delay);
                return this._request(url, options, retries + 1);
            }

            const error = this._createError(`Fetch API image error: ${err.error?.message || err.message || err}`,
                null,
                url,
                options,
                err
            );
            throw error;
        }
    }


    /** Error message for Input Validation */
    _errorMsg(fieldName, source) {
        const error = `Error from ${source}: Missing or invalid ${fieldName} parameter`;
        return error;
    }

    /** Input Validation */
    _validateString(value, fieldName, source) {
        if (!value || typeof value !== 'string' || !value.trim()) {
            const error = this._errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        return value.trim();
    }
    _validateOptinalString(value, fieldName, source) {
        if (value && typeof value !== 'string') {
            const error = this._errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        if (value === null || value === undefined) {
            return value;
        } else {
            return value.trim();
        }
    }
    _validateNumber(value, fieldName, source) {
        if (value !== null && (typeof value !== 'number' || value < 0 || !Number.isFinite(value))) {
            const error = this._errorMsg(fieldName, source);
            throw new Error(`${error}`);
        }
        return value;
    }
    _validateArray(value, fieldName, source, elementType = 'string') {
        if (!Array.isArray(value)) {
            const error = this._errorMsg(fieldName, source);
            throw new Error(`${error} - must be an array`);
        }

        if (value.length === 0) {
            const error = this._errorMsg(fieldName, source);
            throw new Error(`${error} - must be a non-empty array`);
        }

        this._validateArrayElements(value, fieldName, source, elementType);

        return value;
    }
    _validateArrayElements(value, fieldName, source, elementType = 'string') {
        for (let i = 0; i < value.length; i++) {
            if (!value[i] || typeof value[i] !== elementType ||
                (elementType === 'string' && !value[i].trim())) {
                const error = this._errorMsg(`${fieldName}[${i}]`, source);
                throw new Error(`${error} - each element must be a non-empty ${elementType}`);
            }
        }
        return value;
    }


    /**
     * Get common request header with commission rate if applicable
     * @private
     * @returns {Object} Request header object
     */
    _getSpecialHeader(userIp) {
        return {
            ...this.HEADER_COMMISSION,
            ...(userIp && { "x-user-ip": userIp }),
            // ...(userIp !== null && userIp !== undefined && { "x-user-ip": userIp }),
        };
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
        this._validateString(coin, "coin", "getCoinIcon");
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
     * @param {number} amount - To coin
     * @returns {Promise<Object>} Pair data from API
     */
    async getPair(from, to, amount = null) {
        this._validateString(from, "from", "getPair");
        this._validateString(to, "to", "getPair");
        if (amount) this._validateNumber(Number(amount), "amount", "getPair");

        const queryParams = new URLSearchParams({
            affiliateId: this.SIDESHIFT_ID,
            ...(amount && { amount: Number(amount) }),
        });
        return this._request(`${this.BASE_URL}/pair/${from}/${to}/?${queryParams}`, this.requestHeaderCommission);
    }

    /**
     * Get multiple pairs
     * @param {string[]} arrayOfCoins - Array of coin: "name-network", "BNB-bsc" "BTC-mainnet"
     * @returns {Promise<Object>} Pairs data from API
     */
    async getPairs(arrayOfCoins) {
        this._validateArray(arrayOfCoins, "arrayOfCoins", "getPairs", "string");
        const queryParams = new URLSearchParams({
            pairs: arrayOfCoins.join(','), // 'btc-mainnet,usdc-bsc,bch,eth'
            affiliateId: this.SIDESHIFT_ID,
        });
        return this._request(`${this.BASE_URL}/pairs?${queryParams}`, this.requestHeaderCommission);
    }

    /**
     * Get shift by ID
     * @param {string} shiftId - Shift ID
     * @returns {Promise<Object>} Shift data from API
     */
    async getShift(shiftId) {
        this._validateString(shiftId, "shiftId", "getShift");
        return this._request(`${this.BASE_URL}/shifts/${shiftId}`, this.requestHeader);
    }

    /**
     * Get multiple shifts by IDs
     * @param {string[]} arrayOfIds - Array of shift IDs
     * @returns {Promise<Object>} Bulk shifts data from API
     */
    async getBulkShifts(arrayOfIds) {
        this._validateArray(arrayOfIds, "arrayOfIds", "getBulkShifts", "string");
        const queryParams = new URLSearchParams({
            ids: arrayOfIds.join(',') // 'f173118220f1461841da,dda3867168da23927b62'
        });
        return this._request(`${this.BASE_URL}/shifts?${queryParams}`, this.requestHeader);
    }

    /**
     * Get recent shifts
     * @param {number} [limit=10] - Number of results (1-100)
     * @returns {Promise<Object>} Recent shifts data from API
     */
    async getRecentShifts(limit) {
        if (limit) {
            const limitNumber = Number(limit);
            this._validateNumber(limitNumber, "limit", "getRecentShifts");
            const clampedLimit = Math.min(Math.max(limitNumber || 10, 1), 100);
            const queryParams = new URLSearchParams({ clampedLimit });
            return this._request(`${this.BASE_URL}/recent-shifts?${queryParams}`, this.requestHeader);
        } else {
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
        this._validateString(checkoutId, "checkoutId", "getCheckout");
        return this._request(`${this.BASE_URL}/checkout/${checkoutId}`, this.requestHeaderWithToken);
    }



    /** API functions - POST */
    /**
     * Request a quote for a shift
     * @param {Object} options - Configuration options
     * @param {string} options.depositCoin - Deposit coin symbol
     * @param {string} options.depositNetwork - Deposit network
     * @param {string} options.settleCoin - Settle coin symbol
     * @param {string} options.settleNetwork - Settle network
     * @param {number} options.depositAmount - Deposit amount
     * @param {number} options.settleAmount - Settle amount
     * @param {string} [userIp] - User IP address (optional)
     * @returns {Promise<Object>} Quote data from API
     */
    async requestQuote({
        depositCoin,
        depositNetwork,
        settleCoin,
        settleNetwork,
        depositAmount,
        settleAmount,
        userIp
    }) {
        this._validateString(depositCoin, "depositCoin", "requestQuote");
        this._validateString(depositNetwork, "depositNetwork", "requestQuote");
        this._validateString(settleCoin, "settleCoin", "requestQuote");
        this._validateString(settleNetwork, "settleNetwork", "requestQuote");
        this._validateNumber(depositAmount, "depositAmount", "requestQuote");
        this._validateNumber(settleAmount, "settleAmount", "requestQuote");
        this._validateOptinalString(userIp, "userIp", "requestQuote");
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
            headers: this._getSpecialHeader(userIp),
            body: JSON.stringify(quoteBody),
            method: "POST"
        });
    }

    /**
     * Create a fixed shift
     * @param {Object} options - Configuration options
     * @param {string} options.settleAddress - Settle address
     * @param {string} options.quoteId - Quote ID
     * @param {string} [options.settleMemo] - Settle memo (optional)
     * @param {string} [options.refundAddress] - Refund address (optional)
     * @param {string} [options.refundMemo] - Refund memo (optional)
     * @param {string} [userIp] - User IP address (optional)
     * @returns {Promise<Object>} Created shift data from API
     */
    async createFixedShift({
        settleAddress,
        quoteId,
        settleMemo,
        refundAddress,
        refundMemo,
        userIp
    }) {
        this._validateString(settleAddress, "settleAddress", "createFixedShift");
        this._validateString(quoteId, "quoteId", "createFixedShift");
        this._validateOptinalString(settleMemo, "settleMemo", "createFixedShift");
        this._validateOptinalString(refundAddress, "refundAddress", "createFixedShift");
        this._validateOptinalString(refundMemo, "refundMemo", "createFixedShift");
        this._validateOptinalString(userIp, "userIp", "createFixedShift");

        const fixedShiftBody = {
            settleAddress,
            affiliateId: this.SIDESHIFT_ID,
            quoteId,
            ...(settleMemo && { settleMemo }),
            ...(refundAddress && { refundAddress }),
            ...(refundMemo && { refundMemo }),
        };

        return this._request(`${this.BASE_URL}/shifts/fixed`, {
            headers: this._getSpecialHeader(userIp),
            body: JSON.stringify(fixedShiftBody),
            method: "POST"
        });
    }

    /**
     * Create a variable shift
     * @param {Object} options - Configuration options
     * @param {string} options.settleAddress - Settle address
     * @param {string} options.settleCoin - Settle coin symbol
     * @param {string} options.settleNetwork - Settle network
     * @param {string} options.depositCoin - Deposit coin symbol
     * @param {string} options.depositNetwork - Deposit network
     * @param {string} [options.refundAddress] - Refund address (optional)
     * @param {string} [options.settleMemo] - Settle memo (optional)
     * @param {string} [options.refundMemo] - Refund memo (optional)
     * @param {string} [userIp] - User IP address (optional)
     * @returns {Promise<Object>} Created shift data from API
     */
    async createVariableShift({
        settleAddress,
        settleCoin,
        settleNetwork,
        depositCoin,
        depositNetwork,
        refundAddress,
        settleMemo,
        refundMemo,
        userIp
    }) {
        this._validateString(settleAddress, "settleAddress", "createVariableShift");
        this._validateString(settleCoin, "settleCoin", "createVariableShift");
        this._validateString(settleNetwork, "settleNetwork", "createVariableShift");
        this._validateString(depositCoin, "depositCoin", "createVariableShift");
        this._validateString(depositNetwork, "depositNetwork", "createVariableShift");
        this._validateOptinalString(refundAddress, "refundAddress", "createVariableShift");
        this._validateOptinalString(settleMemo, "settleMemo", "createVariableShift");
        this._validateOptinalString(refundMemo, "refundMemo", "createVariableShift");
        this._validateOptinalString(userIp, "userIp", "createVariableShift");

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
            headers: this._getSpecialHeader(userIp),
            body: JSON.stringify(variableShiftBody),
            method: "POST"
        });
    }

    /**
     * Set refund address for a shift
     * @param {Object} options - Configuration options
     * @param {string} options.shiftId - Shift ID
     * @param {string} options.refundAddress - Refund address
     * @param {string} [options.refundMemo] - Refund memo (optional)
     * @returns {Promise<Object>} Update result from API
     */
    async setRefundAddress({
        shiftId,
        refundAddress,
        refundMemo
    }) {
        this._validateString(shiftId, "shiftId", "setRefundAddress");
        this._validateString(refundAddress, "refundAddress", "setRefundAddress");
        this._validateOptinalString(refundMemo, "refundMemo", "setRefundAddress");

        const bodyObj = {
            "address": refundAddress,
            ...(refundMemo && { "memo": refundMemo })
        };

        return this._request(`${this.BASE_URL}/shifts/${shiftId}/set-refund-address`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(bodyObj),
            method: "POST"
        });
    }

    /**
     * Cancel an order
     * @param {string} orderId - Order ID to cancel
     * @returns {Promise<Object>} Cancel result from API
     */
    async cancelOrder(orderId) {
        this._validateString(orderId, "orderId", "cancelOrder");

        const bodyObj = {
            "orderId": orderId
        };

        return this._request(`${this.BASE_URL}/cancel-order`, {
            headers: this.HEADER_WITH_TOKEN,
            body: JSON.stringify(bodyObj),
            method: "POST"
        });
    }

    /**
     * Create a checkout
     * @param {Object} options - Configuration options
     * @param {string} options.settleCoin - Settle coin symbol
     * @param {string} options.settleNetwork - Settle network
     * @param {number} options.settleAmount - Settle amount
     * @param {string} options.settleAddress - Settle address
     * @param {string} options.successUrl - Success URL
     * @param {string} options.cancelUrl - Cancel URL
     * @param {string} [options.settleMemo] - Settle memo (optional)
     * @param {string} [userIp] - User IP address (optional)
     * @returns {Promise<Object>} Checkout data from API
     */
    async createCheckout({
        settleCoin,
        settleNetwork,
        settleAmount,
        settleAddress,
        successUrl,
        cancelUrl,
        settleMemo,
        userIp
    }) {
        this._validateString(settleCoin, "settleCoin", "createVariableShift");
        this._validateString(settleNetwork, "settleNetwork", "createVariableShift");
        this._validateNumber(settleAmount, "settleAmount", "createVariableShift");
        this._validateString(settleAddress, "settleAddress", "createVariableShift");
        this._validateString(successUrl, "successUrl", "createVariableShift");
        this._validateString(cancelUrl, "cancelUrl", "createVariableShift");
        this._validateOptinalString(settleMemo, "settleMemo", "createVariableShift");
        this._validateOptinalString(userIp, "userIp", "createVariableShift");

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
            headers: this._getSpecialHeader(userIp),
            body: JSON.stringify(checkoutBody),
            method: "POST"
        });
    }

}


module.exports = SideshiftAPI;
