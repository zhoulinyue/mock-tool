import express from 'express';
import cors from 'cors';
import routes from './routes.js';
const app = express();
app.use(cors());
app.use(express.json());
app.use(routes);
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Mock Server running on http://localhost:${PORT}`);
});
