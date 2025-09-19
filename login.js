document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ 1. Pagina s-a încărcat (DOMContentLoaded). Scriptul login.js rulează.');

    // Verifică dacă utilizatorul este deja logat
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        console.log('🚪 Utilizator deja logat. Se redirecționează către main.html...');
        window.location.href = 'main.html';
        return; // Oprește execuția ulterioară
    }

    // Selecția elementelor din DOM
    const loginForm = document.getElementById('login-form');
    const accessCodeInput = document.getElementById('access-code');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');
    
    // Verifică dacă elementele esențiale există
    if (!loginForm || !accessCodeInput || !loginButton) {
        console.error('❌ EROARE CRITICĂ: Unul sau mai multe elemente esențiale (form, input, button) nu au fost găsite în pagină!');
        return;
    }
    console.log('✅ 2. Toate elementele HTML (form, input, button) au fost găsite.');

    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    
    const webhookUrl = 'https://automatizare.comandat.ro/webhook/637e1f6e-7beb-4295-89bd-4d7022f12d45';

    const performLogin = async (accessCode) => {
        console.log('▶️ 4. A început execuția funcției performLogin.');
        
        errorMessage.textContent = '';
        loginButton.disabled = true;
        buttonText.classList.add('hidden');
        buttonLoader.classList.remove('hidden');
        console.log('⏳ Stare UI: Buton dezactivat, loader afișat.');

        try {
            console.log(`🚀 5. Se pregătește trimiterea cererii (fetch) către webhook...`);
            console.log(`   -> URL: ${webhookUrl}`);
            console.log(`   -> Metoda: POST`);
            console.log(`   -> Headers: { 'Content-Type': 'text/plain' }`);
            console.log(`   -> Body: ${JSON.stringify({ code: accessCode })}`);
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ code: accessCode }),
            });

            console.log('📨 6. Răspuns primit de la server. Status:', response.status, response.statusText);

            if (!response.ok) {
                console.error('❌ Răspunsul de la server NU a fost OK (status nu este 2xx).');
                throw new Error(`Eroare HTTP: ${response.status}`);
            }

            console.log('🔄 7. Se procesează răspunsul JSON...');
            const responseData = await response.json();
            console.log('✅ Răspuns JSON procesat:', responseData);
            
            if (responseData && responseData.status === 'success') {
                console.log('🔑 Autentificare reușită! Se salvează starea și se redirecționează...');
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'main.html';
            } else {
                console.warn('⚠️ Autentificare eșuată. Răspunsul nu conține status: "success".');
                errorMessage.textContent = 'Cod de acces incorect.';
            }

        } catch (error) {
            console.error('💥 8. A APĂRUT O EROARE în blocul try-catch!', error);
            errorMessage.textContent = 'Eroare la conectare. Verifică consola.';
        } finally {
            console.log('🏁 9. Se execută blocul `finally`. Se resetează starea butonului.');
            loginButton.disabled = false;
            buttonText.classList.remove('hidden');
            buttonLoader.classList.add('hidden');
        }
    };

    // Adaugă event listener la formular
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Previne reîncărcarea paginii
        console.log('▶️ 3. Formularul a fost trimis. Se apelează performLogin.');
        
        const accessCode = accessCodeInput.value.trim();
        if (accessCode) {
            performLogin(accessCode);
        } else {
            console.warn('⚠️ Câmpul pentru cod este gol.');
            errorMessage.textContent = 'Vă rugăm introduceți un cod.';
        }
    });
});
