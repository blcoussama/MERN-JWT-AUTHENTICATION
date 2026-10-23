/**
 * Validates req.body (or req.params) with a zod schema and replaces it with the parsed value.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
        const issue = result.error.issues[0];
        const input = req[source] ?? {};
        let message = issue.message;
        if (issue.code === 'invalid_type') {
            message = input[issue.path[0]] === undefined ? 'All fields are required.' : 'Invalid request.';
        } else if (issue.code === 'unrecognized_keys') {
            message = 'Invalid request.';
        }
        return res.status(400).json({ success: false, message });
    }
    if (source === 'body') req.body = result.data;
    else req.validated = { ...req.validated, [source]: result.data };
    return next();
};
