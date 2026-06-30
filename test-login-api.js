const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('Attemping login test via fetch to localhost:3000/api/login...');
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers.get('content-type'));

        const text = await response.text();
        console.log('Response body:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
        }
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

testLogin();
