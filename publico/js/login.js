document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Función para mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Función para limpiar errores
    function clearError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }

    // Manejar el envío del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validaciones básicas
        if (!email) {
            showError('Por favor, ingrese su email');
            return;
        }

        if (!password) {
            showError('Por favor, ingrese su contraseña');
            return;
        }

        try {
            const response = await fetch(`${getBaseUrl()}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            // Guardar el token y la información del usuario
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            console.log('Login exitoso:', data.user);

            // Redirigir según el tipo de usuario
            if (data.user.tipoUsuario === 'administrador') {
                window.location.href = 'dashboard.html';
            } else if (data.user.tipoUsuario === 'estudiante' || data.user.tipoUsuario === 'alumnado') {
                window.location.href = 'notas.html';
            } else {
                showError('Tipo de usuario no reconocido');
            }

        } catch (error) {
            console.error('Error en login:', error);
            showError(error.message);
        }
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
});

// Función para obtener la URL base
function getBaseUrl() {
    const port = window.location.port || '3001';
    return `http://localhost:${port}`;
}

