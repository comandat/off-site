// scripts/main.js
import { AppState, fetchDataAndSyncState, fetchProductDetailsInBulk, saveProductDetails } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    const state = {
        currentCommandId: null,
        currentProductId: null,
        editedProductData: {},
        activeVersionKey: 'origin'
    };

    function setActiveView(viewId) {
        sidebarButtons.forEach(btn => btn.classList.toggle('active-tab', btn.dataset.view === viewId));
        mainContent.scrollTop = 0;
    }

    const templates = {
        comenzi: () => {
            const commands = AppState.getCommands();
            const commandsHTML = commands.length > 0
                ? commands.map(cmd => `<div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow" data-command-id="${cmd.id}"><h3 class="font-bold text-gray-800">${cmd.name}</h3><p class="text-sm text-gray-500">${cmd.products.length} produse</p></div>`).join('')
                : `<p class="col-span-full text-gray-500">Nu există comenzi de afișat.</p>`;
            return `<div class="p-6 sm:p-8"><h2 class="text-3xl font-bold text-gray-800 mb-6">Panou de Comenzi</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${commandsHTML}</div></div>`;
        },
        import: () => `<div class="p-6 sm:p-8"><h2 class="text-3xl font-bold text-gray-800 mb-6">Import Comandă Nouă</h2><div class="max-w-md bg-white p-8 rounded-lg shadow-md"><form id="upload-form"><div class="mb-5"><label for="zip-file" class="block mb-2 text-sm font-medium">Manifest (.zip):</label><input type="file" id="zip-file" name="zipFile" accept=".zip" required class="w-full text-sm border-gray-300 rounded-lg cursor-pointer bg-gray-50"></div><div class="mb-6"><label for="pdf-file" class="block mb-2 text-sm font-medium">Factura (.pdf):</label><input type="file" id="pdf-file" name="pdfFile" accept=".pdf" required class="w-full text-sm border-gray-300 rounded-lg cursor-pointer bg-gray-50"></div><p id="upload-status" class="mt-4 text-center text-sm font-medium min-h-[20px]"></p><button id="upload-button" type="submit" class="w-full mt-2 flex justify-center items-center px-4 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"><span class="button-text">Trimite fișierele 🚀</span><div class="button-loader hidden w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div></button></form></div></div>`,
        produse: (command, details) => {
             const productsHTML = command.products.map(p => {
                const d = details[p.asin];
                return `<div class="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm cursor-pointer hover:bg-gray-50" data-product-id="${p.id}"><img src="${d?.images?.[0] || ''}" class="w-16 h-16 object-cover rounded-md bg-gray-200"><div class="flex-1"><p class="font-semibold line-clamp-2">${d?.title || 'N/A'}</p><p class="text-sm text-gray-500">${p.asin}</p></div><div class="text-right"><p class="font-bold text-lg">${p.found}/${p.expected}</p></div><span class="material-icons text-gray-400">chevron_right</span></div>`;
            }).join('');
            return `<header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center"><button data-action="back-to-comenzi" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button><h1 class="text-xl font-bold text-gray-800">${command.name}</h1></header><div class="p-4 space-y-2">${productsHTML}</div>`;
        },
        produsDetaliu: (product, details) => {
            const languages = {
                'bg': 'Bulgarian', 'de': 'German', 'ro': 'Romanian', 'hu': 'Hungarian',
                'el': 'Greek', 'sq': 'Albanian', 'be': 'Belarusian', 'bs': 'Bosnian',
                'ca': 'Catalan', 'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish',
                'nl': 'Dutch', 'en': 'English', 'et': 'Estonian', 'fi': 'Finnish',
                'fr': 'French', 'ga': 'Irish', 'it': 'Italian', 'lv': 'Latvian',
                'lt': 'Lithuanian', 'lb': 'Luxembourgish', 'mk': 'Macedonian', 'mt': 'Maltese',
                'mo': 'Moldovan', 'no': 'Norwegian', 'pl': 'Polish', 'pt': 'Portuguese',
                'ru': 'Russian', 'sr': 'Serbian', 'sk': 'Slovak', 'sl': 'Slovenian',
                'es': 'Spanish', 'sv': 'Swedish', 'tr': 'Turkish', 'uk': 'Ukrainian', 'cy': 'Welsh'
            };
            const languageButtons = Object.entries(languages).map(([code, name]) =>
                `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 language-option" data-lang-code="${code}">${name} (${code.toUpperCase()})</a>`
            ).join('');

            const otherVersions = details.other_versions || {};
            const versionsButtons = Object.keys(otherVersions).map(key => `<button data-version-key="${key}" class="px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md version-btn">${key.toUpperCase()}</button>`).join('');
            const featuresHTML = Object.entries(details.features || {}).map(([name, value]) => `<div class="flex items-center gap-4 feature-row"><input class="w-1/3 bg-gray-50 border rounded-md p-2 text-sm feature-name" type="text" value="${name}"><input class="w-2/3 bg-gray-50 border rounded-md p-2 text-sm feature-value" type="text" value="${value}"><button data-action="delete-feature" class="text-gray-500 hover:text-red-500"><span class="material-icons">delete</span></button></div>`).join('');
            const thumbnailsHTML = (details.images || []).slice(0, 4).map((img, index) => `<img src="${img}" class="w-full h-auto object-cover rounded-md cursor-pointer ${index === 0 ? 'border-2 border-blue-600' : ''}" data-thumb-index="${index}">`).join('');
            return `
            <header class="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div class="flex items-center space-x-4"><button data-action="back-to-produse" class="text-gray-600"><span class="material-icons">arrow_back</span></button><h2 class="text-lg font-semibold">Detalii Produs</h2></div>
                <div class="flex items-center space-x-4">
                    <div class="relative group dropdown">
                        <button class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors dropdown-toggle">
                            <span class="material-icons text-base">translate</span>
                            <span class="text-sm">Traduceți</span>
                            <span class="material-icons text-base">expand_more</span>
                        </button>
                        <div class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl hidden dropdown-menu z-20 border border-gray-200">
                            <input type="text" id="language-search" placeholder="Caută o limbă..." class="w-full px-4 py-2 border-b border-gray-200 focus:outline-none">
                            <div id="language-list" class="max-h-60 overflow-y-auto">
                                ${languageButtons}
                            </div>
                        </div>
                    </div>
                    <button data-action="save-product" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Salvează Modificările</button>
                </div>
            </header>
            <div class="p-6 lg:p-8 flex-1">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 space-y-6">
                        <div class="bg-white p-4 rounded-xl shadow-sm"><img id="main-image" alt="Imaginea principală" class="w-full h-auto object-cover rounded-lg" src="${details.images?.[0] || ''}"><div id="thumbnails-container" class="grid grid-cols-4 gap-2 mt-4">${thumbnailsHTML}</div></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div><label class="text-sm font-medium text-gray-500">Brand</label><input id="product-brand" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${details.brand || ''}"></div>
                            <div><label class="text-sm font-medium text-gray-500">Preț estimat</label><input id="product-price" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${details.price || ''}"></div>
                            <div><label class="text-sm font-medium text-gray-500">ASIN</label><input id="product-asin" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${product.asin}" readonly></div>
                            <div><label class="text-sm font-medium text-gray-500">Categorie eMAG</label><input id="product-category" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${details.category || ''}"></div>
                        </div>
                    </div>
                    <div class="lg:col-span-2 bg-white rounded-xl shadow-sm">
                         <div class="flex items-center justify-between p-4 border-b border-gray-200"><div id="version-selector" class="flex space-x-1 border rounded-lg p-1"><button data-version-key="origin" class="px-4 py-1.5 text-sm font-semibold rounded-md bg-blue-600 text-white version-btn">Origin</button>${versionsButtons}</div></div>
                         <div class="p-6 space-y-6">
                            <div><label for="product-title" class="text-sm font-medium text-gray-500">Titlu</label><input id="product-title" class="mt-1 block w-full text-xl font-semibold bg-transparent p-0 border-0 border-b-2" type="text" value="${details.title || ''}"></div>
                            <div><label for="product-description" class="text-sm font-medium text-gray-500">Descriere</label><textarea id="product-description" rows="8" class="mt-1 block w-full bg-gray-50 border rounded-lg p-3">${details.description || ''}</textarea></div>
                            <div>
                                <h3 class="text-sm font-medium text-gray-500">Caracteristici</h3><div id="features-container" class="mt-2 space-y-3">${featuresHTML}</div>
                                <button data-action="add-feature" class="flex items-center space-x-2 text-sm text-blue-600 font-medium mt-3"><span class="material-icons">add_circle_outline</span><span>Adaugă caracteristică</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    };
    
    function saveCurrentTabData() {
        const title = document.getElementById('product-title').value;
        const description = document.getElementById('product-description').value;
        const features = {};
        document.querySelectorAll('.feature-row').forEach(row => {
            const name = row.querySelector('.feature-name').value.trim();
            const value = row.querySelector('.feature-value').value.trim();
            if (name) features[name] = value;
        });

        if (state.activeVersionKey === 'origin') {
            state.editedProductData.title = title;
            state.editedProductData.description = description;
            state.editedProductData.features = features;
        } else {
            if (!state.editedProductData.other_versions) state.editedProductData.other_versions = {};
            if (!state.editedProductData.other_versions[state.activeVersionKey]) state.editedProductData.other_versions[state.activeVersionKey] = {};
            state.editedProductData.other_versions[state.activeVersionKey] = { title, description, features };
        }
    }

    function loadTabData(versionKey) {
        let dataToLoad = {};
        if (versionKey === 'origin') { dataToLoad = state.editedProductData; } 
        else { dataToLoad = state.editedProductData.other_versions?.[versionKey] || {}; }
        document.getElementById('product-title').value = dataToLoad.title || '';
        document.getElementById('product-description').value = dataToLoad.description || '';
        const featuresContainer = document.getElementById('features-container');
        featuresContainer.innerHTML = Object.entries(dataToLoad.features || {}).map(([name, value]) => `<div class="flex items-center gap-4 feature-row"><input class="w-1/3 bg-gray-50 border rounded-md p-2 text-sm feature-name" type="text" value="${name}"><input class="w-2/3 bg-gray-50 border rounded-md p-2 text-sm feature-value" type="text" value="${value}"><button data-action="delete-feature" class="text-gray-500 hover:text-red-500"><span class="material-icons">delete</span></button></div>`).join('');
        state.activeVersionKey = versionKey;
        document.querySelectorAll('.version-btn').forEach(btn => btn.classList.toggle('bg-blue-600', btn.dataset.versionKey === versionKey));
        document.querySelectorAll('.version-btn').forEach(btn => btn.classList.toggle('text-white', btn.dataset.versionKey === versionKey));
    }
    
    async function renderView(viewId, context = {}) {
        let html = '';
        mainContent.innerHTML = `<div class="p-8 text-center text-gray-500">Se încarcă...</div>`;
        switch(viewId) {
            case 'comenzi': await fetchDataAndSyncState(); html = templates.comenzi(); break;
            case 'import': html = templates.import(); break;
            case 'produse':
                const command = AppState.getCommands().find(c => c.id === context.commandId);
                if (command) {
                    const asins = command.products.map(p => p.asin);
                    const details = await fetchProductDetailsInBulk(asins);
                    html = templates.produse(command, details);
                } break;
            case 'produs-detaliu':
                const cmd = AppState.getCommands().find(c => c.id === context.commandId);
                const product = cmd?.products.find(p => p.id === context.productId);
                if (product) {
                    const detailsMap = await fetchProductDetailsInBulk([product.asin]);
                    state.editedProductData = JSON.parse(JSON.stringify(detailsMap[product.asin]));
                    state.activeVersionKey = 'origin';
                    html = templates.produsDetaliu(product, state.editedProductData);
                } break;
        }
        mainContent.innerHTML = html;
        setActiveView(viewId);
    }
    
    sidebarButtons.forEach(button => button.addEventListener('click', () => renderView(button.dataset.view)));

    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        const commandCard = target.closest('[data-command-id]');
        const productCard = target.closest('[data-product-id]');
        const actionButton = target.closest('[data-action]');
        const versionButton = target.closest('.version-btn');
        const languageOption = target.closest('.language-option');
        const dropdownToggle = target.closest('.dropdown-toggle');

        if (commandCard) {
            state.currentCommandId = commandCard.dataset.commandId;
            await renderView('produse', { commandId: state.currentCommandId });
        } else if (productCard) {
            state.currentProductId = productCard.dataset.productId;
            await renderView('produs-detaliu', { commandId: state.currentCommandId, productId: state.currentProductId });
        } else if (versionButton) {
            saveCurrentTabData();
            loadTabData(versionButton.dataset.versionKey);
        } else if (actionButton) {
            const action = actionButton.dataset.action;
            if (action === 'back-to-comenzi') await renderView('comenzi');
            if (action === 'back-to-produse') await renderView('produse', { commandId: state.currentCommandId });
            if (action === 'add-feature') {
                const container = document.getElementById('features-container');
                const newFeature = document.createElement('div');
                newFeature.className = 'flex items-center gap-4 feature-row';
                newFeature.innerHTML = `<input class="w-1/3 bg-gray-50 border rounded-md p-2 text-sm feature-name" type="text" placeholder="Nume"><input class="w-2/3 bg-gray-50 border rounded-md p-2 text-sm feature-value" type="text" placeholder="Valoare"><button data-action="delete-feature" class="text-gray-500 hover:text-red-500"><span class="material-icons">delete</span></button>`;
                container.appendChild(newFeature);
            }
            if (action === 'delete-feature') { target.closest('.feature-row').remove(); }
            if (action === 'save-product') {
                actionButton.textContent = 'Se salvează...';
                actionButton.disabled = true;
                saveCurrentTabData();
                state.editedProductData.brand = document.getElementById('product-brand').value;
                state.editedProductData.price = document.getElementById('product-price').value;
                state.editedProductData.category = document.getElementById('product-category').value;
                
                const asin = document.getElementById('product-asin').value;
                const success = await saveProductDetails(asin, state.editedProductData);
                
                if (success) { 
                    alert('Salvat cu succes!');
                    await renderView('produse', { commandId: state.currentCommandId });
                } else {
                    alert('Eroare la salvare!');
                    actionButton.textContent = 'Salvează Modificările';
                    actionButton.disabled = false;
                }
            }
        } else if (languageOption) {
            event.preventDefault();
            const langCode = languageOption.dataset.langCode;
            const asin = document.getElementById('product-asin').value;
            const webhookUrl = 'https://automatizare.comandat.ro/webhook/43760233-f351-44ea-8966-6f470e063ae7';

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ asin: asin, language: langCode })
                });
                if (response.ok) {
                    alert(`Traducere pentru ${langCode.toUpperCase()} a fost inițiată.`);
                } else {
                    alert('Eroare la inițierea traducerii.');
                }
            } catch (error) {
                console.error('Eroare Webhook:', error);
                alert('Eroare de rețea la inițierea traducerii.');
            }
        }

        if (dropdownToggle) {
            const dropdownMenu = dropdownToggle.nextElementSibling;
            dropdownMenu.classList.toggle('hidden');
        } else if (!target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });

    mainContent.addEventListener('input', (event) => {
        if (event.target.id === 'language-search') {
            const filter = event.target.value.toLowerCase();
            const links = document.querySelectorAll('#language-list .language-option');
            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                link.style.display = text.includes(filter) ? '' : 'none';
            });
        }
    });
    
    mainContent.addEventListener('submit', async (event) => {
        if (event.target.id === 'upload-form') {
            event.preventDefault();
            const uploadBtn = document.getElementById('upload-button'), btnText = uploadBtn.querySelector('.button-text'), btnLoader = uploadBtn.querySelector('.button-loader'), statusEl = document.getElementById('upload-status'), formData = new FormData(event.target);
            if (!formData.get('zipFile')?.size || !formData.get('pdfFile')?.size) { statusEl.textContent = 'Selectează ambele fișiere.'; statusEl.className = 'text-red-600'; return; }
            uploadBtn.disabled = true; btnText.classList.add('hidden'); btnLoader.classList.remove('hidden'); statusEl.textContent = 'Se trimit fișierele...'; statusEl.className = '';
            try {
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
                const resData = await response.json();
                if (resData.status === 'success') { statusEl.textContent = 'Comanda a fost importată!'; statusEl.className = 'text-green-600'; event.target.reset(); await renderView('comenzi'); } else throw new Error('Eroare server.');
            } catch (error) { statusEl.textContent = 'A apărut o eroare.'; statusEl.className = 'text-red-600';
            } finally { uploadBtn.disabled = false; btnText.classList.remove('hidden'); btnLoader.classList.add('hidden'); }
        }
    });

    renderView('comenzi');
});
