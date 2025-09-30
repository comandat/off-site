// scripts/main.js
import { AppState, fetchDataAndSyncState, fetchProductDetailsInBulk, saveProductDetails } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    // Containerele pentru fiecare view
    const mainContent = document.getElementById('main-content');
    const views = {
        comenzi: document.getElementById('view-comenzi'),
        produse: document.getElementById('view-produse'),
        produsDetaliu: document.getElementById('view-produs-detaliu'),
    };

    // Starea curentă a aplicației
    const state = {
        currentView: 'comenzi',
        currentCommandId: null,
        currentProductId: null,
    };

    // --- FUNCȚII DE AFIȘARE / NAVIGARE ---

    function showView(viewName) {
        state.currentView = viewName;
        Object.keys(views).forEach(key => {
            if (key === viewName) {
                views[key].classList.remove('hidden');
            } else {
                views[key].classList.add('hidden');
            }
        });
        mainContent.scrollTop = 0; // Resetează scroll-ul la schimbarea view-ului
    }

    // --- FUNCȚII DE RANDARE PENTRU FIECARE VIEW ---

    // 1. Randează lista de comenzi
    function renderComenziView() {
        const container = document.getElementById('comenzi-list-container');
        const commands = AppState.getCommands();
        
        if (!commands || commands.length === 0) {
            container.innerHTML = `<p class="col-span-full text-gray-500">Nu există comenzi.</p>`;
            return;
        }

        container.innerHTML = commands.map(cmd => `
            <div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow" data-command-id="${cmd.id}">
                <h3 class="font-bold text-gray-800">${cmd.name}</h3>
                <p class="text-sm text-gray-500">${cmd.products.length} produse</p>
            </div>
        `).join('');
    }

    // 2. Randează lista de produse pentru o comandă
    async function renderProduseView(commandId) {
        const command = AppState.getCommands().find(c => c.id === commandId);
        if (!command) return;
        state.currentCommandId = commandId;

        views.produse.innerHTML = `
            <header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center">
                <button id="back-to-comenzi" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button>
                <h1 class="text-xl font-bold text-gray-800">${command.name}</h1>
            </header>
            <div id="produse-list-container" class="p-4 space-y-2">
                <p class="text-center text-gray-500 p-8">Se încarcă produsele...</p>
            </div>`;
        
        showView('produse');

        const asins = command.products.map(p => p.asin);
        const details = await fetchProductDetailsInBulk(asins);
        
        const container = document.getElementById('produse-list-container');
        container.innerHTML = command.products.map(p => {
            const productDetail = details[p.asin];
            return `
            <div class="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm cursor-pointer hover:bg-gray-50" data-product-id="${p.id}">
                <img src="${productDetail?.images?.[0] || ''}" class="w-16 h-16 object-cover rounded-md bg-gray-200">
                <div class="flex-1">
                    <p class="font-semibold text-gray-900 line-clamp-2">${productDetail?.title || 'Nume indisponibil'}</p>
                    <p class="text-sm text-gray-500">${p.asin}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg">${p.found}/${p.expected}</p>
                </div>
                <span class="material-icons text-gray-400">chevron_right</span>
            </div>`;
        }).join('');
    }

    // 3. Randează detaliile unui produs (folosind structura din pagina.html)
    async function renderProdusDetaliuView(productId, commandId) {
        state.currentProductId = productId;
        const command = AppState.getCommands().find(c => c.id === commandId);
        const product = command?.products.find(p => p.id === productId);
        if (!product) return;

        views.produsDetaliu.innerHTML = `<p class="p-8 text-center">Se încarcă detaliile produsului...</p>`;
        showView('produsDetaliu');
        
        const detailsMap = await fetchProductDetailsInBulk([product.asin]);
        const details = detailsMap[product.asin];
        
        views.produsDetaliu.innerHTML = `
            <header class="flex items-center justify-between h-16 px-6 border-b bg-white sticky top-0 z-10">
                <div class="flex items-center space-x-4">
                    <button id="back-to-produse" class="text-gray-600"><span class="material-icons">arrow_back</span></button>
                    <h2 class="text-lg font-semibold">Detalii Produs</h2>
                </div>
                <div class="flex items-center space-x-4">
                    <button id="save-product-btn" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Salvează Modificările</button>
                </div>
            </header>
            <div class="p-6 lg:p-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-white p-4 rounded-xl shadow-sm">
                             <img src="${details.images?.[0] || ''}" class="w-full h-auto object-cover rounded-lg">
                        </div>
                        <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div><label class="text-sm font-medium text-gray-500">ASIN</label><input type="text" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2 focus:ring-0" value="${product.asin}" readonly></div>
                        </div>
                    </div>
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-xl shadow-sm p-6 space-y-6">
                            <div>
                                <label for="product-title" class="text-sm font-medium text-gray-500">Titlu</label>
                                <input type="text" id="product-title" class="mt-1 block w-full text-xl font-semibold bg-transparent border-0 border-b-2 p-0" value="${details.title || ''}">
                            </div>
                            <div>
                                <label for="product-description" class="text-sm font-medium text-gray-500">Descriere</label>
                                <textarea id="product-description" rows="8" class="mt-1 block w-full bg-gray-50 border rounded-lg p-3">${details.description || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // --- GESTIONARE EVENIMENTE (CLICK-URI) ---

    mainContent.addEventListener('click', async (event) => {
        const commandCard = event.target.closest('[data-command-id]');
        const productCard = event.target.closest('[data-product-id]');
        const backToComenziBtn = event.target.closest('#back-to-comenzi');
        const backToProduseBtn = event.target.closest('#back-to-produse');
        const saveBtn = event.target.closest('#save-product-btn');
        const navComenziBtn = event.target.closest('#nav-comenzi');

        if (commandCard) {
            const commandId = commandCard.dataset.commandId;
            await renderProduseView(commandId);
        } else if (productCard) {
            const productId = productCard.dataset.productId;
            await renderProdusDetaliuView(productId, state.currentCommandId);
        } else if (backToComenziBtn || navComenziBtn) {
            showView('comenzi');
        } else if (backToProduseBtn) {
            await renderProduseView(state.currentCommandId);
        } else if (saveBtn) {
            saveBtn.textContent = 'Se salvează...';
            saveBtn.disabled = true;

            const updatedData = {
                asin: state.currentProductId, // Presupunem că ASIN nu se schimbă și e legat de ID
                title: document.getElementById('product-title').value,
                description: document.getElementById('product-description').value,
            };

            const success = await saveProductDetails(state.currentCommandId, state.currentProductId, updatedData);
            
            if (success) {
                alert('Salvat cu succes!');
                await renderProduseView(state.currentCommandId); // Reîncarcă lista de produse
            } else {
                alert('Eroare la salvare!');
                saveBtn.textContent = 'Salvează Modificările';
                saveBtn.disabled = false;
            }
        }
    });

    // --- INIȚIALIZARE ---

    async function initializeApp() {
        const container = document.getElementById('comenzi-list-container');
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">Se încarcă comenzile...</p>`;
        
        await fetchDataAndSyncState(); 
        renderComenziView();
        showView('comenzi');
    }

    initializeApp();
});
