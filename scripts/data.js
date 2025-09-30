// scripts/data.js

// --- CONFIGURARE WEBHOOKS ---
const DATA_FETCH_URL = 'https://automatizare.comandat.ro/webhook/5a447557-8d52-463e-8a26-5902ccee8177';
const PRODUCT_DETAILS_URL = 'https://automatizare.comandat.ro/webhook/f1bb3c1c-3730-4672-b989-b3e73b911043';

// --- MANAGEMENT STARE APLICAȚIE ---
export const AppState = {
    getCommands: () => JSON.parse(sessionStorage.getItem('liveCommandsData') || '[]'),
    setCommands: (commands) => sessionStorage.setItem('liveCommandsData', JSON.stringify(commands)),
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
