import { getProducts, getProductById, searchProducts } from './mockData.js';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Handle Product Details Page
    if (productId && window.location.pathname.includes('details.html')) {
        loadProductDetails(productId);
    }

    // Handle Search/Home Logic
    const searchInput = document.getElementById('homeSearch') || document.getElementById('resultsSearch') || document.getElementById('detailsSearch');
    const searchBtn = document.getElementById('homeSearchBtn') || document.getElementById('resultsSearchBtn') || document.getElementById('detailsSearchBtn');
    const homeProductGrid = document.getElementById('homeProductGrid');
    const resultsGrid = document.getElementById('resultsGrid');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value;
            if (window.location.pathname.includes('results.html')) {
                handleSearch(query, resultsGrid);
                const display = document.getElementById('searchQueryDisplay');
                if (display) display.textContent = `Showing results for: "${query}"`;
            } else if (window.location.pathname.includes('index.html')) {
                handleSearch(query, homeProductGrid);
                // Maybe navigate to results page if it's a real search?
                // For now, just update the grid.
            }
        });
    }

    // Initial load for home products
    if (homeProductGrid) {
        loadProducts(homeProductGrid);
    }
});

function loadProducts(container) {
    const products = getProducts();
    container.innerHTML = products.map(p => `
        <div class="card">
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <div class="rating">★ ${p.rating} (${p.reviews})</div>
            <p class="price">$${p.price.toFixed(2)}</p>
            <a href="details.html?id=${p.id}" class="btn-details">View Details</a>
        </div>
    `).join('');
}

function handleSearch(query, container) {
    if (!container) return;
    
    // Show loader
    container.innerHTML = '<div class="loader"></div>';

    // Simulate network delay
    setTimeout(() => {
        const results = searchProducts(query);
        if (results.length === 0) {
            container.innerHTML = '<p class="error-message">No products found for your search.</p>';
        } else {
            container.innerHTML = results.map(p => `
                <div class="card">
                    <img src="${p.image}" alt="${p.name}">
                    <h3>${p.name}</h3>
                    <div class="rating">★ ${p.rating} (${p.reviews})</div>
                    <p class="price">$${p.price.toFixed(2)}</p>
                    <a href="details.html?id=${p.id}" class="btn-details">View Details</a>
                </div>
            `).join('');
        }
    }, 500);
}

function loadProductDetails(id) {
    const product = getProductById(id);
    const title = document.getElementById('detailTitle');
    const category = document.getElementById('detailCategory');
    const description = document.getElementById('detailDescription');
    const price = document.getElementById('detailPrice');
    const rating = document.getElementById('detailRating');
    const img = document.querySelector('#productImg img');
    const loader = document.getElementById('loader');
    const error = document.getElementById('error');

    if (!product) {
        loader.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Product not found.';
        return;
    }

    // Show loader
    loader.style.display = 'block';
    error.style.display = 'none';

    // Simulate network delay
    setTimeout(() => {
        loader.style.display = 'none';
        title.textContent = product.name;
        category.textContent = product.category;
        description.textContent = product.description;
        price.textContent = `$${product.price.toFixed(2)}`;
        rating.textContent = `★ ${product.rating} (${product.reviews} reviews)`;
        img.src = product.image;
        img.alt = product.name;
    }, 500);
}
