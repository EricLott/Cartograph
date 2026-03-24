
const http = require('http');

const data = JSON.stringify({ provider: 'openai', payload: { messages: [] } });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agent/complete',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Body:', body);
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.write(data);
req.end();
