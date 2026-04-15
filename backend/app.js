const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

/* DATABASE CONNECTION - SQLite */
const dbPath = path.join(__dirname, 'food_ordering.db');
const schemaPath = path.join(__dirname, 'database.sql');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    console.log('📦 Database not found. Creating new database...');
    const db = new sqlite3.Database(dbPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('❌ Error creating database:', err.message);
        } else {
            console.log('✅ Database created successfully');
        }
        db.close();
    });
}

// Database helper functions
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Promisify database queries
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/* -------------------------------------------
   HEALTH CHECK & TEST ROUTE
--------------------------------------------*/
app.get('/ping', async (req, res) => {
    try {
        const row = await dbGet('SELECT 1+1 AS result');
        res.json({ ok: true, result: row.result, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/health', async (req, res) => {
    try {
        await dbGet('SELECT 1');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message
        });
    }
});

/* -------------------------------------------
   GET ALL RESTAURANTS
--------------------------------------------*/
app.get('/restaurants', async (req, res) => {
    try {
        const rows = await dbAll(
            "SELECT RestaurantID, Name, Location, Contact FROM RESTAURANT ORDER BY Name ASC"
        );
        res.json({
            success: true,
            count: rows.length,
            restaurants: rows
        });
    } catch (err) {
        console.error('Error fetching restaurants:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch restaurants',
            message: err.message
        });
    }
});

/* -------------------------------------------
   ADD MENU ITEMS TO EXISTING RESTAURANT
--------------------------------------------*/
app.post('/restaurants/:id/menu', async (req, res) => {
    try {
        console.log('📥 POST /restaurants/:id/menu payload:', { params: req.params, body: req.body });
        const restaurantId = parseInt(req.params.id);
        const { MenuItems } = req.body;

        if (isNaN(restaurantId) || restaurantId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid restaurant ID'
            });
        }

        // Verify restaurant exists
        const restaurant = await dbGet(
            "SELECT RestaurantID, Name FROM RESTAURANT WHERE RestaurantID = ?",
            [restaurantId]
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant not found'
            });
        }

        if (!MenuItems || !Array.isArray(MenuItems) || MenuItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one menu item is required'
            });
        }

        // Validate menu items
        for (let i = 0; i < MenuItems.length; i++) {
            const item = MenuItems[i];
            console.log(`🔍 validating menu item ${i + 1}:`, item);
            if (!item.ItemName || !item.ItemName.trim()) {
                console.warn(`⚠️ Menu item ${i + 1} missing ItemName`);
                return res.status(400).json({
                    success: false,
                    error: `Menu item ${i + 1}: Item name is required`
                });
            }
            if (!item.Price || isNaN(item.Price) || parseFloat(item.Price) <= 0) {
                console.warn(`⚠️ Menu item ${i + 1} invalid Price:`, item.Price);
                return res.status(400).json({
                    success: false,
                    error: `Menu item ${i + 1}: Valid price is required`
                });
            }
        }

        // Insert menu items
        for (let item of MenuItems) {
            console.log('➡️ inserting menu item:', item.ItemName, item.Price, item.Category);
            await dbRun(
                "INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES (?, ?, ?, ?)",
                [
                    restaurantId,
                    item.ItemName.trim(),
                    parseFloat(item.Price),
                    (item.Category || 'General').trim()
                ]
            );
        }

        console.log(`✅ Added ${MenuItems.length} menu items to restaurant ID ${restaurantId}`);

        res.json({
            success: true,
            restaurantId: restaurantId,
            restaurantName: restaurant.Name,
            itemsAdded: MenuItems.length,
            message: 'Menu items added successfully'
        });

    } catch (err) {
        console.error('Error adding menu items:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to add menu items',
            message: err.message
        });
    }
});

/* -------------------------------------------
   UPDATE RESTAURANT
--------------------------------------------*/
app.put('/restaurants/:id', async (req, res) => {
    try {
        const restaurantId = parseInt(req.params.id);
        const { Name, Location, Contact } = req.body;

        if (isNaN(restaurantId) || restaurantId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid restaurant ID'
            });
        }

        if (!Name || !Name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Restaurant name is required'
            });
        }
        if (!Location || !Location.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }
        if (!Contact || !Contact.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Contact number is required'
            });
        }

        // Verify restaurant exists
        const restaurant = await dbGet(
            "SELECT RestaurantID FROM RESTAURANT WHERE RestaurantID = ?",
            [restaurantId]
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant not found'
            });
        }

        await dbRun(
            "UPDATE RESTAURANT SET Name = ?, Location = ?, Contact = ? WHERE RestaurantID = ?",
            [Name.trim(), Location.trim(), Contact.trim(), restaurantId]
        );

        console.log(`✅ Restaurant updated: ID ${restaurantId}`);

        res.json({
            success: true,
            message: 'Restaurant updated successfully'
        });

    } catch (err) {
        console.error('Error updating restaurant:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update restaurant',
            message: err.message
        });
    }
});

/* -------------------------------------------
   DELETE RESTAURANT
--------------------------------------------*/
app.delete('/restaurants/:id', async (req, res) => {
    try {
        const restaurantId = parseInt(req.params.id);

        if (isNaN(restaurantId) || restaurantId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid restaurant ID'
            });
        }

        // Verify restaurant exists
        const restaurant = await dbGet(
            "SELECT RestaurantID, Name FROM RESTAURANT WHERE RestaurantID = ?",
            [restaurantId]
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant not found'
            });
        }

        // Delete menu items first (due to foreign key - CASCADE will handle this automatically)
        await dbRun(
            "DELETE FROM MENU WHERE RestaurantID = ?",
            [restaurantId]
        );

        // Delete restaurant
        await dbRun(
            "DELETE FROM RESTAURANT WHERE RestaurantID = ?",
            [restaurantId]
        );

        console.log(`✅ Restaurant deleted: ID ${restaurantId}`);

        res.json({
            success: true,
            message: 'Restaurant and associated menu items deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting restaurant:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to delete restaurant',
            message: err.message
        });
    }
});

/* -------------------------------------------
   GET MENU FOR GIVEN RESTAURANT
--------------------------------------------*/
app.get('/restaurants/:id/menu', async (req, res) => {
    try {
        const restaurantId = parseInt(req.params.id);

        if (isNaN(restaurantId) || restaurantId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid restaurant ID'
            });
        }

        // Verify restaurant exists
        const restaurant = await dbGet(
            "SELECT RestaurantID, Name FROM RESTAURANT WHERE RestaurantID = ?",
            [restaurantId]
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant not found'
            });
        }

        const rows = await dbAll(
            "SELECT MenuID, ItemName, Price, Category FROM MENU WHERE RestaurantID = ? ORDER BY Category, ItemName",
            [restaurantId]
        );

        res.json({
            success: true,
            restaurant: restaurant,
            count: rows.length,
            menu: rows
        });
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu',
            message: err.message
        });
    }
});

/* -------------------------------------------
   ADD RESTAURANT + MULTIPLE MENU ITEMS
--------------------------------------------*/
app.post("/addRestaurantWithMenu", async (req, res) => {
    try {
        console.log('📥 POST /addRestaurantWithMenu payload:', req.body);
        const { Name, Location, Contact, MenuItems } = req.body;

        // Validation
        if (!Name || !Name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Restaurant name is required'
            });
        }
        if (!Location || !Location.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }
        if (!Contact || !Contact.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Contact number is required'
            });
        }
        if (!MenuItems || !Array.isArray(MenuItems) || MenuItems.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one menu item is required'
            });
        }

        // Validate menu items
        for (let i = 0; i < MenuItems.length; i++) {
            const item = MenuItems[i];
            console.log(`🔍 validating new-restaurant menu item ${i + 1}:`, item);
            if (!item.ItemName || !item.ItemName.trim()) {
                console.warn(`⚠️ New-restaurant menu item ${i + 1} missing ItemName`);
                return res.status(400).json({
                    success: false,
                    error: `Menu item ${i + 1}: Item name is required`
                });
            }
            if (!item.Price || isNaN(item.Price) || parseFloat(item.Price) <= 0) {
                console.warn(`⚠️ New-restaurant menu item ${i + 1} invalid Price:`, item.Price);
                return res.status(400).json({
                    success: false,
                    error: `Menu item ${i + 1}: Valid price is required`
                });
            }
        }

        // Insert restaurant
        const restaurant = await dbRun(
            "INSERT INTO RESTAURANT (Name, Location, Contact) VALUES (?, ?, ?)",
            [Name.trim(), Location.trim(), Contact.trim()]
        );

        const restaurantID = restaurant.lastID;

        // Insert menu items
        for (let item of MenuItems) {
            console.log('➡️ inserting new restaurant menu item:', item.ItemName, item.Price, item.Category);
            await dbRun(
                "INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES (?, ?, ?, ?)",
                [
                    restaurantID,
                    item.ItemName.trim(),
                    parseFloat(item.Price),
                    (item.Category || 'General').trim()
                ]
            );
        }

        console.log(`✅ Restaurant added: ${Name} (ID: ${restaurantID}) with ${MenuItems.length} menu items`);

        res.json({
            success: true,
            RestaurantID: restaurantID,
            MenuCount: MenuItems.length,
            message: 'Restaurant and menu items added successfully'
        });

    } catch (err) {
        console.error('Error adding restaurant:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to add restaurant',
            message: err.message
        });
    }
});

/* -------------------------------------------
   CREATE ORDER (FROM CART)
--------------------------------------------*/
app.post('/orders', async (req, res) => {
    try {
        const { CustomerID, RestaurantID, items, paymentMethod } = req.body;

        // Validation
        if (!CustomerID || isNaN(CustomerID) || CustomerID <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid customer ID is required'
            });
        }
        if (!RestaurantID || isNaN(RestaurantID) || RestaurantID <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid restaurant ID is required'
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Order must contain at least one item'
            });
        }

        // Validate Payment Method
        const validPaymentMethods = ['Card', 'Cash', 'UPI', 'NetBanking'];
        const selectedPaymentMethod = paymentMethod || 'Card'; // Default to Card if not provided

        if (!validPaymentMethods.includes(selectedPaymentMethod)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment method. Choose from: Card, Cash, UPI, NetBanking'
            });
        }

        // Verify restaurant exists
        const restaurant = await dbGet(
            "SELECT RestaurantID, Name FROM RESTAURANT WHERE RestaurantID = ?",
            [RestaurantID]
        );
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant not found'
            });
        }

        // Validate and calculate total
        let total = 0;
        for (const item of items) {
            if (!item.MenuID || !item.Quantity || !item.Subtotal) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid item data: MenuID, Quantity, and Subtotal are required'
                });
            }
            const subtotal = parseFloat(item.Subtotal);
            if (isNaN(subtotal) || subtotal <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid subtotal for item'
                });
            }
            total += subtotal;
        }

        // Insert order (SQLite uses CURRENT_TIMESTAMP instead of NOW())
        const order = await dbRun(
            "INSERT INTO ORDERS (CustomerID, RestaurantID, TotalAmount, Status, OrderDate) VALUES (?, ?, ?, ?, datetime('now'))",
            [CustomerID, RestaurantID, total.toFixed(2), 'Placed']
        );

        const orderId = order.lastID;

        // Insert each menu item into orderdetails
        for (const item of items) {
            await dbRun(
                "INSERT INTO ORDERDETAILS (OrderID, MenuID, Quantity, Subtotal) VALUES (?, ?, ?, ?)",
                [orderId, item.MenuID, item.Quantity || 1, parseFloat(item.Subtotal).toFixed(2)]
            );
        }

        // Insert payment
        await dbRun(
            "INSERT INTO PAYMENT (OrderID, Amount, PaymentMethod, PaymentStatus) VALUES (?, ?, ?, ?)",
            [orderId, total.toFixed(2), selectedPaymentMethod, 'Completed']
        );

        // Assign Random Delivery Partner
        const deliveryPartners = ['Ramesh', 'Suresh', 'Rahul', 'Priya', 'Amit', 'Vikram', 'Neha', 'Pooja'];
        const randomPartner = deliveryPartners[Math.floor(Math.random() * deliveryPartners.length)];
        const deliveryTimeSeconds = Math.floor(Math.random() * 16); // 0 to 15 seconds

        await dbRun(
            "INSERT INTO DELIVERY (OrderID, DeliveryPartnerName, DeliveryStatus, DeliveryTime) VALUES (?, ?, ?, datetime('now'))",
            [orderId, randomPartner, "Assigned"]
        );

        console.log(`✅ Order placed: OrderID ${orderId}, Total: ₹${total.toFixed(2)}`);
        console.log(`🚚 Delivery assigned to: ${randomPartner}, Time: ${deliveryTimeSeconds}s`);

        res.json({
            success: true,
            orderId,
            total: total.toFixed(2),
            deliveryPartner: randomPartner,
            deliveryTimeSeconds: deliveryTimeSeconds,
            message: 'Order placed successfully'
        });

    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to place order',
            message: err.message
        });
    }
});

/* -------------------------------------------
   GET FULL ORDER DETAILS
--------------------------------------------*/
app.get('/order/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order ID'
            });
        }

        const order = await dbGet(
            "SELECT * FROM ORDERS WHERE OrderID = ?",
            [orderId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const items = await dbAll(`
            SELECT od.*, m.ItemName, m.Price as UnitPrice
            FROM ORDERDETAILS od 
            JOIN MENU m ON od.MenuID = m.MenuID
            WHERE od.OrderID = ?
        `, [orderId]);

        const payment = await dbGet(
            "SELECT * FROM PAYMENT WHERE OrderID = ?",
            [orderId]
        );

        const delivery = await dbGet(
            "SELECT * FROM DELIVERY WHERE OrderID = ?",
            [orderId]
        );

        res.json({
            success: true,
            order: order,
            items: items,
            payment: payment || null,
            delivery: delivery || null
        });

    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details',
            message: err.message
        });
    }
});

/* -------------------------------------------
   DELETE MENU ITEM
--------------------------------------------*/
app.delete('/menu/:id', async (req, res) => {
    try {
        const menuId = parseInt(req.params.id);
        if (isNaN(menuId) || menuId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid menu ID' });
        }

        const item = await dbGet('SELECT MenuID, ItemName FROM MENU WHERE MenuID = ?', [menuId]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        console.log(`🗑️ Deleting menu item ID ${menuId} (${item.ItemName})`);
        await dbRun('DELETE FROM MENU WHERE MenuID = ?', [menuId]);

        res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ success: false, error: 'Failed to delete menu item', message: err.message });
    }
});

/* -------------------------------------------
   GET MENU ITEM
--------------------------------------------*/
app.get('/menu/:id', async (req, res) => {
    try {
        const menuId = parseInt(req.params.id);
        if (isNaN(menuId) || menuId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid menu ID' });
        }
        const item = await dbGet('SELECT * FROM MENU WHERE MenuID = ?', [menuId]);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }
        res.json({ success: true, item });
    } catch (err) {
        console.error('Error fetching menu item:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch menu item', message: err.message });
    }
});

/* -------------------------------------------
   UPDATE MENU ITEM
--------------------------------------------*/
app.put('/menu/:id', async (req, res) => {
    try {
        const menuId = parseInt(req.params.id);
        const { ItemName, Price, Category } = req.body;

        if (isNaN(menuId) || menuId <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid menu ID' });
        }
        if (!ItemName || !ItemName.trim()) {
            return res.status(400).json({ success: false, error: 'ItemName is required' });
        }
        if (Price === undefined || isNaN(Price) || parseFloat(Price) <= 0) {
            return res.status(400).json({ success: false, error: 'Valid Price is required' });
        }

        const item = await dbGet('SELECT MenuID FROM MENU WHERE MenuID = ?', [menuId]);
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });

        await dbRun('UPDATE MENU SET ItemName = ?, Price = ?, Category = ? WHERE MenuID = ?', [ItemName.trim(), parseFloat(Price), (Category || 'General').trim(), menuId]);

        res.json({ success: true, message: 'Menu item updated' });
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ success: false, error: 'Failed to update menu item', message: err.message });
    }
});

/* -------------------------------------------
   ASSIGN DELIVERY (Admin use)
--------------------------------------------*/
app.post('/delivery/:orderId/assign', async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const { DeliveryPartnerName } = req.body;

        if (isNaN(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order ID'
            });
        }

        if (!DeliveryPartnerName || !DeliveryPartnerName.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Delivery partner name is required'
            });
        }

        // Verify order exists
        const order = await dbGet(
            "SELECT OrderID, Status FROM ORDERS WHERE OrderID = ?",
            [orderId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check if delivery already assigned
        const existingDelivery = await dbGet(
            "SELECT * FROM DELIVERY WHERE OrderID = ?",
            [orderId]
        );

        if (existingDelivery) {
            return res.status(400).json({
                success: false,
                error: 'Delivery already assigned for this order'
            });
        }

        await dbRun(
            "INSERT INTO DELIVERY (OrderID, DeliveryPartnerName, DeliveryStatus, DeliveryTime) VALUES (?, ?, ?, datetime('now'))",
            [orderId, DeliveryPartnerName.trim(), "Assigned"]
        );

        await dbRun(
            "UPDATE ORDERS SET Status = ? WHERE OrderID = ?",
            ["Out For Delivery", orderId]
        );

        console.log(`✅ Delivery assigned: OrderID ${orderId}, Partner: ${DeliveryPartnerName}`);

        res.json({
            success: true,
            message: 'Delivery assigned successfully'
        });

    } catch (err) {
        console.error('Error assigning delivery:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to assign delivery',
            message: err.message
        });
    }
});

/* -------------------------------------------
   GET ALL ORDERS (Admin/User)
--------------------------------------------*/
app.get('/orders', async (req, res) => {
    try {
        const { customerId, restaurantId, status } = req.query;
        let query = `
            SELECT o.*, r.Name as RestaurantName, r.Location
            FROM ORDERS o
            JOIN RESTAURANT r ON o.RestaurantID = r.RestaurantID
            WHERE 1=1
        `;
        const params = [];

        if (customerId) {
            query += ' AND o.CustomerID = ?';
            params.push(parseInt(customerId));
        }
        if (restaurantId) {
            query += ' AND o.RestaurantID = ?';
            params.push(parseInt(restaurantId));
        }
        if (status) {
            query += ' AND o.Status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.OrderDate DESC';

        const rows = await dbAll(query, params);

        res.json({
            success: true,
            count: rows.length,
            orders: rows
        });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders',
            message: err.message
        });
    }
});

/* -------------------------------------------
   ERROR HANDLING MIDDLEWARE
--------------------------------------------*/
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
});

/* -------------------------------------------
   SEED DATABASE WITH DUMMY DATA
--------------------------------------------*/
app.post('/seed-data', async (req, res) => {
    try {
        // Check if restaurants already exist
        const existing = await dbGet("SELECT COUNT(*) as count FROM RESTAURANT");
        if (existing.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Database already contains data. Clear existing data first if you want to seed again.'
            });
        }

        // Insert Restaurants
        const restaurants = [
            ['The Great Indian Dhaba', 'Rajpur Road, Dehradun', '9876543210'],
            ['Pizza Paradise', 'Clock Tower, Dehradun', '9876543211'],
            ['Spice Garden', 'Paltan Bazaar, Dehradun', '9876543212'],
            ['Burger King Dehradun', 'Haridwar Road, Dehradun', '9876543213'],
            ['Tandoori Nights', 'Clement Town, Dehradun', '9876543214'],
            ['Chinese Corner', 'Ballupur, Dehradun', '9876543215'],
            ['South Indian Delight', 'Saharanpur Road, Dehradun', '9876543216'],
            ['Cafe Coffee Day', 'Rajpur Road, Dehradun', '9876543217']
        ];

        const restaurantIds = [];
        for (const [name, location, contact] of restaurants) {
            const result = await dbRun(
                "INSERT INTO RESTAURANT (Name, Location, Contact) VALUES (?, ?, ?)",
                [name, location, contact]
            );
            restaurantIds.push(result.lastID);
        }

        // Insert Menu Items
        const menuItems = [
            // Restaurant 1 - The Great Indian Dhaba
            [restaurantIds[0], 'Butter Chicken', 350.00, 'Main Course'],
            [restaurantIds[0], 'Dal Makhani', 180.00, 'Main Course'],
            [restaurantIds[0], 'Paneer Tikka', 280.00, 'Appetizer'],
            [restaurantIds[0], 'Naan', 40.00, 'Bread'],
            [restaurantIds[0], 'Roti', 15.00, 'Bread'],
            [restaurantIds[0], 'Biryani', 320.00, 'Main Course'],
            [restaurantIds[0], 'Gulab Jamun', 80.00, 'Dessert'],
            [restaurantIds[0], 'Lassi', 60.00, 'Beverage'],

            // Restaurant 2 - Pizza Paradise
            [restaurantIds[1], 'Margherita Pizza', 250.00, 'Pizza'],
            [restaurantIds[1], 'Pepperoni Pizza', 350.00, 'Pizza'],
            [restaurantIds[1], 'Veg Supreme Pizza', 320.00, 'Pizza'],
            [restaurantIds[1], 'Chicken BBQ Pizza', 380.00, 'Pizza'],
            [restaurantIds[1], 'Garlic Bread', 120.00, 'Appetizer'],
            [restaurantIds[1], 'French Fries', 100.00, 'Appetizer'],
            [restaurantIds[1], 'Coca Cola', 50.00, 'Beverage'],
            [restaurantIds[1], 'Chocolate Brownie', 150.00, 'Dessert'],

            // Restaurant 3 - Spice Garden
            [restaurantIds[2], 'Chicken Curry', 280.00, 'Main Course'],
            [restaurantIds[2], 'Fish Curry', 320.00, 'Main Course'],
            [restaurantIds[2], 'Veg Thali', 200.00, 'Thali'],
            [restaurantIds[2], 'Non-Veg Thali', 350.00, 'Thali'],
            [restaurantIds[2], 'Chicken Biryani', 350.00, 'Main Course'],
            [restaurantIds[2], 'Mutton Curry', 420.00, 'Main Course'],
            [restaurantIds[2], 'Raita', 60.00, 'Side Dish'],
            [restaurantIds[2], 'Pickle', 30.00, 'Side Dish'],

            // Restaurant 4 - Burger King Dehradun
            [restaurantIds[3], 'Classic Veg Burger', 120.00, 'Burger'],
            [restaurantIds[3], 'Chicken Burger', 150.00, 'Burger'],
            [restaurantIds[3], 'Double Cheese Burger', 180.00, 'Burger'],
            [restaurantIds[3], 'Chicken Wings', 200.00, 'Appetizer'],
            [restaurantIds[3], 'Onion Rings', 100.00, 'Appetizer'],
            [restaurantIds[3], 'Soft Drink', 60.00, 'Beverage'],
            [restaurantIds[3], 'Ice Cream', 80.00, 'Dessert'],
            [restaurantIds[3], 'French Fries', 90.00, 'Appetizer'],

            // Restaurant 5 - Tandoori Nights
            [restaurantIds[4], 'Tandoori Chicken', 380.00, 'Main Course'],
            [restaurantIds[4], 'Chicken Tikka', 320.00, 'Appetizer'],
            [restaurantIds[4], 'Seekh Kebab', 280.00, 'Appetizer'],
            [restaurantIds[4], 'Butter Naan', 50.00, 'Bread'],
            [restaurantIds[4], 'Tandoori Roti', 25.00, 'Bread'],
            [restaurantIds[4], 'Chicken Curry', 300.00, 'Main Course'],
            [restaurantIds[4], 'Mint Chutney', 40.00, 'Side Dish'],
            [restaurantIds[4], 'Mango Lassi', 80.00, 'Beverage'],

            // Restaurant 6 - Chinese Corner
            [restaurantIds[5], 'Veg Manchurian', 180.00, 'Main Course'],
            [restaurantIds[5], 'Chicken Manchurian', 250.00, 'Main Course'],
            [restaurantIds[5], 'Hakka Noodles', 150.00, 'Main Course'],
            [restaurantIds[5], 'Fried Rice', 160.00, 'Main Course'],
            [restaurantIds[5], 'Spring Rolls', 120.00, 'Appetizer'],
            [restaurantIds[5], 'Chilli Chicken', 280.00, 'Main Course'],
            [restaurantIds[5], 'Sweet Corn Soup', 100.00, 'Soup'],
            [restaurantIds[5], 'Hot & Sour Soup', 110.00, 'Soup'],

            // Restaurant 7 - South Indian Delight
            [restaurantIds[6], 'Masala Dosa', 120.00, 'Main Course'],
            [restaurantIds[6], 'Idli Sambar', 80.00, 'Main Course'],
            [restaurantIds[6], 'Vada', 60.00, 'Appetizer'],
            [restaurantIds[6], 'Uttapam', 100.00, 'Main Course'],
            [restaurantIds[6], 'South Indian Thali', 180.00, 'Thali'],
            [restaurantIds[6], 'Filter Coffee', 50.00, 'Beverage'],
            [restaurantIds[6], 'Rava Dosa', 130.00, 'Main Course'],
            [restaurantIds[6], 'Coconut Chutney', 30.00, 'Side Dish'],

            // Restaurant 8 - Cafe Coffee Day
            [restaurantIds[7], 'Cappuccino', 120.00, 'Beverage'],
            [restaurantIds[7], 'Espresso', 100.00, 'Beverage'],
            [restaurantIds[7], 'Latte', 130.00, 'Beverage'],
            [restaurantIds[7], 'Cold Coffee', 150.00, 'Beverage'],
            [restaurantIds[7], 'Sandwich', 140.00, 'Snacks'],
            [restaurantIds[7], 'Pasta', 180.00, 'Main Course'],
            [restaurantIds[7], 'Chocolate Cake', 160.00, 'Dessert'],
            [restaurantIds[7], 'Cookies', 80.00, 'Snacks']
        ];

        for (const [restId, itemName, price, category] of menuItems) {
            await dbRun(
                "INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES (?, ?, ?, ?)",
                [restId, itemName, price, category]
            );
        }

        console.log(`✅ Seeded database with ${restaurants.length} restaurants and ${menuItems.length} menu items`);

        res.json({
            success: true,
            message: 'Database seeded successfully',
            restaurants: restaurants.length,
            menuItems: menuItems.length
        });

    } catch (err) {
        console.error('Error seeding database:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to seed database',
            message: err.message
        });
    }
});



/* -------------------------------------------
   ERROR HANDLING MIDDLEWARE
--------------------------------------------*/

/* -------------------------------------------
   START SERVER
--------------------------------------------*/
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`💾 Database: ${dbPath}`);
});
