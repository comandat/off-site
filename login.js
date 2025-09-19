document.addEventListener('DOMContentLoaded', () => {
    console.log("Login script a pornit.");

    // Verifică dacă utilizatorul este deja logat
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        // Redirecționează către pagina principală a aplicației off-site
        window.location.href = 'index.html'; 
        return;
    }

    const loginForm = document.getElementById('login-form');
    const accessCodeInput = document.getElementById('access-code');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    if (!loginForm) {
        console.error("Eroare critică: Formularul cu ID-ul 'login-form' nu a fost găsit.");
        return;
    }
    
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    
    // URL-ul specificat pentru webhook
    const webhookUrl = 'https://automatizare.comandat.ro/webhook/637e1f6e-7beb-4295-89bd-4d7022f12d45';

    const performLogin = async (accessCode) => {
        errorMessage.textContent = '';
        loginButton.disabled = true;
        buttonText.classList.add('hidden');
        buttonLoader.classList.remove('hidden');

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Trimitem ca JSON
                body: JSON.stringify({ code: accessCode }),
            });

            if (!response.ok) {
                throw new Error(`Eroare de rețea: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("Răspuns primit de la webhook:", responseData);
            
            if (responseData && responseData.status === 'success') {
                // Autentificare reușită
                sessionStorage.setItem('isLoggedIn', 'true');
                // Redirecționează către pagina principală a aplicației off-site
                window.location.href = 'index.html'; 
            } else if (responseData && responseData.status === 'failed') {
                // Cod de acces incorect
                errorMessage.textContent = 'Cod de acces incorect.';
            } else {
                // Răspuns neașteptat de la server
                errorMessage.textContent = 'Răspuns invalid de la server.';
            }
        } catch (error) {
            console.error('Eroare la autentificare:', error);
            errorMessage.textContent = 'Eroare la conectare. Verifică consola.';
        } finally {
            loginButton.disabled = false;
            buttonText.classList.remove('hidden');
            buttonLoader.classList.add('hidden');
        }
    };

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        console.log("Formular trimis și interceptat de JS.");
        const accessCode = accessCodeInput.value.trim();
        if (accessCode) {
            performLogin(accessCode);
        } else {
            errorMessage.textContent = 'Vă rugăm introduceți un cod.';
        }
    });

    // Logica pentru scanner (dacă dorești să o implementezi complet)
    const scanButton = document.getElementById('scan-button');
    const scannerContainer = document.getElementById('scanner-container');
    const closeScannerButton = document.getElementById('close-scanner-button');
    const readerDiv = document.getElementById('reader');

    let html5QrCode;

    scanButton.addEventListener('click', () => {
        scannerContainer.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("reader");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log(`Cod scanat: ${decodedText}`);
            accessCodeInput.value = decodedText;
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add('hidden');
                performLogin(decodedText);
            });
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
    });

    closeScannerButton.addEventListener('click', () => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add('hidden');
            });
        }
    });
});
