/* =====================================================
   POLISHED & FIXED JAVASCRIPT (script.js)
   (Integrates Firestore successfully)
=====================================================
*/

// --- GLOBAL VARIABLES & FIRESTORE SETUP ---
const productsCollection = window.productsCollection;

let products = [];
let cart = [];
let adminLoggedIn = false;
let invoiceCounter = 1000;
const ADMIN_PASSWORD = "jamirjeda";


// --- FIRESTORE DATA HANDLING & DISPLAY ---

function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = 'Loading products...';

    productsCollection.onSnapshot(snapshot => {
        products = [];
        productList.innerHTML = '';
        
        snapshot.forEach(doc => {
            products.push({ ...doc.data(), firebaseKey: doc.id }); 
        });

        // --- RENDER PRODUCTS ---
        if (products.length === 0) {
            productList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No products available. Please log in as admin to add some.</p>';
        }

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}">
                <h2>${product.name}</h2>
                <p class="price">$${product.price.toFixed(2)} per bag</p>
                <p class="stock">In Stock: ${product.stock} bags</p>
                <button onclick="addToCart('${product.firebaseKey}')" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</button>
            `;
            productList.appendChild(productCard);
        });

        if (adminLoggedIn) {
            displayAdminProducts();
        }
    }, error => {
        console.error("Firestore error loading products:", error);
        productList.innerHTML = `<p style="color: red;">Error loading products: ${error.message}</p>`;
    });
}


// --- ADMIN FUNCTIONS ---

function addProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);

    if (!name || isNaN(price) || isNaN(stock) || price <= 0 || stock < 0) {
        alert("Please fill out all fields with valid numbers for price/stock.");
        return;
    }

    let imageUrl = document.getElementById('imagePreview').src || "https://via.placeholder.com/250x150?text=No+Image";

    const newProduct = {
        name: name,
        price: price,
        stock: stock,
        imageUrl: imageUrl,
        adminKey: ADMIN_PASSWORD 
    };

    productsCollection.add(newProduct)
        .then(() => {
            alert("Product Added Successfully!");
            clearAdminForm();
        })
        .catch(error => {
            console.error("Error adding product:", error);
            alert("Error adding product. Check console.");
        });
}

function displayAdminProducts() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '';

    if (products.length === 0) {
        select.innerHTML = '<option value="">-- No Products --</option>';
        return;
    }

    products.forEach((product) => {
        const option = document.createElement('option');
        option.value = product.firebaseKey;
        option.textContent = `${product.name} (Stock: ${product.stock})`;
        select.appendChild(option);
    });
}

function removeProduct() {
    const firebaseKey = document.getElementById('productSelect').value;
    if (!firebaseKey) {
        alert("Please select a product to remove.");
        return;
    }
    
    productsCollection.doc(firebaseKey).delete()
        .then(() => {
            alert(`Product removed successfully!`);
        })
        .catch(error => {
            console.error("Error removing product:", error);
            alert("Error removing product. Check console.");
        });
}

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
        adminKey: ADMIN_PASSWORD 
    };

    const newImage = document.getElementById('productImage').files[0];
    if (newImage) {
        updatedData.imageUrl = URL.createObjectURL(newImage); 
    } else {
        const existingProduct = products.find(p => p.firebaseKey === firebaseKey);
        updatedData.imageUrl = existingProduct ? existingProduct.imageUrl : "https://via.placeholder.com/250x150?text=No+Image";
    }
    
    productsCollection.doc(firebaseKey).update(updatedData)
        .then(() => {
            alert("Product Updated Successfully!");
        })
        .catch(error => {
            console.error("Error updating product:", error);
            alert("Error updating product. Check console.");
        });
}

function previewImage(event) {
    const output = document.getElementById('imagePreview');
    output.src = URL.createObjectURL(event.target.files[0]);
}

function clearAdminForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').src = '';
}


// --- CART & CUSTOMER FUNCTIONS ---

function addToCart(firebaseKey) {
    const product = products.find(p => p.firebaseKey === firebaseKey);

    if (!product || product.stock <= 0) {
        alert("Out of stock");
        return;
    }

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

    productsCollection.doc(firebaseKey).update({ 
        stock: product.stock - 1,
        adminKey: ADMIN_PASSWORD
    }); 

    showAddedToCartMessage();
}

function removeFromCart(firebaseKey) {
    const itemIndex = cart.findIndex(item => item.firebaseKey === firebaseKey);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const product = products.find(p => p.firebaseKey === firebaseKey);

        if (product) {
            productsCollection.doc(firebaseKey).update({
                stock: product.stock + item.qty,
                adminKey: ADMIN_PASSWORD
            });
        }

        cart.splice(itemIndex, 1);
        updateCartSidebar();
    }
}

function showAddedToCartMessage() {
    const msg = document.getElementById('addedToCartMessage');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
    updateCartSidebar();
}

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

    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `<p><strong>Cart Total: $${total.toFixed(2)}</strong></p>`;
    cartItemsList.appendChild(totalDiv);
}

function printCart() {
    if (cart.length === 0) {
        alert("Your cart is empty. Nothing to print.");
        return;
    }
    // ... (rest of printCart logic remains the same) ...
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

    invoiceCounter++;

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write("<pre>" + receipt + "</pre>");
    printWindow.document.close();

    printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    cart = [];
    updateCartSidebar();
}


// --- ADMIN LOGIN FIX ---

// --- ADMIN LOGIN ---

/**
 * Handles the administrator login logic.
 * The authentication check is local (password must match ADMIN_PASSWORD constant).
 * If successful, it enables the admin panel and refreshes the product list.
 */
function adminLogin() {
    const passwordField = document.getElementById('adminPassword');
    const pass = passwordField.value;

    if (pass === ADMIN_PASSWORD) {
        // Successful Login
        adminLoggedIn = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'grid';
        passwordField.value = ''; // Clear the password field

        // CRITICAL STEP: Refresh the display to load products and populate the admin dropdown
        displayProducts(); 
        
        console.log("Admin logged in successfully.");

    } else {
        // Failed Login
        alert("Incorrect password! Please try again.");
        passwordField.value = ''; // Clear the input field after failure
        passwordField.focus(); // Keep focus on the field for quick retry
    }
}
