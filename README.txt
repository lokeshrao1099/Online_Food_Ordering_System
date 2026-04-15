ONLINE FOOD ORDERING PROJECT
============================

This is a full-stack web application for an online food ordering system. It uses a Node.js/Express backend with an SQLite database and a static HTML/JS frontend.

PREREQUISITES
-------------

- Node.js (v14 or higher recommended) installed on your machine. (https://nodejs.org/)

INSTALLATION
------------

1. Navigate to the backend directory:
   Open your terminal or command prompt and move to the `backend` folder:
   
   cd backend

2. Install dependencies:
   Run the following command to install the required Node.js packages:
   
   npm install

RUNNING THE APPLICATION
-----------------------

1. Start the server:
   While still in the `backend` directory, run:
   
   npm start
   
   Or alternatively: node app.js

2. Access the application:
   Once the server is running, open your web browser and go to:
   - Customer View: http://localhost:3000
   - Admin View: http://localhost:3000/admin.html

DATABASE SETUP & SEEDING
------------------------

The application uses an SQLite database (`food_ordering.db`) which is automatically created in the `backend` folder when you start the server for the first time.

NOTE: The database has already been populated with seed data. However, if the data is not visible or missing, you can manually add it using the methods below.

### Adding Seed Data (Test Data)

To populate the database with sample restaurants and menu items, follow these steps:

1. Ensure the server is running (`npm start`).
2. Open a new terminal window (or use a tool like Postman).
3. Run the following command to trigger the seeding endpoint:

   Using curl (Windows PowerShell):
   
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/seed-data"

   Using curl (Mac/Linux/Git Bash):
   
   curl -X POST http://localhost:3000/seed-data

   Using Browser Console:
   1. Go to http://localhost:3000 in your browser.
   2. Press `F12` to open Developer Tools.
   3. Go to the Console tab.
   4. Paste the following code and press Enter:
      
      fetch('/seed-data', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log(data))
        .catch(err => console.error(err));

4. You should see a success message indicating that restaurants and menu items have been added.

### Option 2: Using the Seed Script (Recommended if Option 1 fails)

If you prefer to run a script directly:

1. Open your terminal in the `backend` directory.
2. Run the following command:
   
   node seed.js
   
   This uses the installed Node.js libraries to seed the database, so you don't need to install any extra tools.

TROUBLESHOOTING
---------------

- Database Errors: If you encounter issues with the database, you can simply delete the `backend/food_ordering.db` file and restart the server. It will be recreated automatically.
- Port In Use: If port 3000 is already in use, you can change the port by setting an environment variable (e.g., `PORT=3001 npm start`) or modifying `backend/app.js`.
