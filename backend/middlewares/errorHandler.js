export const notFound = (req, res) => res.status(404).json({ success: false, message: 'Not found.' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Malformed JSON body.' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request body too large.' });
    }
    // Log the error server-side only: no stack trace or internal detail is sent to the client.
    console.error(`[error] ${req.method} ${req.path}:`, err.message);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
};
