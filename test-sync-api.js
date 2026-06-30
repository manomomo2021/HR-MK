const http = require('http');

console.log('Sending request to http://localhost:3000/api/db-sync ...');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/db-sync',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Body length:', body.length);
        try {
            if (body) {
                const json = JSON.parse(body);
                console.log('Success:', json.success);
                if (json.data) {
                    console.log('Data keys:', Object.keys(json.data));
                    console.log('Employees count:', json.data.employees?.length);
                }
            } else {
                console.log('Body is empty');
            }
        } catch (e) {
            console.error('JSON Parse Error:', e.message);
            console.log('Raw body snippet:', body.slice(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
