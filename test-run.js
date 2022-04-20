import thingy from './dist/_api_v2_maths_addition.js';

const req = {}
req.body = {
    a: 8,
    b: 12
}
const res = {
    json: function(data) {
        console.log(data);
    }
}

thingy(req, res);