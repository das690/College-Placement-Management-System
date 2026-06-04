const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes (Requires a valid token)
const protect = async (req, res, next) => {
  let token;

  // Check if the token is in the headers (formatted as "Bearer <token>")
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the string
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using your secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by the ID embedded in the token and attach it to the request (minus the password)
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Move on to the next piece of middleware or the actual route
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to grant access to specific roles (e.g., 'company', 'admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };