/**
 * Middleware Runner
 * Utilities for composing and executing middleware chains
 */

/**
 * Compose multiple middleware functions into a single function
 * 
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} Composed middleware function
 */
function compose(...middlewares) {
  return function composedMiddleware(req, res, finalCallback) {
    let index = 0;
    
    function next(err) {
      // If error, skip to final callback
      if (err) {
        return finalCallback(err);
      }
      
      // If no more middleware, call final callback
      if (index >= middlewares.length) {
        return finalCallback();
      }
      
      // Get next middleware
      const middleware = middlewares[index++];
      
      try {
        // Execute middleware
        middleware(req, res, next);
      } catch (error) {
        // Catch synchronous errors
        next(error);
      }
    }
    
    // Start execution
    next();
  };
}

/**
 * Run middleware chain and handle completion
 * 
 * @param {Array<Function>} middlewares - Array of middleware functions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
function runMiddleware(middlewares, req, res) {
  return new Promise((resolve, reject) => {
    const composed = compose(...middlewares);
    
    composed(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Conditional middleware executor
 * Only runs middleware if condition is true
 * 
 * @param {Function} condition - Function that returns boolean
 * @param {Function} middleware - Middleware to run conditionally
 * @returns {Function} Conditional middleware function
 */
function when(condition, middleware) {
  return function conditionalMiddleware(req, res, next) {
    if (condition(req, res)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Skip middleware for specific paths
 * 
 * @param {Array<string>|RegExp} paths - Paths to skip
 * @param {Function} middleware - Middleware to skip
 * @returns {Function} Middleware function with skip logic
 */
function unless(paths, middleware) {
  const pathArray = Array.isArray(paths) ? paths : [paths];
  
  return function unlessMiddleware(req, res, next) {
    const url = req.url.split('?')[0]; // Remove query string
    
    // Check if current path should be skipped
    const shouldSkip = pathArray.some(path => {
      if (path instanceof RegExp) {
        return path.test(url);
      }
      return url === path || url.startsWith(path);
    });
    
    if (shouldSkip) {
      return next();
    }
    
    middleware(req, res, next);
  };
}

/**
 * Apply middleware only to specific methods
 * 
 * @param {Array<string>|string} methods - HTTP methods
 * @param {Function} middleware - Middleware to apply
 * @returns {Function} Method-specific middleware function
 */
function forMethods(methods, middleware) {
  const methodArray = Array.isArray(methods) ? methods : [methods];
  const upperMethods = methodArray.map(m => m.toUpperCase());
  
  return function methodMiddleware(req, res, next) {
    if (upperMethods.includes(req.method.toUpperCase())) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Apply middleware only to specific paths
 * 
 * @param {Array<string>|RegExp|string} paths - Paths to match
 * @param {Function} middleware - Middleware to apply
 * @returns {Function} Path-specific middleware function
 */
function forPaths(paths, middleware) {
  const pathArray = Array.isArray(paths) ? paths : [paths];
  
  return function pathMiddleware(req, res, next) {
    const url = req.url.split('?')[0]; // Remove query string
    
    // Check if current path matches
    const shouldApply = pathArray.some(path => {
      if (path instanceof RegExp) {
        return path.test(url);
      }
      return url === path || url.startsWith(path);
    });
    
    if (shouldApply) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Parallel middleware executor
 * Runs multiple middleware functions in parallel
 * Useful for non-dependent operations
 * 
 * @param {...Function} middlewares - Middleware functions to run in parallel
 * @returns {Function} Parallel middleware function
 */
function parallel(...middlewares) {
  return function parallelMiddleware(req, res, next) {
    let completed = 0;
    let hasError = false;
    
    function checkComplete(err) {
      if (hasError) return;
      
      if (err) {
        hasError = true;
        return next(err);
      }
      
      completed++;
      if (completed === middlewares.length) {
        next();
      }
    }
    
    // Execute all middleware in parallel
    middlewares.forEach(middleware => {
      try {
        middleware(req, res, checkComplete);
      } catch (error) {
        checkComplete(error);
      }
    });
  };
}

/**
 * Timeout middleware wrapper
 * Adds timeout to middleware execution
 * 
 * @param {Function} middleware - Middleware to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Middleware with timeout
 */
function withTimeout(middleware, timeoutMs = 5000) {
  return function timeoutMiddleware(req, res, next) {
    let timedOut = false;
    
    const timer = setTimeout(() => {
      timedOut = true;
      next(new Error(`Middleware timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    function timeoutNext(err) {
      if (!timedOut) {
        clearTimeout(timer);
        next(err);
      }
    }
    
    try {
      middleware(req, res, timeoutNext);
    } catch (error) {
      clearTimeout(timer);
      next(error);
    }
  };
}

module.exports = {
  compose,
  runMiddleware,
  when,
  unless,
  forMethods,
  forPaths,
  parallel,
  withTimeout
};
