/* FULL UPDATED JAVASCRIPT WITH RECEIPT FIX */

let products = [
    { name: 'Qora (Cow Feed)', price: 25.00, stock: 50, id: 1, imageUrl: 'https://via.placeholder.com/250x150?text=Qora' },
    { name: 'Vushi (Protein Mix)', price: 35.00, stock: 30, id: 2, imageUrl: 'https://via.placeholder.com/250x150?text=Vushi' },
    { name: 'Cow Supplement', price: 15.00, stock: 20, id: 3, imageUrl: 'https://via.placeholder.com/250x150?text=Cow+Supplement' }
];

let cart = [];
let adminLoggedIn = false;

// Display products
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p class="price">$${product.price.toFixed(2)} per bag</p>
            <p class="stock">In Stock: ${product.stock} bags</p>
            <button onclick="addToCart('${product.name}', ${product.price})">Add to Cart</button>
        `;
        productList.appendChild(productCard);
    });

    displayAdminProducts();
}

// Add product (Admin)
function addProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const imageFile = document.getElementById('productImage').files[0];

    if (!name || !price || !stock) {
        alert("Please fill out all fields");
        return;
    }

    let imageUrl = imageFile ? URL.createObjectURL(imageFile) :
        "https://via.placeholder.com/250x150?text=No+Image";

    products.push({
        name, price, stock,
        id: Date.now(),
        imageUrl
    });

    displayProducts();
    displayAdminProducts();
}

// Preview Admin Image
function previewImage(event) {
    const output = document.getElementById('imagePreview');
    output.src = URL.createObjectURL(event.target.files[0]);
}

// Admin Select List
function displayAdminProducts() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '';
    products.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = product.name;
        select.appendChild(option);
    });
}

// Remove Product (Admin)
function removeProduct() {
    const index = document.getElementById('productSelect').value;
    products.splice(index, 1);
    displayProducts();
}

// Load product for editing
function loadProductForEdit() {
    const index = document.getElementById('productSelect').value;
    const product = products[index];

    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('imagePreview').src = product.imageUrl;
}

// Save edited product
function saveProductChanges() {
    const index = document.getElementById('productSelect').value;

    products[index].name = document.getElementById('productName').value;
    products[index].price = parseFloat(document.getElementById('productPrice').value);
    products[index].stock = parseInt(document.getElementById('productStock').value);

    const newImage = document.getElementById('productImage').files[0];
    if (newImage) {
        products[index].imageUrl = URL.createObjectURL(newImage);
    }

    displayProducts();
    alert("Product Updated Successfully!");
}

// Add to Cart
function addToCart(productName, productPrice) {
    const product = products.find(p => p.name === productName);
    if (!product || product.stock <= 0) {
        alert("Out of stock");
        return;
    }

    cart.push({ productName, productPrice, qty: 1 });
    product.stock--;
    displayProducts();
    showAddedToCartMessage();
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

// Update Cart Sidebar
function updateCartSidebar() {
    const cartItemsList = document.getElementById('cartItemsList');
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.productName} - $${item.productPrice.toFixed(2)}</span>
            <button onclick="removeFromCart('${item.productName}')">Remove</button>
        `;
        cartItemsList.appendChild(div);
    });
}

// Remove from cart
function removeFromCart(productName) {
    cart = cart.filter(item => item.productName !== productName);
    updateCartSidebar();
}

/*  
=====================================
  UPDATED EPSON RECEIPT PRINT SYSTEM  
=====================================
*/

function printCart() {
    let total = 0;

    let receipt = "";
    receipt += "        JAMIR TRADING\n";
    receipt += "--------------------------------------\n";
    receipt += "Name              Price  Qty   Total\n";
    receipt += "--------------------------------------\n";

    cart.forEach(item => {
        const lineTotal = item.productPrice * item.qty;
        total += lineTotal;

        receipt +=
            item.productName.padEnd(16).substring(0, 16) +
            item.productPrice.toFixed(2).toString().padStart(7) +
            String(item.qty).padStart(5) +
            lineTotal.toFixed(2).padStart(8) +
            "\n";
    });

    receipt += "--------------------------------------\n";
    receipt += "Grand Total:              " + total.toFixed(2) + "\n";
    receipt += "--------------------------------------\n";
    receipt += "\nThank you!\n";

    // Create printing window
    const printWindow = window.open('', '', 'width=400,height=600');

    printWindow.document.write("<pre>" + receipt + "</pre>");
    printWindow.document.close();  // VERY IMPORTANT

    // Wait for load → then print
    printWindow.onload = function () {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
}
// Admin Login (fixed)
function adminLogin() {
    const pass = document.getElementById('adminPassword').value;
    if (pass === "jamirjeda") {
        adminLoggedIn = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        displayAdminProducts();
    } else {
        alert("Incorrect password!");
    }
}

displayProducts();
