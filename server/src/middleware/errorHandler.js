// Error handler middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle different types of errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            message: 'Validation Error', 
            details: err.message 
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ 
            message: 'Unauthorized' 
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({ 
        message: err.message || 'Internal server error' 
    });
};
