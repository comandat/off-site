// scripts/main.js
import { AppState, fetchDataAndSyncState, fetchProductDetailsInBulk, saveProductDetails } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTE DIN DOM & CONSTANTE ---
    const mainContent = document.getElementById('main-content');
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    // --- STAREA APLICAȚIEI ---
    const state = {
        currentCommandId: null,
        currentProductId: null,
    };

    // --- NAVIGARE ȘI AFIȘARE VIEW-URI ---
    function setActiveView(viewId) {
        sidebarButtons.forEach(btn => {
            btn.classList.toggle('active-tab', btn.dataset.view === viewId);
        });
        mainContent.scrollTop = 0;
    }

    // --- TEMPLATES HTML PENTRU FIECARE VIEW ---

    const templates = {
        comenzi: () => {
            const commands = AppState.getCommands();
            const commandsHTML = commands.length > 0
                ? commands.map(cmd => `
                    <div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow" data-command-id="${cmd.id}">
                        <h3 class="font-bold text-gray-800 pointer-events-none">${cmd.name}</h3>
                        <p class="text-sm text-gray-500 pointer-events-none">${cmd.products.length} produse</p>
                    </div>`).join('')
                : `<p class="col-span-full text-gray-500">Nu există comenzi de afișat.</p>`;
            
            return `
                <div class="p-6 sm:p-8">
                    <h2 class="text-3xl font-bold text-gray-800 mb-6">Panou de Comenzi</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${commandsHTML}</div>
                </div>`;
        },

        import: () => `
            <div class="p-6 sm:p-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">Import Comandă Nouă</h2>
                <div class="max-w-md bg-white p-8 rounded-lg shadow-md">
                    <form id="upload-form">
                        <div class="mb-5"><label for="zip-file" class="block mb-2 text-sm font-medium">Manifest (.zip):</label><input type="file" id="zip-file" name="zipFile" accept=".zip" required class="w-full text-sm border-gray-300 rounded-lg cursor-pointer bg-gray-50"></div>
                        <div class="mb-6"><label for="pdf-file" class="block mb-2 text-sm font-medium">Factura (.pdf):</label><input type="file" id="pdf-file" name="pdfFile" accept=".pdf" required class="w-full text-sm border-gray-300 rounded-lg cursor-pointer bg-gray-50"></div>
                        <p id="upload-status" class="mt-4 text-center text-sm font-medium min-h-[20px]"></p>
                        <button id="upload-button" type="submit" class="w-full mt-2 flex justify-center items-center px-4 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                            <span class="button-text">Trimite fișierele 🚀</span>
                            <div class="button-loader hidden w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </button>
                    </form>
                </div>
            </div>`,

        produse: (command, details) => `
            <header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center">
                <button data-action="back-to-comenzi" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button>
                <h1 class="text-xl font-bold text-gray-800">${command.name}</h1>
            </header>
            <div class="p-4 space-y-2">
                ${command.products.map(p => {
                    const d = details[p.asin];
                    return `
                    <div class="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm cursor-pointer hover:bg-gray-50" data-product-id="${p.id}">
                        <img src="${d?.images?.[0] || ''}" class="w-16 h-16 object-cover rounded-md bg-gray-200 pointer-events-none">
                        <div class="flex-1 pointer-events-none"><p class="font-semibold line-clamp-2">${d?.title || 'N/A'}</p><p class="text-sm text-gray-500">${p.asin}</p></div>
                        <div class="text-right pointer-events-none"><p class="font-bold text-lg">${p.found}/${p.expected}</p></div>
                        <span class="material-icons text-gray-400 pointer-events-none">chevron_right</span>
                    </div>`;
                }).join('')}
            </div>`,

        produsDetaliu: (product, details) => `
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
            </div>`
    };

    // --- FUNCȚII DE RANDARE ---
    
    async function renderView(viewId, context = {}) {
        let html = '';
        mainContent.innerHTML = `<div class="p-8 text-center text-gray-500">Se încarcă...</div>`;
        
        switch(viewId) {
            case 'comenzi':
                await fetchDataAndSyncState();
                html = templates.comenzi();
                break;
            case 'import':
                html = templates.import();
                break;
            case 'produse':
                const command = AppState.getCommands().find(c => c.id === context.commandId);
                if (command) {
                    const asins = command.products.map(p => p.asin);
                    const details = await fetchProductDetailsInBulk(asins);
                    html = templates.produse(command, details);
                }
                break;
            case 'produs-detaliu':
                const cmd = AppState.getCommands().find(c => c.id === context.commandId);
                const product = cmd?.products.find(p => p.id === context.productId);
                if (product) {
                    const detailsMap = await fetchProductDetailsInBulk([product.asin]);
                    html = templates.produsDetaliu(product, detailsMap[product.asin]);
                }
                break;
        }
        mainContent.innerHTML = html;
        setActiveView(viewId);
    }
    
    // --- GESTIONARE EVENIMENTE ---
    
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => renderView(button.dataset.view));
    });

    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        const commandCard = target.closest('[data-command-id]');
        const productCard = target.closest('[data-product-id]');
        const actionButton = target.closest('[data-action]');

        if (commandCard) {
            state.currentCommandId = commandCard.dataset.commandId;
            await renderView('produse', { commandId: state.currentCommandId });
        } else if (productCard) {
            state.currentProductId = productCard.dataset.productId;
            await renderView('produs-detaliu', { commandId: state.currentCommandId, productId: state.currentProductId });
        } else if (actionButton) {
            const action = actionButton.dataset.action;
            if (action === 'back-to-comenzi') await renderView('comenzi');
            if (action === 'back-to-produse') await renderView('produse', { commandId: state.currentCommandId });
            if (action === 'save-product') {
                actionButton.textContent = 'Se salvează...';
                actionButton.disabled = true;
                const updatedData = {
                    asin: document.querySelector('input[value="' + state.currentProductId + '"]')?.value || state.currentProductId,
                    title: document.getElementById('product-title').value,
                    description: document.getElementById('product-description').value,
                };
                const success = await saveProductDetails(state.currentCommandId, state.currentProductId, updatedData);
                if (success) { 
                    alert('Salvat!');
                    await renderView('produse', { commandId: state.currentCommandId });
                } else {
                    alert('Eroare la salvare!');
                    actionButton.textContent = 'Salvează';
                    actionButton.disabled = false;
                }
            }
        }
    });
    
    mainContent.addEventListener('submit', async (event) => {
        if (event.target.id === 'upload-form') {
            event.preventDefault();
            const uploadBtn = document.getElementById('upload-button');
            const btnText = uploadBtn.querySelector('.button-text');
            const btnLoader = uploadBtn.querySelector('.button-loader');
            const statusEl = document.getElementById('upload-status');
            const formData = new FormData(event.target);
            
            if (!formData.get('zipFile')?.size || !formData.get('pdfFile')?.size) {
                statusEl.textContent = 'Te rog selectează ambele fișiere.';
                statusEl.className = 'text-red-600'; return;
            }
            
            uploadBtn.disabled = true;
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            statusEl.textContent = 'Se trimit fișierele...';
            statusEl.className = '';

            try {
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
                const resData = await response.json();
                if (resData.status === 'success') {
                    statusEl.textContent = 'Comanda a fost importată!';
                    statusEl.className = 'text-green-600';
                    event.target.reset();
                    await renderView('comenzi');
                } else throw new Error('Serverul nu a confirmat succesul.');
            } catch (error) {
                statusEl.textContent = 'A apărut o eroare. Încearcă din nou.';
                statusEl.className = 'text-red-600';
            } finally {
                uploadBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
            }
        }
    });

    // --- INIȚIALIZARE APLICAȚIE ---
    renderView('comenzi');
});
