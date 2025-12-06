/* FULL UPDATED JAVASCRIPT FOR FIREBASE BACKEND */

// --- GLOBAL VARIABLES & FIREBASE SETUP ---
// NOTE: firebaseConfig and the 'db' reference must be set up in your index.html
// as instructed previously, before this script runs. We assume 'productsRef' is available.
// If you are missing that setup, your app will fail to load products.

// Reference to the Firebase 'products' node (Assumed to be defined in index.html)
// const productsRef = db.ref('products');

let products = []; // Array to hold products loaded from Firebase
let cart = [];
let adminLoggedIn = false;
let invoiceCounter = 1000;
const ADMIN_PASSWORD = "jamirjeda"; // Keep the password here for consistency

// --- FIREBASE DATA HANDLING ---

/**
 * Loads products from Firebase in real-time.
 * This function also handles rendering the products and populating the admin dropdown.
 */
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = 'Loading products...'; // Display loading state

    // Listen for real-time changes to the 'products' node
    productsRef.on('value', (snapshot) => {
        const productData = snapshot.val();
        products = [];
        productList.innerHTML = '';
        
        if (productData) {
            // Convert Firebase object structure to an array of products
            Object.keys(productData).forEach(key => {
                // Store the Firebase key for updates/removals
                products.push({ ...productData[key], firebaseKey: key }); 
            });
        }

        // --- RENDER PRODUCTS ---
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}">
                <h2>${product.name}</h2>
                <p class="price">$${product.price.toFixed(2)} per bag</p>
                <p class="stock">In Stock: ${product.stock} bags</p>
                <button onclick="addToCart('${product.firebaseKey}')" ${product.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
            `;
            productList.appendChild(productCard);
        });

        // Update the admin panel list if admin is logged in
        if (adminLoggedIn) {
            displayAdminProducts();
        }
    });
}

// --- ADMIN FUNCTIONS ---

// Add product (Admin) - Now saves to Firebase
function addProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const imageFile = document.getElementById('productImage').files[0];

    if (!name || isNaN(price) || isNaN(stock) || price <= 0 || stock < 0) {
        alert("Please fill out all fields with valid numbers for price/stock.");
        return;
    }

    // Since we can't upload images easily without Firebase Storage, 
    // we use the image preview src if available, otherwise a placeholder.
    let imageUrl = document.getElementById('imagePreview').src || "https://via.placeholder.com/250x150?text=No+Image";

    const newProduct = {
        name: name,
        price: price,
        stock: stock,
        imageUrl: imageUrl,
        // *** THIS IS THE CRITICAL LINE FOR FIREBASE SECURITY RULES ***
        adminKey: ADMIN_PASSWORD 
    };

    // Push the new product to Firebase (it generates the unique ID)
    productsRef.push(newProduct)
        .then(() => {
            alert("Product Added Successfully!");
            clearAdminForm();
        })
        .catch(error => {
            console.error("Error adding product:", error);
            alert("Error adding product. Check console.");
        });
}

// Admin Select List
function displayAdminProducts() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '';
    products.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = product.firebaseKey; // Use Firebase Key as the value
        option.textContent = `${product.name} (Stock: ${product.stock})`;
        select.appendChild(option);
    });
}

// Remove Product (Admin) - Now uses Firebase key and delete method
function removeProduct() {
    const firebaseKey = document.getElementById('productSelect').value;
    if (!firebaseKey) {
        alert("Please select a product to remove.");
        return;
    }

    // Remove product from Firebase
    productsRef.child(firebaseKey).remove()
        .then(() => {
            alert(`Product removed successfully!`);
        })
        .catch(error => {
            console.error("Error removing product:", error);
            alert("Error removing product. Check console.");
        });
}

// Load product for editing
function loadProductForEdit() {
    const firebaseKey = document.getElementById('productSelect').value;
    if (!firebaseKey) {
        alert("Please select a product to edit.");
        return;
    }
    const product = products.find(p => p.firebaseKey === firebaseKey);

    if (product) {
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('imagePreview').src = product.imageUrl;
    }
}

// Save edited product - Now updates Firebase
function saveProductChanges() {
    const firebaseKey = document.getElementById('productSelect').value;
    if (!firebaseKey) {
        alert("Please select a product to save changes for.");
        return;
    }

    const updatedData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        // *** CRITICAL: Send adminKey again for write access ***
        adminKey: ADMIN_PASSWORD 
    };

    const newImage = document.getElementById('productImage').files[0];
    if (newImage) {
        // Again, assuming local image preview for simplicity without Firebase Storage
        updatedData.imageUrl = URL.createObjectURL(newImage); 
    } else {
        // Retain existing image URL if no new file is uploaded
        const existingProduct = products.find(p => p.firebaseKey === firebaseKey);
        updatedData.imageUrl = existingProduct ? existingProduct.imageUrl : "https://via.placeholder.com/250x150?text=No+Image";
    }

    productsRef.child(firebaseKey).update(updatedData)
        .then(() => {
            alert("Product Updated Successfully!");
        })
        .catch(error => {
            console.error("Error updating product:", error);
            alert("Error updating product. Check console.");
        });
}

// Preview Admin Image
function previewImage(event) {
    const output = document.getElementById('imagePreview');
    output.src = URL.createObjectURL(event.target.files[0]);
}

// Clears the Admin form fields
function clearAdminForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').src = '';
}

// --- CART FUNCTIONS ---

// Add to Cart - Decrements stock in Firebase
function addToCart(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);

    if (!product || product.stock <= 0) {
        alert("Out of stock");
        return;
    }

    // Check if item is already in cart to increase quantity
    const existingItem = cart.find(item => item.firebaseKey === firebaseKey);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            firebaseKey: firebaseKey,
            productName: product.name,
            productPrice: product.price,
            qty: 1
        });
    }

    // Update stock in Firebase
    productsRef.child(firebaseKey).update({ 
        stock: product.stock - 1,
        adminKey: ADMIN_PASSWORD // Send key to pass security rule
    }); 

    // The displayProducts listener will automatically refresh the stock display
    showAddedToCartMessage();
}

// Remove from cart (re-adds stock to products in Firebase)
function removeFromCart(firebaseKey) {
    const itemIndex = cart.findIndex(item => item.firebaseKey === firebaseKey);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const product = products.find(p => p.firebaseKey === firebaseKey);

        // Return stock in Firebase
        if (product) {
            productsRef.child(firebaseKey).update({
                stock: product.stock + item.qty,
                adminKey: ADMIN_PASSWORD // Send key to pass security rule
            });
        }

        // Remove item from cart array
        cart.splice(itemIndex, 1);
        updateCartSidebar();
    }
}

// Added to cart message
function showAddedToCartMessage() {
    const msg = document.getElementById('addedToCartMessage');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

// Toggle Cart
function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
    updateCartSidebar();
}

// Update Cart Sidebar (Remains local)
function updateCartSidebar() {
    const cartItemsList = document.getElementById('cartItemsList');
    cartItemsList.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.productPrice * item.qty;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.productName} (x${item.qty}) - $${itemTotal.toFixed(2)}</span>
            <button onclick="removeFromCart('${item.firebaseKey}')">Remove All</button>
        `;
        cartItemsList.appendChild(div);
    });

    // Add total to the sidebar
    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `<p><strong>Cart Total: $${total.toFixed(2)}</strong></p>`;
    cartItemsList.appendChild(totalDiv);
}

/*  
=====================================
  RECEIPT PRINT SYSTEM (Remains Local)
=====================================
*/ 

function printCart() {
    if (cart.length === 0) {
        alert("Your cart is empty. Nothing to print.");
        return;
    }

    // ... (Receipt generation logic remains the same) ...
    let total = 0;
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let receipt = "";
    receipt += "         JAMIR TRADING\n";
    receipt += "      Cow Food & Supplies\n";
    receipt += "    Address: 123 Farm Lane\n";
    receipt += "          City, Country\n";
    receipt += "------------------------------\n";
    receipt += `Invoice #: ${invoiceCounter}\n`;
    receipt += `Date: ${dateStr}   Time: ${timeStr}\n`;
    receipt += "------------------------------\n";
    receipt += "Name             Price Qty  Total\n";
    receipt += "------------------------------\n";

    cart.forEach(item => {
        const lineTotal = item.productPrice * item.qty;
        total += lineTotal;

        receipt +=
            item.productName.padEnd(16).substring(0,16) +
            item.productPrice.toFixed(2).toString().padStart(7) +
            String(item.qty).padStart(5) +
            lineTotal.toFixed(2).padStart(8) +
            "\n";
    });

    receipt += "------------------------------\n";
    receipt += "Grand Total:              " + total.toFixed(2) + "\n";
    receipt += "------------------------------\n";
    receipt += "    Thank you for your visit!\n\n";

    // Increment invoice for next print
    invoiceCounter++;

    // Open print window
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write("<pre>" + receipt + "</pre>");
    printWindow.document.close();

    printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    // After printing, clear the cart to simulate a completed transaction
    cart = [];
    updateCartSidebar();
}

// --- ADMIN LOGIN ---

// Admin Login (remains local)
function adminLogin() {
    const pass = document.getElementById('adminPassword').value;
    if (pass === ADMIN_PASSWORD) { // Uses the global constant
        adminLoggedIn = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'grid';
        displayAdminProducts();
        document.getElementById('adminPassword').value = ''; 
    } else {
        alert("Incorrect password!");
    }
}

// --- INITIALIZATION ---

// Initial call to start the app and load products from Firebase
displayProducts();
