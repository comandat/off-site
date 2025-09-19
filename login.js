document.addEventListener('DOMContentLoaded', () => {
    // Dacă e deja logat, redirecționează direct la pagina principală
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'main.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const accessCodeInput = document.getElementById('access-code');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    
    const webhookUrl = 'https://automatizare.comandat.ro/webhook/637e1f6e-7beb-4295-89bd-4d7022f12d45';

    const performLogin = async (accessCode) => {
        errorMessage.textContent = '';
        loginButton.disabled = true;
        buttonText.classList.add('hidden');
        buttonLoader.classList.remove('hidden');

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                // Folosim 'text/plain' așa cum ai specificat
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({ code: accessCode }),
            });

            if (!response.ok) {
                throw new Error(`Eroare de rețea: ${response.status}`);
            }

            const responseData = await response.json();
            
            if (responseData && responseData.status === 'success') {
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'main.html'; // Redirecționare la succes
            } else {
                errorMessage.textContent = 'Cod de acces incorect.';
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
        const accessCode = accessCodeInput.value.trim();
        if (accessCode) {
            performLogin(accessCode);
        } else {
            errorMessage.textContent = 'Vă rugăm introduceți un cod.';
        }
    });

    // Logica pentru scanner... (rămâne neschimbată)
});
