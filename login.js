const performLogin = async (accessCode) => {
    errorMessage.textContent = '';
    loginButton.disabled = true;
    buttonText.classList.add('hidden');
    buttonLoader.classList.remove('hidden');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            // --- LINIA CORECTATĂ ---
            headers: { 'Content-Type': 'text/plain' }, 
            body: JSON.stringify({ code: accessCode }),
        });

        if (!response.ok) {
            throw new Error(`Eroare de rețea: ${response.status}`);
        }

        const responseData = await response.json();
        console.log("Răspuns primit de la webhook:", responseData);
        
        if (responseData && responseData.status === 'success') {
            sessionStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'index.html'; 
        } else if (responseData && responseData.status === 'failed') {
            errorMessage.textContent = 'Cod de acces incorect.';
        } else {
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
