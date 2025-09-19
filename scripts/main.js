document.addEventListener('DOMContentLoaded', () => {

    // --- VERIFICARE AUTENTIFICARE ---
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html'; // Trimite la login dacă nu e autentificat
        return; 
    }

    // --- CONSTANTE ȘI SELECTORI GENERALI ---
    const N8N_UPLOAD_WEBHOOK_URL = 'https://automatizare.comandat.ro/webhook/d92efbca-eaf1-430e-8748-cc6466c82c6e';

    // --- LOGICĂ PENTRU NAVIGARE TAB-URI ---
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Dezactivează toate butoanele și ascunde conținutul
            sidebarButtons.forEach(btn => btn.classList.remove('active-tab'));
            tabContents.forEach(content => content.classList.add('hidden'));

            // Activează butonul curent
            button.classList.add('active-tab');

            // Afișează conținutul corespunzător
            const tabId = button.dataset.tab;
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.remove('hidden');
            }
        });
    });
    
    // --- LOGICĂ PENTRU SECȚIUNI COLLAPSIBLE ---
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const arrow = header.querySelector('.arrow');
            
            content.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
        });
    });


    // --- LOGICĂ PENTRU FORMULARUL DE UPLOAD ---
    const uploadForm = document.getElementById('upload-form');
    const zipFileInput = document.getElementById('zip-file');
    const pdfFileInput = document.getElementById('pdf-file');
    const uploadButton = document.getElementById('upload-button');
    const uploadStatus = document.getElementById('upload-status');
    const buttonText = uploadButton.querySelector('.button-text');
    const buttonLoader = uploadButton.querySelector('.button-loader');

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const zipFile = zipFileInput.files[0];
            const pdfFile = pdfFileInput.files[0];

            if (!zipFile || !pdfFile) {
                uploadStatus.textContent = 'Te rog selectează ambele fișiere.';
                uploadStatus.classList.remove('text-green-600');
                uploadStatus.classList.add('text-red-600');
                return;
            }

            // Schimbă starea butonului la "loading"
            uploadButton.disabled = true;
            buttonText.classList.add('hidden');
            buttonLoader.classList.remove('hidden');
            uploadStatus.textContent = 'Se trimit fișierele...';
            uploadStatus.classList.remove('text-green-600', 'text-red-600');

            const formData = new FormData();
            formData.append('zipFile', zipFile); // Asigură-te că numele corespund cu ce așteaptă webhook-ul
            formData.append('pdfFile', pdfFile);

            try {
                const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Eroare HTTP: ${response.status}`);
                }

                const responseData = await response.json();

                if (responseData.status === 'success') {
                    uploadStatus.textContent = 'Comanda a fost importată cu succes!';
                    uploadStatus.classList.add('text-green-600');
                    uploadForm.reset(); // Resetează câmpurile formularului
                } else {
                    throw new Error('Răspunsul de la server nu a indicat succes.');
                }

            } catch (error) {
                console.error('Eroare la upload:', error);
                uploadStatus.textContent = 'A apărut o eroare la trimitere. Încearcă din nou.';
                uploadStatus.classList.add('text-red-600');
            } finally {
                // Resetează starea butonului indiferent de rezultat
                uploadButton.disabled = false;
                buttonText.classList.remove('hidden');
                buttonLoader.classList.add('hidden');
            }
        });
    }
});
