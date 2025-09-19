document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTE ȘI SELECTORI GENERALI ---
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook-test/d92efbca-eaf1-430e-8748-cc6466c82c6e'; // URL pt upload
    const N8N_DATA_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook-test/d92efbca-eaf1-430e-8748-cc6466c82c6e'; // URL pt a lua datele

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- LOGICA PENTRU NAVIGAREA PRIN TAB-URI ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                // S-ar putea ca Safari să aibă nevoie de display: none; explicit
                content.style.display = 'none'; 
            });

            button.classList.add('active');
            const activeTab = document.getElementById(targetTabId);
            activeTab.classList.add('active');
            activeTab.style.display = 'block';

            // Când tab-ul "Acasă" este activat, încărcăm datele
            if (targetTabId === 'acasa') {
                loadAndDisplayHomeData();
            }
        });
    });

    // --- LOGICA PENTRU TAB-UL "ACASĂ" ( COMENZI ) ---
    async function loadAndDisplayHomeData() {
        const pregatireList = document.getElementById('pregatire-list');
        if (!pregatireList) return; // Nu executa dacă nu suntem pe pagină

        pregatireList.innerHTML = '<p class="loading-message">Se încarcă datele...</p>';
        document.getElementById('finalizate-list').innerHTML = '';

        try {
            const response = await fetch(N8N_DATA_WEBHOOK_URL);
            if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
            const result = await response.json();
            const data = result[0].data;
            renderOrders(data);
        } catch (error) {
            console.error('Eroare la încărcarea datelor:', error);
            pregatireList.innerHTML = '<p class="error-message">❌ Nu s-au putut încărca datele.</p>';
        }
    }

    function renderOrders(data) {
        const pregatireList = document.getElementById('pregatire-list');
        const finalizateList = document.getElementById('finalizate-list');
        pregatireList.innerHTML = '';
        finalizateList.innerHTML = '';

        for (const tableName in data) {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.textContent = tableName.replace(/_/g, ' ');
            orderItem.dataset.tableName = tableName;

            if (tableName.toLowerCase().includes('finalizat')) {
                finalizateList.appendChild(orderItem);
            } else {
                pregatireList.appendChild(orderItem);
            }
        }

        if (pregatireList.innerHTML === '') pregatireList.innerHTML = '<p>Nicio comandă în pregătire.</p>';
        if (finalizateList.innerHTML === '') finalizateList.innerHTML = '<p>Nicio comandă finalizată.</p>';
    }

    const acasaContainer = document.getElementById('acasa');
    if (acasaContainer) {
        acasaContainer.addEventListener('click', (event) => {
            const header = event.target.closest('.collapsible-header');
            const orderItem = event.target.closest('.order-item');

            if (header) {
                const content = header.nextElementSibling;
                const arrow = header.querySelector('.arrow');
                header.classList.toggle('active');
                content.classList.toggle('hidden');
                arrow.textContent = content.classList.contains('hidden') ? '▶' : '▼';
            }
            
            if (orderItem) {
                const tableName = orderItem.dataset.tableName;
                console.log("Ai dat click pe comanda:", tableName);
                alert(`Ai selectat comanda: ${tableName}`);
            }
        });
    }

    // --- LOGICA PENTRU FORMULARUL DE UPLOAD ---
    const uploadForm = document.getElementById('upload-form');
    if(uploadForm) {
        const zipInput = document.getElementById('zip-file');
        const pdfInput = document.getElementById('pdf-file');
        const status = document.getElementById('status');

        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            status.textContent = 'Se pregătesc fișierele...';

            const zipFile = zipInput.files[0];
            const pdfFile = pdfInput.files[0];

            if (!zipFile || !pdfFile) {
                status.textContent = '❌ Te rog selectează ambele fișiere.';
                return;
            }

            const formData = new FormData();
            formData.append('zipFile', zipFile);
            formData.append('pdfFile', pdfFile);

            try {
                status.textContent = 'Se trimit fișierele...';
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, {
                    method: 'POST',
                    body: formData,
                });

if (response.ok) {
    const result = await response.json();
    if (result.status === 'success') {
        status.textContent = 'Comanda Incarcata';
    } else {
        status.textContent = '✅ Fișierele au fost trimise cu succes!';
    }
    uploadForm.reset();
} else {
                    const errorText = await response.text();
                    status.textContent = `❌ Eroare la trimitere: ${response.statusText}`;
                    console.error('Răspuns eroare de la server:', errorText);
                }
            } catch (error) {
                status.textContent = '❌ Eroare de rețea.';
                console.error('Eroare la fetch:', error);
            }
        });
    }

    // Inițiem încărcarea datelor pentru prima vizită pe pagină
    loadAndDisplayHomeData();
});

