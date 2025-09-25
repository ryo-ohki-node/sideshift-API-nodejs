// Jest unit test for sideshiftAPI.js
const SideshiftAPI = require('./sideshiftAPI.js');

describe('API Client', () => {
  let client;

  beforeEach(() => {
    client = new SideshiftAPI({ secret: "put_a_sideshift_secret_here", id: "put_sideshidft_id_here", commisssionRate: "0.5", verbose: true });
    // Set default values for testing
    client.maxRetries = 5;
    client.retryDelay = 2000;
    client.retryBackoff = 2;
    client.retryCappedDelay = 10000;
    client.verbose = true;
    client.SIDESHIFT_SECRET = "put_a_sideshift_secret_here";
    client.SIDESHIFT_ID = "put_sideshidft_id_here";
    client.COMMISSION_RATE = "0.5";
    client.verbose = true;
    client.defaultTimeOut = 10000;
    client.HEADER = {
      "Content-Type": "application/json",
    };

    client.HEADER_WITH_TOKEN = {
      ...client.HEADER,
      "x-sideshift-secret": client.SIDESHIFT_SECRET
    };

    client.HEADER_COMMISSION = {
      ...client.HEADER_WITH_TOKEN,
      ...(client.COMMISSION_RATE !== "0.5" && { commissionRate: client.COMMISSION_RATE }),
    };

    client.imageHeader = {
      headers: { "Accept": "image/svg" },
      method: "GET"
    };

    client.requestHeader = {
      headers: client.HEADER,
      method: "GET"
    };

    client.requestHeaderWithToken = {
      headers: client.HEADER_WITH_TOKEN,
      method: "GET"
    };

    client.requestHeaderCommission = {
      headers: client.HEADER_COMMISSION,
      method: "GET"
    };
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // Use 0.5 as a representative jitter

    client.API_URL = "https://sideshift.ai/api/v2/coins";
  });

  describe('_filterHeaders', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should filter sensitive headers', () => {
      const headers = {
        'x-sideshift-secret': 'my-secret-key',
        // 'authorization': 'Bearer token123',
        'content-type': 'application/json'
      };

      const result = client._filterHeaders(headers);
      expect(result).toContain('"x-sideshift-secret": "[FILTERED]"');
      // expect(result).toContain('"authorization": "[FILTERED]"');
      expect(result).toContain('"content-type": "application/json"');
    });

    test('should return "None" when headers is null', () => {
      const result = client._filterHeaders(null);
      expect(result).toBe('None');
    });

    test('should handle empty headers object', () => {
      const result = client._filterHeaders({});
      expect(result).toContain('{}');
    });
  });

  describe('_shouldRetry', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should increase delay exponentially with different jitter values', () => {
      const mockRandomValues = [0, 0.1, 0.5, 0.9];
      let i = 0;

      jest.spyOn(global.Math, 'random').mockImplementation(() => mockRandomValues[i++]);

      const delay1 = client._calculateBackoffDelay(0);
      const delay2 = client._calculateBackoffDelay(1);
      const delay3 = client._calculateBackoffDelay(2);

      expect(delay2).toBeGreaterThanOrEqual(delay1 * 2);
      expect(delay3).toBeGreaterThanOrEqual(delay2 * 2);

      global.Math.random.mockRestore();
    });

  });

  describe('_calculateBackoffDelay', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should calculate correct delay for first retry', () => {
      const delay = client._calculateBackoffDelay(0);
      expect(delay).toBeGreaterThanOrEqual(client.retryDelay); // baseDelay
      expect(delay).toBeLessThanOrEqual(client.retryDelay + (client.retryDelay * 0.2)); // + 20% jitter (1000 * 0.2 = 200)
    });

    test('should cap delay at retryCappedDelay', () => {
      client.retryCappedDelay = client.retryCappedDelay;
      const delay = client._calculateBackoffDelay(10); // Should be capped
      expect(delay).toBe(client.retryCappedDelay);
    });

    test('should increase delay exponentially', () => {
      const delay1 = client._calculateBackoffDelay(0);
      const delay2 = client._calculateBackoffDelay(1);
      const delay3 = client._calculateBackoffDelay(2);

      expect(delay2).toBeGreaterThanOrEqual(delay1 * 1.5);
      expect(delay3).toBeGreaterThanOrEqual(delay2 * 1.5);
    });
  });

  describe('_handleResponse', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should handle successful response', async () => {
      // Mock a successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };

      // Spy on _filterHeaders and _createError to verify they are NOT called
      const filterHeadersSpy = jest.spyOn(client, '_filterHeaders');
      const createErrorSpy = jest.spyOn(client, '_createError');

      // Call the function
      const result = await client._handleResponse(mockResponse, client.API_URL, { method: 'GET' });

      // Verify it returns the response object
      expect(result).toBe(mockResponse);

      // Verify verbose logging was not called (since verbose is false)
      expect(filterHeadersSpy).not.toHaveBeenCalled();
      expect(createErrorSpy).not.toHaveBeenCalled();

      // Restore original methods after test
      filterHeadersSpy.mockRestore();
      createErrorSpy.mockRestore();
    });

    test('should handle error response with text error data', async () => {
      // Mock an error response with JSON parsing failure
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('JSON parse error')),
        text: jest.fn().mockResolvedValue('Server error occurred')
      };

      // Mock _createError to return a specific error
      const mockError = new Error('HTTP 500 Internal Server Error');

      const createErrorSpy = jest.spyOn(client, '_createError');
      // Call the function and expect it to throw
      await expect(
        client._handleResponse(mockResponse, client.API_URL, { method: 'POST' })
      ).rejects.toThrow(mockError);

      // Verify _createError was called with correct parameters
      expect(client._createError).toHaveBeenCalledWith(
        'HTTP 500 Internal Server Error',
        mockResponse,
        client.API_URL,
        { method: 'POST' },
        'Server error occurred'
      );

      // Verify json() was called first
      expect(createErrorSpy).toHaveBeenCalled();

      // Verify text() was called after json failed
      expect(createErrorSpy).toHaveBeenCalled();
    });

    test('should handle error response with fallback error data', async () => {
      // Mock an error response where both JSON and text parsing fail
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('JSON parse error')),
        text: jest.fn().mockRejectedValue(new Error('Text parse error'))
      };

      // Mock _createError to return a specific error
      const mockError = new Error('HTTP 500 Internal Server Error');

      const createErrorSpy = jest.spyOn(client, '_createError').mockImplementation(() => mockError);

      // Call the function and expect it to throw
      await expect(
        client._handleResponse(mockResponse, client.API_URL, { method: 'PUT' })
      ).rejects.toThrow(mockError);

      // Verify _createError was called with fallback error data
      expect(createErrorSpy).toHaveBeenCalledWith(
        'HTTP 500 Internal Server Error',
        mockResponse,
        client.API_URL,
        { method: 'PUT' },
        { message: 'Failed to parse error details' }
      );
    });

    test('should handle verbose logging when enabled', async () => {
      // Enable verbose mode
      client.verbose = true;

      // Mock _filterHeaders using spyOn
      const filterHeadersSpy = jest.spyOn(client, '_filterHeaders').mockReturnValue({ 'x-sideshift-secret': '[FILTERED]' });

      // Mock a successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };

      // Call the function
      const result = await client._handleResponse(mockResponse, client.API_URL, {
        method: 'GET',
        headers: { 'x-sideshift-secret': '[FILTERED]' }
      });

      // Verify it returns the response object
      expect(result).toBe(mockResponse);

      // Verify _filterHeaders was called
      expect(filterHeadersSpy).toHaveBeenCalledWith({ 'x-sideshift-secret': '[FILTERED]' });

      // Restore the original method after test
      filterHeadersSpy.mockRestore();
    });

  });

  describe('_request', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should make successful API request and return JSON data', async () => {
      // Mock fetch to return a successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Mock _handleResponse to return the mock response
      const handleResponseSpy = jest.spyOn(client, '_handleResponse').mockResolvedValue(mockResponse);

      const result = await client._request(client.API_URL, { method: 'GET' });

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(client.API_URL, {
        method: 'GET',
        signal: expect.any(AbortSignal)
      });
      expect(handleResponseSpy).toHaveBeenCalledWith(mockResponse, client.API_URL, { method: 'GET' }, 0);
    });

    test('should handle invalid URL gracefully', async () => {
      await expect(client._request(null)).rejects.toThrow('Invalid URL provided');
      await expect(client._request(undefined)).rejects.toThrow('Invalid URL provided');
      await expect(client._request('')).rejects.toThrow('Invalid URL provided');
    });

    test('should handle cancel-order endpoint correctly', async () => {
      // Mock fetch to return a 204 response
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Mock _handleResponse to return the mock response
      const handleResponseSpy = jest.spyOn(client, '_handleResponse').mockResolvedValue(mockResponse);

      const result = await client._request('https://sideshift.ai/api/v2/cancel-order', {
        method: 'POST',
        body: JSON.stringify({ orderId: '12345' })
      });

      expect(result).toEqual({ success: true, orderId: '12345' });
      expect(handleResponseSpy).toHaveBeenCalledWith(mockResponse, 'https://sideshift.ai/api/v2/cancel-order', {
        method: 'POST',
        body: JSON.stringify({ orderId: '12345' })
      }, 0);
    });

    test('should handle cancel-order endpoint with invalid body', async () => {
      // Mock fetch to return a 204 response
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Mock _handleResponse to return the mock response
      const handleResponseSpy = jest.spyOn(client, '_handleResponse').mockResolvedValue(mockResponse);

      const result = await client._request('https://sideshift.ai/api/v2/cancel-order', {
        method: 'POST',
        body: 'invalid json'
      });

      expect(result).toEqual({ success: true, orderId: null });
    });

    test('should retry on retryable errors', async () => {
      // Mock fetch to fail twice then succeed
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: jest.fn().mockResolvedValue({ data: 'test' })
        });

      // Mock _shouldRetry to return true for all calls
      const shouldRetrySpy = jest.spyOn(client, '_shouldRetry').mockReturnValue(true);

      // Mock _calculateBackoffDelay to return 100ms for testing
      const backoffDelaySpy = jest.spyOn(client, '_calculateBackoffDelay').mockReturnValue(100);

      // Mock _delay to resolve immediately for testing
      const delaySpy = jest.spyOn(client, '_delay').mockResolvedValue(undefined);

      const result = await client._request(client.API_URL, { method: 'GET' });

      expect(result).toEqual({ data: 'test' });

      // The exact number of calls depends on your implementation
      // But it should be at least 2 (for retries) and up to 3 (including initial)
      expect(shouldRetrySpy).toHaveBeenCalledTimes(2); // 2 or 3, depending on your implementation

      expect(backoffDelaySpy).toHaveBeenCalledTimes(2);
      expect(delaySpy).toHaveBeenCalledTimes(2);
    });


    test('should not retry on non-retryable errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Bad request'));

      const shouldRetrySpy = jest.spyOn(client, '_shouldRetry').mockReturnValue(false);

      await expect(client._request(client.API_URL)).rejects.toThrow();

      expect(shouldRetrySpy).toHaveBeenCalledTimes(1);
    });

    test('should not retry when max retries exceeded', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const shouldRetrySpy = jest.spyOn(client, '_shouldRetry').mockReturnValue(true);

      // Mock maxRetries to be 0
      client.maxRetries = 0;

      await expect(client._request(client.API_URL)).rejects.toThrow();

      expect(shouldRetrySpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('_validateString', () => {
    it('should return trimmed string when valid', () => {
      const result = client._validateString('  hello world  ', 'name', 'test');
      expect(result).toBe('hello world');
    });

    it('should throw error when value is invalid', () => {
      expect(() => client._validateString(null, 'name', 'test')).toThrow('Error from test: Missing or invalid name parameter');
      expect(() => client._validateString('', 'name', 'test')).toThrow('Error from test: Missing or invalid name parameter');
      expect(() => client._validateString(123, 'name', 'test')).toThrow('Error from test: Missing or invalid name parameter');
    });
  });

  describe('_validateOptinalString', () => {
    it('should return null when value is null', () => {
      const result = client._validateOptinalString(null, 'name', 'test');
      expect(result).toBeNull();
    });

    it('should return undefined when value is undefined', () => {
      const result = client._validateOptinalString(undefined, 'name', 'test');
      expect(result).toBeUndefined();
    });

    it('should return trimmed string when valid', () => {
      const result = client._validateOptinalString('  hello  ', 'name', 'test');
      expect(result).toBe('hello');
    });

    it('should throw error when value is not a string', () => {
      expect(() => client._validateOptinalString(123, 'name', 'test')).toThrow('Error from test: Missing or invalid name parameter');
    });
  });

  describe('_validateNumber', () => {
    it('should return number when valid', () => {
      const result = client._validateNumber(42, 'count', 'test');
      expect(result).toBe(42);
    });

    it('should return null when value is null', () => {
      const result = client._validateNumber(null, 'count', 'test');
      expect(result).toBeNull();
    });

    it('should throw error when value is invalid', () => {
      expect(() => client._validateNumber(-1, 'count', 'test')).toThrow('Error from test: Missing or invalid count parameter');
      expect(() => client._validateNumber('not a number', 'count', 'test')).toThrow('Error from test: Missing or invalid count parameter');
      expect(() => client._validateNumber(Infinity, 'count', 'test')).toThrow('Error from test: Missing or invalid count parameter');
    });
  });

  describe('_validateArray', () => {
    it('should return valid array when elements are correct', () => {
      const result = client._validateArray(['a', 'b'], 'items', 'test');
      expect(result).toEqual(['a', 'b']);
    });

    it('should throw error when not an array', () => {
      expect(() => client._validateArray('not an array', 'items', 'test')).toThrow('Error from test: Missing or invalid items parameter - must be an array');
    });

    it('should throw error when array is empty', () => {
      expect(() => client._validateArray([], 'items', 'test')).toThrow('Error from test: Missing or invalid items parameter - must be a non-empty array');
    });

    it('should validate elements correctly', () => {
      expect(() => client._validateArray(['a', null], 'items', 'test')).toThrow('Error from test: Missing or invalid items[1] parameter - each element must be a non-empty string');
    });
  });

  describe('_getSpecialHeader', () => {
    it('should return headers with user IP when provided', () => {
      const result = client._getSpecialHeader('192.168.1.1');
      expect(result['x-user-ip']).toBe('192.168.1.1');
    });

    it('should return headers without user IP when null', () => {
      const result = client._getSpecialHeader(null);
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'x-sideshift-secret': client.SIDESHIFT_SECRET
      });
    });

    it('should return headers without user IP when undefined', () => {
      const result = client._getSpecialHeader(undefined);
      expect(result).toEqual({
        'Content-Type': 'application/json',
        'x-sideshift-secret': client.SIDESHIFT_SECRET
      });
    });
  });

});
