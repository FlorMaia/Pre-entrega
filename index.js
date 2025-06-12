const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Clave secreta para JWT
const JWT_SECRET = 'tu_clave_secreta';

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('publico'));

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'boletin'
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos MySQL');
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Error al verificar token:', err);
            return res.status(401).json({ error: 'Token inválido' });
        }
        req.user = decoded;
        next();
    });
};

// Ruta de login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Intento de login:', { email });

    try {
        // Validar que se proporcionaron las credenciales
        if (!email || !password) {
            console.log('Credenciales faltantes:', { email: !!email, password: !!password });
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar el usuario en la base de datos
        const [usuarios] = await db.promise().query(
            `SELECT u.*, t.rol as tipo_usuario_nombre 
             FROM usuarios u 
             LEFT JOIN tipo_de_usuario t ON u.tipo_usuario_id = t.tipo_usuario_id 
             WHERE u.email = ?`,
            [email]
        );

        console.log('Usuario encontrado:', usuarios.length > 0);

        if (usuarios.length === 0) {
            console.log('Usuario no encontrado');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = usuarios[0];

        // Verificar la contraseña
        const validPassword = await bcrypt.compare(password, user.contrasena);
        console.log('Contraseña válida:', validPassword);

        if (!validPassword) {
            console.log('Contraseña inválida');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            {
                id: user.Usuario_id,
                email: user.email,
                tipoUsuario: user.tipo_usuario_nombre
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Enviar respuesta exitosa
        res.json({
            token,
            user: {
                id: user.Usuario_id,
                nombre: user.nombre_completo,
                email: user.email,
                tipoUsuario: user.tipo_usuario_nombre
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Ruta de registro
app.post('/api/registro', async (req, res) => {
    const { nombre_completo, email, dni, password, tipo_usuario, curso } = req.body;

    try {
        console.log('Datos recibidos:', { nombre_completo, email, dni, tipo_usuario, curso });

        // Verificar campos requeridos
        if (!nombre_completo || !email || !dni || !password || !tipo_usuario) {
            console.log('Campos faltantes:', {
                nombre_completo: !nombre_completo,
                email: !email,
                dni: !dni,
                password: !password,
                tipo_usuario: !tipo_usuario
            });
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Verificar formato de DNI
        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).json({ error: 'El DNI debe tener 8 dígitos' });
        }

        // Verificar formato de email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Formato de email inválido' });
        }

        // Verificar longitud de contraseña
        if (password.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // Verificar si el tipo de usuario es válido
        const [tiposUsuario] = await db.promise().query(
            'SELECT tipo_usuario_id FROM tipo_de_usuario WHERE tipo_usuario_id = ?', 
            [tipo_usuario]
        );
        
        if (tiposUsuario.length === 0) {
            return res.status(400).json({ error: 'Tipo de usuario inválido' });
        }

        // Verificar si el email o DNI ya existe
        const [existingUsers] = await db.promise().query(
            'SELECT * FROM usuarios WHERE email = ? OR dni = ?',
            [email, dni]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
            if (existingUser.dni === dni) {
                return res.status(400).json({ error: 'El DNI ya está registrado' });
            }
        }

        // Verificar si se requiere curso
        if ((tipo_usuario === '1' || tipo_usuario === '2') && !curso) {
            return res.status(400).json({ error: 'El curso es requerido para estudiantes y alumnado' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo usuario
        const [result] = await db.promise().query(
            `INSERT INTO usuarios (
                nombre_completo, 
                email, 
                dni, 
                contrasena, 
                tipo_usuario_id, 
                curso
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre_completo, email, dni, hashedPassword, tipo_usuario, curso || null]
        );

        console.log('Usuario registrado exitosamente:', result.insertId);

        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            userId: result.insertId 
        });

    } catch (error) {
        console.error('Error detallado en registro:', error);
        res.status(500).json({ 
            error: 'Error en el servidor',
            details: error.message 
        });
    }
});

// Ruta para obtener todas las notas
app.get('/api/todas-notas', verifyToken, async (req, res) => {
    try {
        const [notas] = await db.promise().query(`
            SELECT n.*, 
                   u.nombre as alumno_nombre,
                   m.nombre as materia_nombre
            FROM notas n
            JOIN usuarios u ON n.alumno_id = u.id
            JOIN materias m ON n.materia_id = m.id
            ORDER BY u.nombre, m.nombre
        `);
        res.json(notas);
    } catch (error) {
        console.error('Error al obtener notas:', error);
        res.status(500).json({ error: 'Error al obtener las notas' });
    }
});

// Ruta para obtener notas de un estudiante específico
app.get('/api/notas/:id', verifyToken, async (req, res) => {
    try {
        const estudianteId = req.params.id;
        
        // Verificar que el usuario está intentando acceder a sus propias notas
        if (req.user.id !== parseInt(estudianteId)) {
            return res.status(403).json({ error: 'No autorizado para ver estas notas' });
        }

        const [notas] = await db.promise().query(`
            SELECT n.notas_id, n.nota, m.nombre_materia
            FROM notas n
            JOIN materias m ON n.materia_id = m.materia_id
            WHERE n.usuario_id = ?
            ORDER BY m.nombre_materia
        `, [estudianteId]);
        res.json(notas);
    } catch (error) {
        console.error('Error al obtener notas del estudiante:', error);
        res.status(500).json({ error: 'Error al obtener las notas' });
    }
});

// Ruta para obtener todos los usuarios
app.get('/api/usuarios', verifyToken, async (req, res) => {
    try {
        const [usuarios] = await db.promise().query(`
            SELECT u.*, t.nombre as tipo_usuario_nombre 
            FROM usuarios u 
            LEFT JOIN tipo_de_usuario t ON u.tipo_usuario = t.id
        `);
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Ruta para obtener un usuario específico
app.get('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
        const [usuarios] = await db.promise().query(`
            SELECT u.id, u.nombre_completo, u.email, u.dni, u.curso, t.nombre_tipo as tipo_usuario
            FROM usuarios u
            JOIN tipo_de_usuario t ON u.tipo_usuario = t.id
            WHERE u.id = ?
        `, [req.params.id]);

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuarios[0]);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// Ruta para actualizar un usuario
app.put('/api/usuarios/:id', verifyToken, async (req, res) => {
    const { nombre_completo, email, dni, tipo_usuario, curso } = req.body;
    const userId = req.params.id;

    try {
        // Verificar si el usuario existe
        const [existingUser] = await db.promise().query(
            'SELECT * FROM usuarios WHERE id = ?',
            [userId]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si el email o DNI ya existe en otro usuario
        const [duplicateCheck] = await db.promise().query(
            'SELECT * FROM usuarios WHERE (email = ? OR dni = ?) AND id != ?',
            [email, dni, userId]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({ error: 'El email o DNI ya está en uso por otro usuario' });
        }

        // Actualizar usuario
        await db.promise().query(
            'UPDATE usuarios SET nombre_completo = ?, email = ?, dni = ?, tipo_usuario = ?, curso = ? WHERE id = ?',
            [nombre_completo, email, dni, tipo_usuario, curso, userId]
        );

        res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// Ruta para eliminar un usuario
app.delete('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
        const [result] = await db.promise().query(
            'DELETE FROM usuarios WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

// Ruta para obtener todas las materias
app.get('/api/materias', verifyToken, async (req, res) => {
    try {
        const [materias] = await db.promise().query('SELECT * FROM materias ORDER BY nombre');
        res.json(materias);
    } catch (error) {
        console.error('Error al obtener materias:', error);
        res.status(500).json({ error: 'Error al obtener las materias' });
    }
});

// Ruta para actualizar una nota
app.put('/api/notas/:id', verifyToken, async (req, res) => {
    const { nota } = req.body;
    try {
        await db.promise().query(
            'UPDATE notas SET nota = ? WHERE notas_id = ?',
            [nota, req.params.id]
        );
        res.json({ message: 'Nota actualizada exitosamente' });
    } catch (error) {
        console.error('Error al actualizar nota:', error);
        res.status(500).json({ error: 'Error al actualizar la nota' });
    }
});

// Ruta para eliminar una nota
app.delete('/api/notas/:id', verifyToken, async (req, res) => {
    try {
        await db.promise().query(
            'DELETE FROM notas WHERE notas_id = ?',
            [req.params.id]
        );
        res.json({ message: 'Nota eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar nota:', error);
        res.status(500).json({ error: 'Error al eliminar la nota' });
    }
});

// Ruta para agregar una nueva nota
app.post('/api/notas', verifyToken, async (req, res) => {
    try {
        const { alumno_id, materia_id, nota } = req.body;
        
        // Validar que la nota esté entre 1 y 10
        if (nota < 1 || nota > 10) {
            return res.status(400).json({ error: 'La nota debe estar entre 1 y 10' });
        }

        // Verificar si ya existe una nota para este alumno y materia
        const [existingNote] = await db.promise().query(
            'SELECT * FROM notas WHERE alumno_id = ? AND materia_id = ?',
            [alumno_id, materia_id]
        );

        if (existingNote.length > 0) {
            return res.status(400).json({ error: 'Ya existe una nota para este alumno en esta materia' });
        }

        // Insertar la nueva nota
        const [result] = await db.promise().query(
            'INSERT INTO notas (alumno_id, materia_id, nota) VALUES (?, ?, ?)',
            [alumno_id, materia_id, nota]
        );

        res.status(201).json({ 
            id: result.insertId,
            alumno_id,
            materia_id,
            nota
        });
    } catch (error) {
        console.error('Error al agregar nota:', error);
        res.status(500).json({ error: 'Error al agregar la nota' });
    }
});

// Iniciar el servidor
const startServer = (port) => {
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`El puerto ${port} está en uso, intentando con el puerto ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Error al iniciar el servidor:', err);
        }
    });
};

startServer(PORT);