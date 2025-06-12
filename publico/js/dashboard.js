document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const addUserBtn = document.getElementById('addUserBtn');
    const usersTable = document.getElementById('usersTable');
    const notasTable = document.getElementById('notasTable');

    // Verificar autenticación
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.tipo_usuario !== 'administrador') {
        alert('Acceso denegado. Solo los administradores pueden acceder a esta página.');
        window.location.href = 'login.html';
        return;
    }

    // Mostrar nombre del administrador
    document.getElementById('adminName').textContent = `Bienvenido, ${user.nombre}`;

    // Cargar datos iniciales
    loadUsers();
    loadAllNotes();

    // Configurar botón de cerrar sesión
    logoutBtn.addEventListener('click', logout);

    // Configurar botón de agregar usuario
    addUserBtn.addEventListener('click', addUser);

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    async function addUser() {
        try {
            const nombre = prompt('Nombre completo:');
            if (!nombre) return;

            const email = prompt('Email:');
            if (!email) return;

            const dni = prompt('DNI:');
            if (!dni) return;

            const password = prompt('Contraseña:');
            if (!password) return;

            const rol = prompt('Tipo de usuario (estudiante/alumnado/administrador):');
            if (!rol) return;

            let curso = null;
            if (rol === 'estudiante') {
                curso = prompt('Curso:');
                if (!curso) return;
            }

            const response = await fetch(`${getBaseUrl()}/api/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre_completo: nombre,
                    email,
                    dni,
                    password,
                    tipo_usuario: rol,
                    curso
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar usuario');
            }

            const data = await response.json();
            alert(data.message || 'Usuario registrado exitosamente');
            loadUsers();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al registrar usuario');
        }
    }

    async function loadUsers() {
        try {
            const response = await fetch(`${getBaseUrl()}/api/usuarios`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener los usuarios');
            }

            const usuarios = await response.json();
            const tbody = document.querySelector('#usersTable tbody');
            tbody.innerHTML = '';

            if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="6" class="text-center">No hay usuarios registrados</td>';
                tbody.appendChild(tr);
                return;
            }

            usuarios.forEach(usuario => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${usuario.nombre}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.dni}</td>
                    <td>${usuario.curso || '-'}</td>
                    <td>${usuario.tipo_usuario_nombre}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editUser(${usuario.id})">Editar</button>
                        <button class="btn btn-danger" onclick="deleteUser(${usuario.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            alert('Error al cargar los usuarios. Por favor, intente nuevamente.');
        }
    }

    async function loadAllNotes() {
        try {
            const response = await fetch(`${getBaseUrl()}/api/todas-notas`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener las notas');
            }

            const notas = await response.json();
            const tbody = document.querySelector('#notasTable tbody');
            tbody.innerHTML = '';

            if (!notas || !Array.isArray(notas) || notas.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="7" class="text-center">No hay notas registradas</td>';
                tbody.appendChild(tr);
                return;
            }

            notas.forEach(nota => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${nota.alumno_nombre}</td>
                    <td>${nota.materia_nombre}</td>
                    <td>${nota.nota}</td>
                    <td>${nota.periodo}</td>
                    <td>${nota.profesor_nombre}</td>
                    <td>${nota.curso_nombre}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editNote(${nota.id})">Editar</button>
                        <button class="btn btn-danger" onclick="deleteNote(${nota.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error al cargar notas:', error);
            alert('Error al cargar las notas. Por favor, intente nuevamente.');
        }
    }

    window.editUser = async (id) => {
        try {
            const response = await fetch(`${getBaseUrl()}/api/usuarios/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al obtener información del usuario');
            }
            
            const user = await response.json();
            
            if (!user || typeof user !== 'object') {
                throw new Error('Datos de usuario inválidos');
            }

            const nombre = prompt("Nombre completo:", user.nombre_completo);
            if (!nombre) return;

            const email = prompt("Email:", user.email);
            if (!email) return;

            const dni = prompt("DNI:", user.dni);
            if (!dni) return;

            let curso = null;
            if (user.tipo_usuario === 'estudiante') {
                curso = prompt("Curso:", user.curso);
                if (!curso) return;
            }

            const rol = prompt('Tipo de usuario (estudiante/alumnado/administrador):', user.tipo_usuario);
            if (!rol) return;

            const response2 = await fetch(`${getBaseUrl()}/api/usuarios/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre_completo: nombre,
                    email,
                    dni,
                    curso,
                    tipo_usuario: rol
                })
            });

            if (!response2.ok) {
                const errorData = await response2.json();
                throw new Error(errorData.error || 'Error al actualizar usuario');
            }

            const data = await response2.json();
            alert(data.message || 'Usuario actualizado exitosamente');
            loadUsers();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al editar usuario');
        }
    };

    window.deleteUser = async (id) => {
        if (!confirm("¿Está seguro de que desea eliminar este usuario?")) {
            return;
        }

        try {
            const response = await fetch(`${getBaseUrl()}/api/usuarios/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar usuario');
            }

            alert("Usuario eliminado exitosamente");
            loadUsers();
        } catch (error) {
            console.error("Error:", error);
            alert(error.message);
        }
    };

    window.editNote = async (id) => {
        try {
            const nota = prompt('Nueva nota:');
            if (nota === null) return;

            const periodo = prompt('Período (1er Informe, 2do Informe, etc.):');
            if (!periodo) return;

            const response = await fetch(`${getBaseUrl()}/api/notas/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    nota: parseFloat(nota),
                    periodo 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar nota');
            }

            alert("Nota actualizada exitosamente");
            loadAllNotes();
        } catch (error) {
            console.error("Error:", error);
            alert(error.message);
        }
    };

    window.deleteNote = async (id) => {
        if (!confirm("¿Está seguro de que desea eliminar esta nota?")) {
            return;
        }

        try {
            const response = await fetch(`${getBaseUrl()}/api/notas/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar nota');
            }

            alert("Nota eliminada exitosamente");
            loadAllNotes();
        } catch (error) {
            console.error("Error:", error);
            alert(error.message);
        }
    };
});

// Función para obtener la URL base
function getBaseUrl() {
    const port = window.location.port || '3001';
    return `http://localhost:${port}`;
}

