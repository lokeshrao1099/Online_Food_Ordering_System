-- Dummy Data for Dehradun Restaurants and Menus
-- SQLite compatible SQL script
-- You can run this using: sqlite3 food_ordering.db < seed_data.sql
-- Or use the API endpoint: POST http://localhost:3000/seed-data

-- Insert Restaurants
INSERT INTO RESTAURANT (Name, Location, Contact) VALUES
('The Great Indian Dhaba', 'Rajpur Road, Dehradun', '9876543210'),
('Pizza Paradise', 'Clock Tower, Dehradun', '9876543211'),
('Spice Garden', 'Paltan Bazaar, Dehradun', '9876543212'),
('Burger King Dehradun', 'Haridwar Road, Dehradun', '9876543213'),
('Tandoori Nights', 'Clement Town, Dehradun', '9876543214'),
('Chinese Corner', 'Ballupur, Dehradun', '9876543215'),
('South Indian Delight', 'Saharanpur Road, Dehradun', '9876543216'),
('Cafe Coffee Day', 'Rajpur Road, Dehradun', '9876543217');

-- Insert Menu Items for The Great Indian Dhaba (RestaurantID = 1)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(1, 'Butter Chicken', 350.00, 'Main Course'),
(1, 'Dal Makhani', 180.00, 'Main Course'),
(1, 'Paneer Tikka', 280.00, 'Appetizer'),
(1, 'Naan', 40.00, 'Bread'),
(1, 'Roti', 15.00, 'Bread'),
(1, 'Biryani', 320.00, 'Main Course'),
(1, 'Gulab Jamun', 80.00, 'Dessert'),
(1, 'Lassi', 60.00, 'Beverage');

-- Insert Menu Items for Pizza Paradise (RestaurantID = 2)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(2, 'Margherita Pizza', 250.00, 'Pizza'),
(2, 'Pepperoni Pizza', 350.00, 'Pizza'),
(2, 'Veg Supreme Pizza', 320.00, 'Pizza'),
(2, 'Chicken BBQ Pizza', 380.00, 'Pizza'),
(2, 'Garlic Bread', 120.00, 'Appetizer'),
(2, 'French Fries', 100.00, 'Appetizer'),
(2, 'Coca Cola', 50.00, 'Beverage'),
(2, 'Chocolate Brownie', 150.00, 'Dessert');

-- Insert Menu Items for Spice Garden (RestaurantID = 3)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(3, 'Chicken Curry', 280.00, 'Main Course'),
(3, 'Fish Curry', 320.00, 'Main Course'),
(3, 'Veg Thali', 200.00, 'Thali'),
(3, 'Non-Veg Thali', 350.00, 'Thali'),
(3, 'Chicken Biryani', 350.00, 'Main Course'),
(3, 'Mutton Curry', 420.00, 'Main Course'),
(3, 'Raita', 60.00, 'Side Dish'),
(3, 'Pickle', 30.00, 'Side Dish');

-- Insert Menu Items for Burger King Dehradun (RestaurantID = 4)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(4, 'Classic Veg Burger', 120.00, 'Burger'),
(4, 'Chicken Burger', 150.00, 'Burger'),
(4, 'Double Cheese Burger', 180.00, 'Burger'),
(4, 'Chicken Wings', 200.00, 'Appetizer'),
(4, 'Onion Rings', 100.00, 'Appetizer'),
(4, 'Soft Drink', 60.00, 'Beverage'),
(4, 'Ice Cream', 80.00, 'Dessert'),
(4, 'French Fries', 90.00, 'Appetizer');

-- Insert Menu Items for Tandoori Nights (RestaurantID = 5)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(5, 'Tandoori Chicken', 380.00, 'Main Course'),
(5, 'Chicken Tikka', 320.00, 'Appetizer'),
(5, 'Seekh Kebab', 280.00, 'Appetizer'),
(5, 'Butter Naan', 50.00, 'Bread'),
(5, 'Tandoori Roti', 25.00, 'Bread'),
(5, 'Chicken Curry', 300.00, 'Main Course'),
(5, 'Mint Chutney', 40.00, 'Side Dish'),
(5, 'Mango Lassi', 80.00, 'Beverage');

-- Insert Menu Items for Chinese Corner (RestaurantID = 6)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(6, 'Veg Manchurian', 180.00, 'Main Course'),
(6, 'Chicken Manchurian', 250.00, 'Main Course'),
(6, 'Hakka Noodles', 150.00, 'Main Course'),
(6, 'Fried Rice', 160.00, 'Main Course'),
(6, 'Spring Rolls', 120.00, 'Appetizer'),
(6, 'Chilli Chicken', 280.00, 'Main Course'),
(6, 'Sweet Corn Soup', 100.00, 'Soup'),
(6, 'Hot & Sour Soup', 110.00, 'Soup');

-- Insert Menu Items for South Indian Delight (RestaurantID = 7)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(7, 'Masala Dosa', 120.00, 'Main Course'),
(7, 'Idli Sambar', 80.00, 'Main Course'),
(7, 'Vada', 60.00, 'Appetizer'),
(7, 'Uttapam', 100.00, 'Main Course'),
(7, 'South Indian Thali', 180.00, 'Thali'),
(7, 'Filter Coffee', 50.00, 'Beverage'),
(7, 'Rava Dosa', 130.00, 'Main Course'),
(7, 'Coconut Chutney', 30.00, 'Side Dish');

-- Insert Menu Items for Cafe Coffee Day (RestaurantID = 8)
INSERT INTO MENU (RestaurantID, ItemName, Price, Category) VALUES
(8, 'Cappuccino', 120.00, 'Beverage'),
(8, 'Espresso', 100.00, 'Beverage'),
(8, 'Latte', 130.00, 'Beverage'),
(8, 'Cold Coffee', 150.00, 'Beverage'),
(8, 'Sandwich', 140.00, 'Snacks'),
(8, 'Pasta', 180.00, 'Main Course'),
(8, 'Chocolate Cake', 160.00, 'Dessert'),
(8, 'Cookies', 80.00, 'Snacks');

