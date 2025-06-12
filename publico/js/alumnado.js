document.addEventListener('DOMContentLoaded', () => {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar el nombre del usuario
    const nombreAlumnado = document.getElementById('nombreAlumnado');
    if (nombreAlumnado) {
        nombreAlumnado.textContent = user.nombre || 'Estudiante';
    }

    // Manejar el cierre de sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Función para cargar las notas
    async function cargarNotas() {
        try {
            const response = await fetch(`${getBaseUrl()}/api/notas/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar las notas');
            }

            const notas = await response.json();
            const tbody = document.querySelector('#notasTable tbody');
            
            if (tbody) {
                tbody.innerHTML = notas.map(nota => `
                    <tr>
                        <td>${nota.materia}</td>
                        <td>${nota.nota}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar las notas. Por favor, intente nuevamente.');
        }
    }

    // Cargar las notas al iniciar
    cargarNotas();
});

// Función para obtener la URL base
function getBaseUrl() {
    const port = window.location.port || '3000';
    return `http://localhost:${port}`;
}

