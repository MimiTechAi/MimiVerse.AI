import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';

/**
 * Mimi Engine - Notary API Monitor
 * SOTA 2025 Asynchronous Notarization Status Checker
 */

const KEY_ID = process.env.APPLE_KEY_ID;
const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const PRIVATE_KEY_PATH = './authkey.p8'; // Path to your .p8 key file

function generateJWT() {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH);
    const payload = {
        iss: ISSUER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 min expiry
        aud: 'appstoreconnect-v1'
    };

    return jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: KEY_ID,
            typ: 'JWT'
        }
    });
}

async function checkStatus(submissionId) {
    const token = generateJWT();
    const url = `https://appstoreconnect.apple.com/notary/v2/submissions/${submissionId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = response.data.data.attributes;
        console.log(`\n--- Notarization Status [${submissionId}] ---`);
        console.log(`Status: ${data.status}`);
        console.log(`Created: ${data.createdDate}`);
        console.log(`Name: ${data.name}`);

        if (data.status === 'Invalid' || data.status === 'Accepted') {
            // Fetch Log URL if available
            const logUrl = `https://appstoreconnect.apple.com/notary/v2/submissions/${submissionId}/logs`;
            const logResponse = await axios.get(logUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log(`Log URL: ${logResponse.data.data.attributes.developerLogUrl}`);
        }
    } catch (error) {
        console.error('Error fetching status:', error.response ? error.response.data : error.message);
    }
}

const submissionId = process.argv[2];
if (!submissionId) {
    console.log('Usage: node check-notary.js <submissionId>');
    process.exit(1);
}

checkStatus(submissionId);
