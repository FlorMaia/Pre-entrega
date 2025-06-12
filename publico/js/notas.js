document.addEventListener('DOMContentLoaded', () => {
    // Verificar si el usuario está autenticado
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = 'login.html';
        return;
    }

    // Verificar que el usuario es un estudiante
    const tipoUsuario = user.tipoUsuario?.toLowerCase();
    if (tipoUsuario !== 'estudiante' && tipoUsuario !== 'alumnado') {
        alert('Acceso denegado. Solo los estudiantes pueden acceder a esta página.');
        window.location.href = 'login.html';
        return;
    }

    // Mostrar el nombre del usuario
    const nombreUsuario = document.getElementById('nombreUsuario');
    if (nombreUsuario) {
        nombreUsuario.textContent = user.nombre || 'Estudiante';
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

    // Función para determinar el estado de la nota
    function getEstadoNota(nota) {
        if (nota === null || nota === undefined || nota === 'N/A') return '';
        return parseFloat(nota) >= 6 ? 'aprobado' : 'desaprobado';
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
            const tbody = document.getElementById('notasTableBody');
            const noNotas = document.getElementById('noNotas');
            
            if (!notas || notas.length === 0) {
                tbody.innerHTML = '';
                noNotas.style.display = 'block';
                return;
            }

            noNotas.style.display = 'none';

            // Crear un mapa para almacenar las notas por materia
            const notasPorMateria = {};
            
            // Inicializar el mapa con todas las materias y períodos
            notas.forEach(nota => {
                if (!notasPorMateria[nota.materia]) {
                    notasPorMateria[nota.materia] = {
                        '1er Informe': 'N/A',
                        '2do Informe': 'N/A',
                        '1er Cuatrimestre': 'N/A',
                        '3er Informe': 'N/A',
                        '4to Informe': 'N/A',
                        '2do Cuatrimestre': 'N/A',
                        'Nota Final': 'N/A'
                    };
                }
                
                // Actualizar la nota para el período correspondiente
                if (nota.periodo && nota.nota !== null) {
                    notasPorMateria[nota.materia][nota.periodo] = nota.nota;
                }
            });

            // Crear las filas de la tabla
            tbody.innerHTML = Object.entries(notasPorMateria).map(([materia, notas]) => {
                const periodos = [
                    '1er Informe',
                    '2do Informe',
                    '1er Cuatrimestre',
                    '3er Informe',
                    '4to Informe',
                    '2do Cuatrimestre',
                    'Nota Final'
                ];

                const celdas = periodos.map(periodo => {
                    const nota = notas[periodo];
                    const estado = getEstadoNota(nota);
                    return `<td class="${estado}">${nota}</td>`;
                });

                return `
                    <tr>
                        <td>${materia}</td>
                        ${celdas.join('')}
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error:', error);
            const tbody = document.getElementById('notasTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #dc3545;">
                        Error al cargar las notas. Por favor, intente nuevamente.
                    </td>
                </tr>
            `;
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

