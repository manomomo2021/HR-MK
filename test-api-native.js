const http = require('http');

const data = JSON.stringify({
    username: 'admin',
    password: 'admin123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Sending request to http://localhost:3000/api/login ...');

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Body:');
        console.log(body);
        try {
            if (body) {
                console.log('Parsed JSON:', JSON.parse(body));
            } else {
                console.log('Body is empty');
            }
        } catch (e) {
            console.error('JSON Parse Error:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
