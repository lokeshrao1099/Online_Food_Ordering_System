const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'food_ordering.db');
const seedPath = path.join(__dirname, 'seed_data.sql');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Read seed file
try {
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    // Execute seed SQL
    db.exec(seedSql, (err) => {
        if (err) {
            console.error('❌ Error seeding database:', err.message);
            process.exit(1);
        }
        console.log('✅ Database seeded successfully!');

        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('✅ Connection closed');
            }
        });
    });
} catch (err) {
    console.error('❌ Error reading seed file:', err.message);
    db.close();
    process.exit(1);
}
