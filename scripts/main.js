// scripts/main.js
import { AppState, fetchDataAndSyncState, fetchProductDetailsInBulk, saveProductDetails } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    const state = {
        currentCommandId: null,
        currentManifestSKU: null,
        currentProductId: null,
        editedProductData: {},
        activeVersionKey: 'origin',
        descriptionEditorMode: 'raw',
        sortableInstance: null // Pentru a gestiona instanța Drag & Drop
    };

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
    
    const languageNameToCodeMap = {};
    for (const [code, name] of Object.entries(languages)) {
        languageNameToCodeMap[name.toLowerCase()] = code.toUpperCase();
    }

    // --- NOU: Funcție pentru a activa Drag & Drop (Sortable.js) ---
    function initializeSortable() {
        const thumbsContainer = document.getElementById('thumbnails-container');
        if (state.sortableInstance) {
            state.sortableInstance.destroy(); // Distruge instanța veche
        }
        if (thumbsContainer) {
            state.sortableInstance = new Sortable(thumbsContainer, {
                animation: 150,
                ghostClass: 'bg-blue-100', // Clasa pentru elementul fantomă
                forceFallback: true,
                onEnd: () => {
                    // Când reordonarea e gata, salvăm noua ordine în 'state'
                    saveCurrentTabData(); 
                }
            });
        }
    }

    /**
     * --- MODIFICAT: Funcție helper pentru a randa galeria de imagini ---
     * @param {string[]} images - Array de URL-uri de imagini
     * @returns {string} - HTML-ul pentru galerie
     */
    function renderImageGallery(images) {
        // Cazul în care tab-ul tradus nu are (încă) imagini
        if (!images) {
            return `
                <div class="flex flex-col items-center justify-center h-48 text-gray-500">
                    <span class="material-icons text-4xl">photo_library</span>
                    <p class="mt-2">Nu ai stabilit niste poze pentru aceasta tara.</p>
                </div>
                <button data-action="add-image-url" class="mt-4 w-full flex items-center justify-center space-x-2 p-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <span class="material-icons text-base">add_link</span>
                    <span>Adaugă Imagine (URL)</span>
                </button>
            `;
        }

        // Cazul în care este un array (posibil gol)
        const mainImageSrc = images[0] || ''; // Prima imagine sau nimic
        let thumbnailsHTML = '';

        // Creăm 5 sloturi pentru thumbnails
        for (let i = 0; i < 5; i++) {
            const img = images[i];
            if (img) {
                // Avem imagine, creăm thumbnail-ul
                thumbnailsHTML += `
                    <div class="relative group aspect-square" data-image-src="${img}">
                        <img src="${img}" 
                             class="w-full h-full object-cover rounded-md cursor-pointer thumbnail-image ${mainImageSrc === img ? 'border-2 border-blue-600' : ''}" 
                             data-action="select-thumbnail">
                        <button data-action="delete-image" data-image-src="${img}" 
                                class="absolute top-0 right-0 -mt-1 -mr-1 p-0.5 bg-red-600 text-white rounded-full hidden group-hover:block hover:bg-red-700 transition-all opacity-90 hover:opacity-100 z-10">
                            <span class="material-icons" style="font-size: 16px;">close</span>
                        </button>
                    </div>
                `;
            } else {
                // Nu avem imagine, creăm un slot gol
                thumbnailsHTML += `
                    <div class="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <span class="material-icons text-gray-300">add</span>
                    </div>
                `;
            }
        }

        return `
            <img id="main-image" alt="Imaginea principală" class="w-[85%] mx-auto h-auto object-cover rounded-lg aspect-[4/3]" src="${mainImageSrc}">
            
            <div id="thumbnails-container" class="grid grid-cols-5 gap-2 mt-4">${thumbnailsHTML}</div>
            
            <button data-action="add-image-url" class="mt-4 w-full flex items-center justify-center space-x-2 p-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                <span class="material-icons text-base">add_link</span>
                <span>Adaugă Imagine (URL)</span>
            </button>
        `;
    }

    // --- NOU: Funcție helper pentru a găsi array-ul de imagini curent ---
    function getCurrentImagesArray() {
        const key = state.activeVersionKey;
        if (key === 'origin') {
            if (!state.editedProductData.images) {
                state.editedProductData.images = []; // Asigură că e array
            }
            return state.editedProductData.images;
        }
        
        // Pentru tab-uri traduse
        if (!state.editedProductData.other_versions) state.editedProductData.other_versions = {};
        if (!state.editedProductData.other_versions[key]) state.editedProductData.other_versions[key] = {};
        if (!state.editedProductData.other_versions[key].images) {
             // Returnează null dacă nu există, pentru a afișa mesajul
            return null;
        }
        
        return state.editedProductData.other_versions[key].images;
    }

    // --- NOU: Funcție helper pentru a seta array-ul de imagini curent ---
    function setCurrentImagesArray(imagesArray) {
        const key = state.activeVersionKey;
        if (key === 'origin') {
            state.editedProductData.images = imagesArray;
            return;
        }

        // Pentru tab-uri traduse
        if (!state.editedProductData.other_versions) state.editedProductData.other_versions = {};
        if (!state.editedProductData.other_versions[key]) state.editedProductData.other_versions[key] = {};
        
        state.editedProductData.other_versions[key].images = imagesArray;
    }


    function setActiveView(viewId) {
        let parentView = viewId;
        if (['paleti', 'produse', 'produs-detaliu'].includes(viewId)) {
            parentView = 'comenzi';
        }
        sidebarButtons.forEach(btn => btn.classList.toggle('active-tab', btn.dataset.view === parentView));
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
        
        paleti: (command, details) => {
            const paleti = {};
            command.products.forEach(p => {
                const sku = p.manifestsku || 'No ManifestSKU';
                if (!paleti[sku]) paleti[sku] = [];
                paleti[sku].push(p);
            });
            const paletiHTML = Object.entries(paleti).map(([sku, products]) => {
                const firstProduct = products[0];
                const firstProductDetails = firstProduct ? details[firstProduct.asin] : null;
                const firstImage = firstProductDetails?.images?.[0] || '';
                return `
                <div class="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow w-40 flex flex-col items-center" data-manifest-sku="${sku}">
                    <img src="${firstImage}" alt="Imagine palet" class="w-32 h-32 object-contain rounded-md bg-gray-200 mb-4">
                    <h3 class="font-bold text-gray-800 text-center">${sku}</h3>
                    <p class="text-sm text-gray-500">${products.length} produse</p>
                </div>`;
            }).join('');
            return `
            <header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center">
                <button data-action="back-to-comenzi" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button>
                <h1 class="text-xl font-bold text-gray-800">Paleți din ${command.name}</h1>
            </header>
            <div class="p-6 sm:p-8"><div class="flex flex-wrap gap-4">${paletiHTML}</div></div>`;
        },

        produse: (command, details, manifestSKU) => {
             const productsToShow = command.products.filter(p => {
                 const sku = p.manifestsku || 'No ManifestSKU';
                 return sku === manifestSKU;
             });
             const productsHTML = productsToShow.map(p => {
                const d = details[p.asin];
                return `<div class="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm cursor-pointer hover:bg-gray-50" data-product-id="${p.id}"><img src="${d?.images?.[0] || ''}" class="w-16 h-16 object-cover rounded-md bg-gray-200"><div class="flex-1"><p class="font-semibold line-clamp-2">${d?.title || 'N/A'}</p><p class="text-sm text-gray-500">${p.asin}</p></div><div class="text-right"><p class="font-bold text-lg">${p.found}/${p.expected}</p></div><span class="material-icons text-gray-400">chevron_right</span></div>`;
            }).join('');
            return `
            <header class="sticky top-0 z-10 bg-white shadow-sm p-4 flex items-center">
                <button data-action="back-to-paleti" class="mr-4 p-2 rounded-full hover:bg-gray-100"><span class="material-icons">arrow_back</span></button> <h1 class="text-xl font-bold text-gray-800">Produse din ${manifestSKU}</h1> </header>
            <div class="p-4 space-y-2">${productsHTML}</div>`;
        },
        
        produsDetaliu: (product, details) => {
            
            const languageButtons = Object.entries(languages).map(([code, name]) =>
                `<a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 language-option" data-lang-code="${code}">${code.toUpperCase()}</a>`
            ).join('');

            const otherVersions = details.other_versions || {};
            
            const versionsButtons = Object.keys(otherVersions).map(key => {
                const displayText = languageNameToCodeMap[key.toLowerCase()] || key.toUpperCase();
                return `<button data-version-key="${key}" class="px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md version-btn">${displayText}</button>`;
            }).join('');
            
            state.descriptionEditorMode = 'raw'; 
            
            // --- MODIFICARE: Galeria de imagini este acum un container gol ---
            // Va fi populată de funcția `renderView` după ce template-ul e randat
            
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
                        
                        <div id="image-gallery-container" class="bg-white p-4 rounded-xl shadow-sm">
                            </div>
                        <div class="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div><label class="text-sm font-medium text-gray-500">Brand</label><input id="product-brand" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${details.brand || ''}"></div>
                            <div><label class="text-sm font-medium text-gray-500">Preț estimat</label><input id="product-price" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${details.price || ''}"></div>
                            <div><label class="text-sm font-medium text-gray-500">ASIN</label><input id="product-asin" class="mt-1 block w-full bg-transparent p-0 border-0 border-b-2" type="text" value="${product.asin}" readonly></div>
                        </div>
                    </div>
                    <div class="lg:col-span-2 bg-white rounded-xl shadow-sm">
                         <div class="flex items-center justify-between p-4 border-b border-gray-200"><div id="version-selector" class="flex space-x-1 border rounded-lg p-1"><button data-version-key="origin" class="px-4 py-1.5 text-sm font-semibold rounded-md bg-blue-600 text-white version-btn">Origin</button>${versionsButtons}</div></div>
                         <div class="p-6 space-y-6">
                            <div><label for="product-title" class="text-sm font-medium text-gray-500">Titlu</label><input id="product-title" class="mt-1 block w-full text-xl font-semibold bg-transparent p-0 border-0 border-b-2" type="text" value="${details.title || ''}"></div>
                            
                            <div>
                                <div class="flex justify-between items-center mb-1">
                                    <label for="product-description-raw" class="text-sm font-medium text-gray-500">Descriere</label>
                                    <div class="flex items-center space-x-1 rounded-lg p-1 border">
                                        <button data-action="toggle-description-mode" data-mode="raw" class="desc-mode-btn bg-blue-600 text-white rounded-md p-1.5">
                                            <span class="material-icons text-base">code</span>
                                        </button>
                                        <button data-action="toggle-description-mode" data-mode="preview" class="desc-mode-btn hover:bg-gray-100 rounded-md p-1.5">
                                            <span class="material-icons text-base">visibility</span>
                                        </button>
                                    </div>
                                </div>
                                <textarea id="product-description-raw" rows="12" class="mt-1 block w-full bg-gray-50 border rounded-lg p-3 font-mono">${details.description || ''}</textarea>
                                <div id="product-description-preview" contenteditable="true" class="prose prose-sm max-w-none hidden mt-1 block w-full h-[278px] overflow-y-auto bg-gray-50 border rounded-lg p-3"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    };
    
    // --- MODIFICAT: saveCurrentTabData ---
    function saveCurrentTabData() {
        const title = document.getElementById('product-title')?.value;
        if (title === undefined) return; // Ieșim dacă elementele nu există (ex: suntem pe altă pagină)
        
        let description = '';
        if (state.descriptionEditorMode === 'raw') {
            const rawEl = document.getElementById('product-description-raw');
            if(rawEl) description = rawEl.value;
        } else {
            const previewEl = document.getElementById('product-description-preview');
            if(previewEl) description = previewEl.innerHTML;
        }

        // --- NOU: Salvăm ordinea curentă a imaginilor din DOM ---
        const thumbsContainer = document.getElementById('thumbnails-container');
        let currentImages = [];
        if (thumbsContainer) {
            thumbsContainer.querySelectorAll('[data-image-src]').forEach(el => {
                currentImages.push(el.dataset.imageSrc);
            });
        } else {
            // Dacă nu există container (ex: tab fără poze), preluăm array-ul din state
            currentImages = getCurrentImagesArray();
        }
        
        // --- MODIFICAT: Salvăm datele în locația corectă din 'state' ---
        const key = state.activeVersionKey;
        if (key === 'origin') {
            state.editedProductData.title = title;
            state.editedProductData.description = description;
            state.editedProductData.images = currentImages; // Salvăm imaginile
        } else {
            if (!state.editedProductData.other_versions) state.editedProductData.other_versions = {};
            if (!state.editedProductData.other_versions[key]) state.editedProductData.other_versions[key] = {};
            
            state.editedProductData.other_versions[key].title = title;
            state.editedProductData.other_versions[key].description = description;
            state.editedProductData.other_versions[key].images = currentImages; // Salvăm imaginile
        }
    }

    // --- MODIFICAT: loadTabData ---
    function loadTabData(versionKey) {
        // 1. Salvăm datele tab-ului *curent* înainte de a încărca tab-ul nou
        saveCurrentTabData();
        
        // 2. Setăm noul tab activ
        state.activeVersionKey = versionKey;
        
        // 3. Încărcăm datele pentru noul tab
        let dataToLoad = {};
        let imagesToLoad = null; // Folosim null pentru a ști când să afișăm mesajul "fără poze"

        if (versionKey === 'origin') {
            dataToLoad = state.editedProductData;
            imagesToLoad = dataToLoad.images; // Acesta ar trebui să fie un array
            if (!imagesToLoad) imagesToLoad = []; // Asigurăm că e array
        } else {
            dataToLoad = state.editedProductData.other_versions?.[versionKey] || {};
            // imagesToLoad poate fi 'undefined' dacă 'other_versions[key].images' nu există
            imagesToLoad = dataToLoad.images; 
        }
        
        // 4. Actualizăm Titlul și Descrierea
        document.getElementById('product-title').value = dataToLoad.title || '';
        
        const description = dataToLoad.description || '';
        const rawEl = document.getElementById('product-description-raw');
        const previewEl = document.getElementById('product-description-preview');
        if (rawEl) rawEl.value = description;
        if (previewEl) previewEl.innerHTML = description;

        // Resetează vizualizarea editorului la 'raw'
        if (rawEl && previewEl) {
             rawEl.classList.remove('hidden');
             previewEl.classList.add('hidden');
             document.querySelector('.desc-mode-btn[data-mode="raw"]').classList.add('bg-blue-600', 'text-white');
             document.querySelector('.desc-mode-btn[data-mode="raw"]').classList.remove('hover:bg-gray-100');
             document.querySelector('.desc-mode-btn[data-mode="preview"]').classList.remove('bg-blue-600', 'text-white');
             document.querySelector('.desc-mode-btn[data-mode="preview"]').classList.add('hover:bg-gray-100');
             state.descriptionEditorMode = 'raw';
        }
        
        // 5. Re-randăm galeria de imagini pentru noul tab
        const galleryContainer = document.getElementById('image-gallery-container');
        if (galleryContainer) {
            galleryContainer.innerHTML = renderImageGallery(imagesToLoad);
            // Dacă am randat imagini (nu mesajul), activăm Drag & Drop
            if (imagesToLoad) {
                initializeSortable();
            }
        }

        // 6. Actualizăm butoanele de versiuni
        document.querySelectorAll('.version-btn').forEach(btn => btn.classList.toggle('bg-blue-600', btn.dataset.versionKey === versionKey));
        document.querySelectorAll('.version-btn').forEach(btn => btn.classList.toggle('text-white', btn.dataset.versionKey === versionKey));
    }
    
    // --- MODIFICAT: renderView ---
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
            case 'paleti':
                const commandForPaleti = AppState.getCommands().find(c => c.id === context.commandId);
                if (commandForPaleti) {
                    const asinsForPaleti = commandForPaleti.products.map(p => p.asin);
                    const detailsForPaleti = await fetchProductDetailsInBulk(asinsForPaleti);
                    html = templates.paleti(commandForPaleti, detailsForPaleti);
                }
                break;
            case 'produse':
                const command = AppState.getCommands().find(c => c.id === context.commandId);
                if (command && context.manifestSKU) { 
                    const asins = command.products.map(p => p.asin);
                    const details = await fetchProductDetailsInBulk(asins);
                    html = templates.produse(command, details, context.manifestSKU); 
                } else {
                     console.error('Eroare: commandId sau manifestSKU lipsă');
                     await renderView('comenzi');
                     return;
                }
                break;
            case 'produs-detaliu':
                const cmd = AppState.getCommands().find(c => c.id === context.commandId);
                const product = cmd?.products.find(p => p.id === context.productId);
                if (product) {
                    const detailsMap = await fetchProductDetailsInBulk([product.asin]);
                    const productDetails = detailsMap[product.asin];
                    // Asigurăm că 'images' (pentru origin) este întotdeauna un array
                    if (!productDetails.images || !Array.isArray(productDetails.images)) {
                        productDetails.images = [];
                    }
                    state.editedProductData = JSON.parse(JSON.stringify(productDetails));
                    state.activeVersionKey = 'origin';
                    html = templates.produsDetaliu(product, state.editedProductData);
                }
                break;
        }
        mainContent.innerHTML = html;
        setActiveView(viewId);
        
        // --- NOU: După ce 'produs-detaliu' e randat, populăm galeria 'origin' ---
        if (viewId === 'produs-detaliu') {
            const galleryContainer = document.getElementById('image-gallery-container');
            if (galleryContainer) {
                // Încărcăm galeria pentru 'origin'
                galleryContainer.innerHTML = renderImageGallery(state.editedProductData.images);
                initializeSortable(); // Activăm Drag & Drop
            }
        }
    }
    
    sidebarButtons.forEach(button => button.addEventListener('click', () => renderView(button.dataset.view)));

    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        const commandCard = target.closest('[data-command-id]');
        const palletCard = target.closest('[data-manifest-sku]');
        const productCard = target.closest('[data-product-id]');
        const actionButton = target.closest('[data-action]');
        const versionButton = target.closest('.version-btn');
        const languageOption = target.closest('.language-option');
        const dropdownToggle = target.closest('.dropdown-toggle');
        const descModeButton = target.closest('[data-action="toggle-description-mode"]');
        const thumbnail = target.closest('[data-action="select-thumbnail"]');

        if (commandCard) {
            state.currentCommandId = commandCard.dataset.commandId;
            state.currentManifestSKU = null;
            state.currentProductId = null;
            await renderView('paleti', { commandId: state.currentCommandId });
        
        } else if (palletCard) { 
            state.currentManifestSKU = palletCard.dataset.manifestSku;
            state.currentProductId = null;
            await renderView('produse', { commandId: state.currentCommandId, manifestSKU: state.currentManifestSKU });
        
        } else if (productCard) {
            state.currentProductId = productCard.dataset.productId;
            await renderView('produs-detaliu', { 
                commandId: state.currentCommandId, 
                productId: state.currentProductId
            });
        
        } else if (versionButton) {
            loadTabData(versionButton.dataset.versionKey); // Funcția 'loadTabData' salvează și tab-ul vechi
        
        } else if (descModeButton) {
            const mode = descModeButton.dataset.mode;
            if (mode === state.descriptionEditorMode) return; 

            const rawEl = document.getElementById('product-description-raw');
            const previewEl = document.getElementById('product-description-preview');

            if (mode === 'preview') {
                previewEl.innerHTML = rawEl.value;
                rawEl.classList.add('hidden');
                previewEl.classList.remove('hidden');
                state.descriptionEditorMode = 'preview';
            } else {
                rawEl.value = previewEl.innerHTML;
                previewEl.classList.add('hidden');
                rawEl.classList.remove('hidden');
                state.descriptionEditorMode = 'raw';
            }
            
            document.querySelectorAll('.desc-mode-btn').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('hover:bg-gray-100');
            });
            descModeButton.classList.add('bg-blue-600', 'text-white');
            descModeButton.classList.remove('hover:bg-gray-100');

        } else if (thumbnail) {
            const mainImage = document.getElementById('main-image');
            if (mainImage) mainImage.src = thumbnail.src;
            document.querySelectorAll('.thumbnail-image').forEach(img => img.classList.remove('border-2', 'border-blue-600'));
            thumbnail.classList.add('border-2', 'border-blue-600');
        
        } else if (actionButton) {
            const action = actionButton.dataset.action;
            
            if (action === 'back-to-comenzi') {
                state.currentCommandId = null;
                state.currentManifestSKU = null;
                state.currentProductId = null;
                await renderView('comenzi');
            }
            if (action === 'back-to-paleti') { 
                state.currentManifestSKU = null;
                state.currentProductId = null;
                await renderView('paleti', { commandId: state.currentCommandId });
            }
            if (action === 'back-to-produse') {
                state.currentProductId = null;
                await renderView('produse', { commandId: state.currentCommandId, manifestSKU: state.currentManifestSKU });
            }
            
            // --- MODIFICAT: Acțiune pentru ștergerea imaginii ---
            if (action === 'delete-image') {
                const imageSrc = actionButton.dataset.imageSrc;
                if (!imageSrc) return;
                
                let currentImages = getCurrentImagesArray();
                if (!currentImages) currentImages = []; // Dacă era null, devine array gol
                
                currentImages = currentImages.filter(img => img !== imageSrc);
                
                setCurrentImagesArray(currentImages); // Salvăm array-ul modificat în state
                
                // Re-randăm galeria
                const galleryContainer = document.getElementById('image-gallery-container');
                if (galleryContainer) {
                    galleryContainer.innerHTML = renderImageGallery(currentImages);
                    initializeSortable();
                }
            }
            
            // --- MODIFICAT: Acțiune pentru adăugarea imaginii prin URL ---
            if (action === 'add-image-url') {
                const newImageUrl = prompt("Vă rugăm introduceți URL-ul noii imagini:");
                if (newImageUrl) {
                    let currentImages = getCurrentImagesArray();
                    if (!currentImages) currentImages = []; // Dacă era null, devine array gol
                    
                    if (currentImages.length >= 5) {
                        alert("Puteți adăuga maxim 5 imagini.");
                        return;
                    }

                    currentImages.push(newImageUrl);
                    setCurrentImagesArray(currentImages); // Salvăm array-ul modificat în state
                    
                    // Re-randăm galeria
                    const galleryContainer = document.getElementById('image-gallery-container');
                    if (galleryContainer) {
                        galleryContainer.innerHTML = renderImageGallery(currentImages);
                        initializeSortable();
                    }
                }
            }

            if (action === 'save-product') {
                actionButton.textContent = 'Se salvează...';
                actionButton.disabled = true;
                
                // 1. Salvăm datele (include descrierea și imaginile modificate)
                saveCurrentTabData(); // Salvează ULTIMELE modificări din tab-ul curent
                
                state.editedProductData.brand = document.getElementById('product-brand').value;
                const priceValue = document.getElementById('product-price').value;
                state.editedProductData.price = priceValue.trim() === '' ? null : priceValue;
                
                // 2. Creăm o copie a datelor
                const payload = JSON.parse(JSON.stringify(state.editedProductData));

                // 3. Transformăm cheile 'other_versions'
                if (payload.other_versions) {
                    const newOtherVersions = {};
                    for (const [langName, langData] of Object.entries(payload.other_versions)) {
                        const langCode = (languageNameToCodeMap[langName.toLowerCase()] || langName).toLowerCase();
                        // langData conține acum title, description ȘI images
                        newOtherVersions[langCode] = langData; 
                    }
                    payload.other_versions = newOtherVersions;
                }

                const asin = document.getElementById('product-asin').value;
                
                // 4. Trimitem payload-ul transformat (care acum include și 'images')
                const success = await saveProductDetails(asin, payload);
                
                if (success) { 
                    alert('Salvat cu succes!');
                    await renderView('produse', { commandId: state.currentCommandId, manifestSKU: state.currentManifestSKU });
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
