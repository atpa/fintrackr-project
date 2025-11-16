/**
 * Tests for request timeout middleware
 */

const { requestTimeout, withTimeout } = require('../middleware/timeout');
const { AppError } = require('../middleware/errorHandler');

describe('Timeout Middleware', () => {
  describe('requestTimeout', () => {
    it('should call next if request completes before timeout', (done) => {
      const middleware = requestTimeout(1000);
      
      const req = {};
      const res = {
        headersSent: false,
        on: jest.fn()
      };
      const next = jest.fn(() => {
        // Simulate response finishing
        res.headersSent = true;
        const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish');
        if (finishCallback) {
          finishCallback[1]();
        }
        done();
      });

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should timeout if request takes too long', (done) => {
      const middleware = requestTimeout(100); // 100ms timeout
      
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      };
      const res = {
        headersSent: false,
        on: jest.fn()
      };
      const next = jest.fn((error) => {
        if (error) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.statusCode).toBe(408);
          expect(error.code).toBe('REQUEST_TIMEOUT');
          done();
        }
      });

      middleware(req, res, next);
      // Don't call next immediately - let timeout occur
    }, 200);
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject with timeout error if promise takes too long', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 500));
      
      await expect(
        withTimeout(slowPromise, 100, 'Test timeout')
      ).rejects.toThrow('Test timeout');
      
      await expect(
        withTimeout(slowPromise, 100)
      ).rejects.toThrow(AppError);
    });

    it('should reject with original error if promise rejects before timeout', async () => {
      const failingPromise = Promise.reject(new Error('Test error'));
      
      await expect(
        withTimeout(failingPromise, 1000)
      ).rejects.toThrow('Test error');
    });
  });
});
