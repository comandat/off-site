// scripts/main.js
import { AppState, fetchDataAndSyncState, fetchProductDetailsInBulk, saveProductDetails } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTE DIN DOM ---
    const mainContent = document.getElementById('main-content');
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    // --- STAREA APLICAȚIEI ---
    const state = {
        currentCommandId: null,
        currentProductId: null,
    };

    // --- NAVIGARE ȘI AFIȘARE VIEW-URI ---
    function showView(viewId) {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.add('hidden');
        });
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.remove('hidden');
        }

        sidebarButtons.forEach(btn => {
            if (btn.dataset.view === viewId) {
                btn.classList.add('active-tab');
            } else {
                btn.classList.remove('active-tab');
            }
        });
        mainContent.scrollTop = 0;
    }

    // --- FUNCȚII DE RANDARE ---

    function renderComenziView() {
        const container = document.getElementById('comenzi-list-container');
        if (!container) return;
        const commands = AppState.getCommands();
        if (!commands || commands.length === 0) {
            container.innerHTML = `<p class="col-span-full text-gray-500">Nu există comenzi de afișat.</p>`;
            return;
        }
        container.innerHTML = commands.map(cmd => `
            <div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow" data-command-id="${cmd.id}">
                <h3 class="font-bold text-gray-800">${cmd.name}</h3>
                <p class="text-sm text-gray-500">${cmd.products.length} produse</p>
            </div>`).join('');
    }

    async function renderProduseView(commandId) {
        const command = AppState.getCommands().find(c => c.id === commandId);
        if (!command) return;
        state.currentCommandId = commandId;
        
        const container = document.getElementById('view-produse');
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Se încarcă produsele...</div>`;
        showView('view-produse');

        const asins = command.products.map(p => p.asin);
        const details = await fetchProductDetailsInBulk(asins);
        
        container.innerHTML = `
            <header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center">
                <button data-action="back-to-comenzi" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button>
                <h1 class="text-xl font-bold text-gray-800">${command.name}</h1>
            </header>
            <div class="p-4 space-y-2">
                ${command.products.map(p => {
                    const d = details[p.asin];
                    return `
                    <div class="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm cursor-pointer hover:bg-gray-50" data-product-id="${p.id}">
                        <img src="${d?.images?.[0] || ''}" class="w-16 h-16 object-cover rounded-md bg-gray-200">
                        <div class="flex-1"><p class="font-semibold text-gray-900 line-clamp-2">${d?.title || 'N/A'}</p><p class="text-sm text-gray-500">${p.asin}</p></div>
                        <div class="text-right"><p class="font-bold text-lg">${p.found}/${p.expected}</p></div>
                        <span class="material-icons text-gray-400">chevron_right</span>
                    </div>`;
                }).join('')}
            </div>`;
    }

    async function renderProdusDetaliuView(productId, commandId) {
        const command = AppState.getCommands().find(c => c.id === commandId);
        const product = command?.products.find(p => p.id === productId);
        if (!product) return;
        state.currentProductId = productId;

        const container = document.getElementById('view-produs-detaliu');
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Se încarcă detaliile...</div>`;
        showView('view-produs-detaliu');

        const detailsMap = await fetchProductDetailsInBulk([product.asin]);
        const details = detailsMap[product.asin];

        container.innerHTML = `
            <header class="flex items-center justify-between h-16 px-6 border-b bg-white sticky top-0 z-10">
                <div class="flex items-center space-x-4">
                    <button data-action="back-to-produse" class="text-gray-600"><span class="material-icons">arrow_back</span></button>
                    <h2 class="text-lg font-semibold">Detalii Produs</h2>
                </div>
                <div><button data-action="save-product" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Salvează</button></div>
            </header>
            <div class="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1 space-y-6">
                    <div class="bg-white p-4 rounded-xl shadow-sm"><img src="${details.images?.[0] || ''}" class="w-full h-auto rounded-lg"></div>
                    <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <div><label class="text-sm text-gray-500">ASIN</label><input type="text" class="mt-1 block w-full p-0 border-0 border-b-2" value="${product.asin}" readonly></div>
                    </div>
                </div>
                <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 space-y-6">
                    <div><label for="product-title" class="text-sm text-gray-500">Titlu</label><input type="text" id="product-title" class="mt-1 block w-full text-xl font-semibold p-0 border-0 border-b-2" value="${details.title || ''}"></div>
                    <div><label for="product-description" class="text-sm text-gray-500">Descriere</label><textarea id="product-description" rows="8" class="mt-1 block w-full bg-gray-50 border rounded-lg p-3">${details.description || ''}</textarea></div>
                </div>
            </div>`;
    }
    
    // --- GESTIONARE EVENIMENTE (CLICK-URI) ---

    // Navigare din sidebar
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => showView(button.dataset.view));
    });

    // Acțiuni în containerul principal (delegație de evenimente)
    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        const commandCard = target.closest('[data-command-id]');
        const productCard = target.closest('[data-product-id]');
        const actionButton = target.closest('[data-action]');

        if (commandCard) {
            await renderProduseView(commandCard.dataset.commandId);
        } else if (productCard) {
            await renderProdusDetaliuView(productCard.dataset.productId, state.currentCommandId);
        } else if (actionButton) {
            const action = actionButton.dataset.action;
            if (action === 'back-to-comenzi') {
                showView('comenzi');
            } else if (action === 'back-to-produse') {
                await renderProduseView(state.currentCommandId);
            } else if (action === 'save-product') {
                actionButton.textContent = 'Se salvează...';
                actionButton.disabled = true;
                const updatedData = {
                    asin: state.currentProductId,
                    title: document.getElementById('product-title').value,
                    description: document.getElementById('product-description').value,
                };
                const success = await saveProductDetails(state.currentCommandId, state.currentProductId, updatedData);
                if (success) { 
                    alert('Salvat!');
                    await renderProduseView(state.currentCommandId);
                } else {
                    alert('Eroare la salvare!');
                    actionButton.textContent = 'Salvează';
                    actionButton.disabled = false;
                }
            }
        }
    });
    
    // --- LOGICĂ FORMULAR UPLOAD ---
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const zipFile = document.getElementById('zip-file').files[0];
            const pdfFile = document.getElementById('pdf-file').files[0];
            const statusEl = document.getElementById('upload-status');
            const uploadBtn = document.getElementById('upload-button');
            const btnText = uploadBtn.querySelector('.button-text');
            const btnLoader = uploadBtn.querySelector('.button-loader');

            if (!zipFile || !pdfFile) {
                statusEl.textContent = 'Te rog selectează ambele fișiere.';
                statusEl.className = 'text-red-600';
                return;
            }

            uploadBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            statusEl.textContent = 'Se trimit fișierele...';
            statusEl.className = '';

            const formData = new FormData();
            formData.append('zipFile', zipFile);
            formData.append('pdfFile', pdfFile);

            try {
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
                const responseData = await response.json();
                if (responseData.status === 'success') {
                    statusEl.textContent = 'Comanda a fost importată cu succes!';
                    statusEl.className = 'text-green-600';
                    uploadForm.reset();
                    await fetchDataAndSyncState(); // Reîncarcă lista de comenzi
                    renderComenziView();          // Reafișează lista
                } else {
                    throw new Error('Serverul nu a confirmat succesul.');
                }
            } catch (error) {
                console.error('Eroare la upload:', error);
                statusEl.textContent = 'A apărut o eroare. Încearcă din nou.';
                statusEl.className = 'text-red-600';
            } finally {
                uploadBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
            }
        });
    }

    // --- INIȚIALIZARE APLICAȚIE ---
    async function initializeApp() {
        const container = document.getElementById('comenzi-list-container');
        if (container) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">Se încarcă comenzile...</p>`;
            await fetchDataAndSyncState();
            renderComenziView();
        }
    }

    initializeApp();
});
