// --- LOGICA PENTRU TAB-URI ---
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTabId = button.dataset.tab;
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(targetTabId).classList.add('active');
    });
});


// --- CODUL PENTRU FORMULAR ---

// URL-UL A FOST ACTUALIZAT AICI
const WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook-test/d92efbca-eaf1-430e-8748-cc6466c82c6e'; 

const uploadForm = document.getElementById('upload-form');
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
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            status.textContent = '✅ Fișierele au fost trimise cu succes!';
            uploadForm.reset();
        } else {
            const errorText = await response.text();
            status.textContent = `❌ Eroare la trimitere: ${response.statusText}`;
            console.error('Răspuns eroare de la server:', errorText);
        }
    } catch (error) {
        status.textContent = '❌ Eroare de rețea. Verifică conexiunea sau URL-ul webhook-ului.';
        console.error('Eroare la fetch:', error);
    }
});
