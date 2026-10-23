import mongoose from 'mongoose';

// Defence in depth against NoSQL operator injection: any `$`-prefixed key coming
// from a query filter is wrapped in `$eq` unless explicitly marked with mongoose.trusted().
// (Request bodies are already validated with zod before reaching a query.)
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

export const connectDB = async (uri) => {
    await mongoose.connect(uri);
    console.log('MongoDB connected.');
};

export const disconnectDB = () => mongoose.disconnect();
