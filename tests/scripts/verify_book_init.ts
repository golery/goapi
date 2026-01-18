import { assert } from 'console';

const API_URL = 'http://localhost:8200';

async function main() {
    console.log('Starting verification script...');

    // 1. Signup
    const email = `verify_${Date.now()}@test.com`;
    const password = 'Password123!';
    const appId = 999; // Test app ID

    console.log(`Signing up user: ${email}`);
    const signupRes = await fetch(`${API_URL}/api/public/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appId, email, password }),
    });

    if (!signupRes.ok) {
        console.error('Signup failed:', await signupRes.text());
        process.exit(1);
    }

    const { token, userId } = await signupRes.json();
    console.log(`User created. ID: ${userId}, Token: ${token.substring(0, 10)}...`);

    // 2. Get Books (trigger initialization)
    console.log('Fetching books (should initialize default)...');
    const booksRes = await fetch(`${API_URL}/api/pencil/book`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'appId': `${appId}`,
        },
    });

    if (!booksRes.ok) {
        console.error('Get books failed:', await booksRes.text());
        process.exit(1);
    }

    const books = await booksRes.json();
    console.log('Books received:', JSON.stringify(books, null, 2));

    // 3. Assertions
    if (!Array.isArray(books)) {
        console.error('Books response is not an array');
        process.exit(1);
    }

    if (books.length !== 1) {
        console.error(`Expected 1 book, got ${books.length}`);
        process.exit(1);
    }

    const book = books[0];
    if (book.name !== 'My Space' || book.code !== 'personal') {
        console.error(`Book details incorrect. Expected "My Space"/"personal", got "${book.name}"/"${book.code}"`);
        process.exit(1);
    }

    // 4. Verify repeated call returns same book
    console.log('Fetching books again (should be consistent)...');
    const booksRes2 = await fetch(`${API_URL}/api/pencil/book`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'appId': `${appId}`,
        },
    });
    const books2 = await booksRes2.json();
    if (books2.length !== 1 || books2[0].id !== book.id) {
        console.error(`Second call returned different data`);
        process.exit(1);
    }

    console.log('VERIFICATION SUCCESSFUL: Default book initialized correctly.');
}

main();
