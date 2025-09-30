// scripts/data.js

// --- CONFIGURARE WEBHOOKS ---
const DATA_FETCH_URL = 'https://automatizare.comandat.ro/webhook/5a447557-8d52-463e-8a26-5902ccee8177';
const PRODUCT_DETAILS_URL = 'https://automatizare.comandat.ro/webhook/f1bb3c1c-3730-4672-b989-b3e73b911043';
const PRODUCT_UPDATE_URL = 'https://automatizare.comandat.ro/webhook/INLOCUIESTE_CU_URL_SALVARE'; 

// --- MANAGEMENT STARE APLICAȚIE ---
export const AppState = {
    getCommands: () => JSON.parse(sessionStorage.getItem('liveCommandsData') || '[]'),
    setCommands: (commands) => sessionStorage.setItem('liveCommandsData', JSON.stringify(commands)),
    getProductDetails: (asin) => JSON.parse(sessionStorage.getItem(`product_${asin}`) || null),
    setProductDetails: (asin, data) => sessionStorage.setItem(`product_${asin}`, JSON.stringify(data)),
};

function processServerData(data) {
    if (!data) return [];
    return Object.keys(data).map(commandId => ({
        id: commandId,
        name: `Comanda #${commandId.substring(0, 12)}`,
        products: (data[commandId] || []).map(p => ({
            id: p.productsku,
            asin: p.asin,
            expected: p.orderedquantity || 0,
            found: (p.bncondition || 0) + (p.vgcondition || 0) + (p.gcondition || 0) + (p.broken || 0),
        }))
    }));
}

export async function fetchDataAndSyncState() {
    const accessCode = sessionStorage.getItem('lastAccessCode');
    if (!accessCode) return false;
    try {
        const response = await fetch(DATA_FETCH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ code: accessCode }),
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Eroare de rețea: ${response.status}`);
        const responseData = await response.json();
        if (responseData.status !== 'success' || !responseData.data) throw new Error('Răspuns invalid de la server');
        AppState.setCommands(processServerData(responseData.data));
        return true;
    } catch (error) {
        console.error('Sincronizarea datelor a eșuat:', error);
        return false;
    }
}

export async function fetchProductDetailsInBulk(asins) {
    const results = {};
    const asinsToFetch = [];
    asins.forEach(asin => {
        const cachedData = AppState.getProductDetails(asin);
        if (cachedData) results[asin] = cachedData;
        else asinsToFetch.push(asin);
    });
    if (asinsToFetch.length === 0) return results;

    try {
        const response = await fetch(PRODUCT_DETAILS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asins: asinsToFetch }),
        });
        if (!response.ok) throw new Error(`Eroare la preluarea detaliilor`);
        const responseData = await response.json();
        const bulkData = responseData.products || responseData;
        asinsToFetch.forEach(asin => {
            const productData = bulkData[asin] || { title: 'N/A', images: [], description: '', features: [], brand: '', price: '', category: '' };
            AppState.setProductDetails(asin, productData);
            results[asin] = productData;
        });
    } catch (error) {
        console.error('Eroare la preluarea detaliilor:', error);
        asinsToFetch.forEach(asin => {
            results[asin] = { title: 'Eroare', images: [], description: '', features: [], brand: '', price: '', category: '' };
        });
    }
    return results;
}

// Funcție de salvare actualizată pentru a trimite toate datele
export async function saveProductDetails(commandId, productId, updatedData) {
    if (PRODUCT_UPDATE_URL.includes('INLOCUIESTE_CU_URL_SALVARE')) {
        alert("Te rog configurează URL-ul pentru webhook-ul de salvare în scripts/data.js");
        return false;
    }
    const payload = { commandId, productId, ...updatedData };
    try {
        const response = await fetch(PRODUCT_UPDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            console.error(`Salvarea a eșuat:`, await response.text());
            return false;
        }
        // Actualizează datele locale după o salvare reușită
        const details = AppState.getProductDetails(updatedData.asin);
        if (details) {
            Object.assign(details, updatedData); // Suprascrie detaliile locale cu cele noi
            AppState.setProductDetails(updatedData.asin, details);
        }
        return true;
    } catch (error) {
        console.error('Eroare de rețea la salvare:', error);
        return false;
    }
}
