document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registro-form');
    const errorMessage = document.getElementById('error-message');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const errorModal = document.getElementById('errorModal');

    // Verificar que los elementos necesarios existen
    if (!form || !errorMessage || !modalErrorMessage || !errorModal) {
        console.error('Elementos del DOM no encontrados');
        return;
    }

    const bootstrapModal = new bootstrap.Modal(errorModal);

    // Función para mostrar errores
    function showError(message, useModal = false) {
        if (useModal) {
            modalErrorMessage.textContent = message;
            bootstrapModal.show();
        } else {
            errorMessage.textContent = message;
            errorMessage.classList.remove('d-none');
        }
    }

    // Función para validar el formulario
    function validateForm() {
        const nombre_completo = document.getElementById('nombre_completo').value.trim();
        const email = document.getElementById('email').value.trim();
        const dni = document.getElementById('dni').value.trim();
        const password = document.getElementById('password').value.trim();
        const tipo_usuario = document.getElementById('tipo_usuario').value;
        const curso = document.getElementById('curso').value.trim();

        let isValid = true;

        // Validar nombre completo
        if (!nombre_completo) {
            showError('El nombre completo es requerido');
            isValid = false;
        }

        // Validar email
        if (!email) {
            showError('El email es requerido');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Por favor, ingrese un email válido');
            isValid = false;
        }

        // Validar DNI
        if (!dni) {
            showError('El DNI es requerido');
            isValid = false;
        } else if (!/^\d{8}$/.test(dni)) {
            showError('El DNI debe tener 8 dígitos');
            isValid = false;
        }

        // Validar contraseña
        if (!password) {
            showError('La contraseña es requerida');
            isValid = false;
        } else if (password.length < 8) {
            showError('La contraseña debe tener al menos 8 caracteres');
            isValid = false;
        }

        // Validar tipo de usuario
        if (!tipo_usuario) {
            showError('El tipo de usuario es requerido');
            isValid = false;
        }

        // Validar curso si es necesario
        if ((tipo_usuario === '1' || tipo_usuario === '2') && !curso) {
            showError('El curso es requerido para estudiantes y alumnado');
            isValid = false;
        }

        return isValid;
    }

    // Función para manejar el registro
    async function handleRegistro(event) {
        event.preventDefault();
        
        // Limpiar mensajes de error anteriores
        errorMessage.classList.add('d-none');
        
        if (!validateForm()) {
            return;
        }

        const formData = {
            nombre_completo: document.getElementById('nombre_completo').value.trim(),
            email: document.getElementById('email').value.trim(),
            dni: document.getElementById('dni').value.trim(),
            password: document.getElementById('password').value.trim(),
            tipo_usuario: document.getElementById('tipo_usuario').value,
            curso: document.getElementById('curso').value.trim()
        };

        try {
            console.log('Enviando datos:', formData);
            
            const response = await fetch(`${getBaseUrl()}/api/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Mostrar mensaje de éxito
                showError('Usuario registrado exitosamente. Redirigiendo al login...', true);
                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showError(data.error || 'Error en el registro', true);
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Error al conectar con el servidor', true);
        }
    }

    // Agregar event listener al formulario
    form.addEventListener('submit', handleRegistro);

    // Mostrar/ocultar campo de curso según tipo de usuario
    const tipoUsuarioSelect = document.getElementById('tipo_usuario');
    const cursoGroup = document.getElementById('curso-group');

    if (tipoUsuarioSelect && cursoGroup) {
        tipoUsuarioSelect.addEventListener('change', () => {
            const tipoUsuario = tipoUsuarioSelect.value;
            cursoGroup.style.display = (tipoUsuario === '1' || tipoUsuario === '2') ? 'block' : 'none';
        });
    }

    // Limpiar mensaje de error cuando el usuario comienza a escribir
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            errorMessage.classList.add('d-none');
        });
    });
});

// Función para obtener la URL base
function getBaseUrl() {
    const port = window.location.port || '3000';
    return `http://localhost:${port}`;
} 

