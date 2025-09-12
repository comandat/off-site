// --- NOU: LOGICA PENTRU TAB-URI ---
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Obține id-ul conținutului țintă din atributul data-tab
        const targetTabId = button.dataset.tab;
        
        // 1. Dezactivează toate butoanele și ascunde tot conținutul
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // 2. Activează butonul pe care am dat click
        button.classList.add('active');

        // 3. Afișează conținutul corespunzător
        document.getElementById(targetTabId).classList.add('active');
    });
});


// --- CODUL EXISTENT PENTRU FORMULAR (nu necesită nicio modificare) ---
const WEBHOOK_URL = 'https://your-webhook-url.com/endpoint'; 

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
            status.textContent = `❌ Eroare la trimitere: ${response.statusText}`;
        }
    } catch (error) {
        status.textContent = '❌ Eroare de rețea. Verifică conexiunea sau URL-ul webhook-ului.';
        console.error('Eroare la fetch:', error);
    }
});