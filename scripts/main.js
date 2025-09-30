// scripts/main.js
import { AppState, fetchDataAndSyncState } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- VERIFICARE AUTENTIFICARE ---
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return; 
    }

    // --- CONSTANTE ȘI SELECTORI GENERALI ---
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    // --- LOGICĂ PENTRU NAVIGARE TAB-URI (din codul tău original) ---
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            sidebarButtons.forEach(btn => btn.classList.remove('active-tab'));
            tabContents.forEach(content => content.classList.add('hidden'));
            button.classList.add('active-tab');
            const tabId = button.dataset.tab;
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.remove('hidden');
            }
        });
    });
    
    // --- LOGICĂ PENTRU SECȚIUNI COLLAPSIBLE (din codul tău original) ---
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const arrow = header.querySelector('.arrow');
            content.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
        });
    });

    // --- FUNCȚIA NOUĂ: ÎNCARCĂ ȘI AFIȘEAZĂ COMENZILE ---
    async function loadAndDisplayCommands() {
        const container = document.getElementById('pregatire-list');
        if (!container) return;
        
        container.innerHTML = `<p class="loading-message text-gray-500">Se actualizează datele...</p>`;
        
        const success = await fetchDataAndSyncState();
        if (!success) {
            container.innerHTML = `<p class="text-red-500">A apărut o eroare la încărcarea comenzilor.</p>`;
            return;
        }

        const commands = AppState.getCommands();
        if (commands.length === 0) {
            container.innerHTML = `<p class="text-gray-500">Nu există comenzi în pregătire.</p>`;
            return;
        }

        // Generează HTML pentru fiecare comandă
        container.innerHTML = commands.map(command => {
            const totalExpected = command.products.reduce((sum, p) => sum + p.expected, 0);
            const totalFound = command.products.reduce((sum, p) => sum + p.found, 0);
            const progress = totalExpected > 0 ? (totalFound / totalExpected) * 100 : 0;

            return `
            <div class="border rounded-md p-3 mb-2 bg-gray-50">
                <p class="font-bold">${command.name}</p>
                <div class="flex justify-between items-center mt-1 text-sm">
                    <span>${command.products.length} produse</span>
                    <span class="font-semibold">${totalFound} / ${totalExpected}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${progress}%"></div>
                </div>
            </div>`;
        }).join('');
    }

    // --- LOGICĂ PENTRU FORMULARUL DE UPLOAD (din codul tău original) ---
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const zipFileInput = document.getElementById('zip-file');
            const pdfFileInput = document.getElementById('pdf-file');
            const uploadButton = document.getElementById('upload-button');
            const uploadStatus = document.getElementById('upload-status');
            const buttonText = uploadButton.querySelector('.button-text');
            const buttonLoader = uploadButton.querySelector('.button-loader');

            const zipFile = zipFileInput.files[0];
            const pdfFile = pdfFileInput.files[0];

            if (!zipFile || !pdfFile) {
                uploadStatus.textContent = 'Te rog selectează ambele fișiere.';
                uploadStatus.classList.add('text-red-600');
                return;
            }

            uploadButton.disabled = true;
            buttonText.classList.add('hidden');
            buttonLoader.classList.remove('hidden');
            uploadStatus.textContent = 'Se trimit fișierele...';
            uploadStatus.classList.remove('text-green-600', 'text-red-600');

            const formData = new FormData();
            formData.append('zipFile', zipFile);
            formData.append('pdfFile', pdfFile);

            try {
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Eroare HTTP: ${response.status}`);
                const responseData = await response.json();
                if (responseData.status === 'success') {
                    uploadStatus.textContent = 'Comanda a fost importată cu succes!';
                    uploadStatus.classList.add('text-green-600');
                    uploadForm.reset();
                    await loadAndDisplayCommands(); // Reîncarcă lista de comenzi după upload
                } else {
                    throw new Error('Răspunsul de la server nu a indicat succes.');
                }
            } catch (error) {
                console.error('Eroare la upload:', error);
                uploadStatus.textContent = 'A apărut o eroare la trimitere. Încearcă din nou.';
                uploadStatus.classList.add('text-red-600');
            } finally {
                uploadButton.disabled = false;
                buttonText.classList.remove('hidden');
                buttonLoader.classList.add('hidden');
            }
        });
    }

    // --- INIȚIALIZARE PAGINĂ ---
    loadAndDisplayCommands(); // Apelează funcția la încărcarea paginii
});
