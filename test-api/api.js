import * as express from 'express';

import * as service from './service.js';

const app = express();
const port = 3000;

const urlBase = '/api/v2/maths';

app.use(express.json());

app.get('/api/v2/maths/addition', (req, res) => {
    const { body } = req;
    const result = service.addition(body.a, body.b);
    return res.json({
        result
    });
});

app.get('/api/v2/maths/subtraction', (req, res) => {
    const { body } = req;
    const result = service.subtraction(body.a, body.b);
    return res.json({
        result
    });
});

app.listen(port, () => {
    console.log(`App listening on port: ${port}`);
});
