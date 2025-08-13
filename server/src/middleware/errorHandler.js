// Error handler middleware placeholder
const errorHandler = (err, req, res, next) => {
    // Error handling logic will go here
    res.status(500).json({ message: 'Internal server error' });
};

module.exports = errorHandler;
