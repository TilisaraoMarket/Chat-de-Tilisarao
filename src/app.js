
import express from "express";
import path from "path";
import User from "./models/User.js";
import multer from "multer";

// Configuración de Multer para guardar imágenes en /public/avatars
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(import.meta.dirname, "../public/avatars"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes.'));
  }
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// static files
app.use(express.static(path.join(import.meta.dirname, "../public")));

// Ruta de registro con subida de avatar
app.post('/register', upload.single('avatar'), async (req, res) => {
  const { nick, password } = req.body;
  let avatar = null;
  if (req.file) {
    avatar = '/avatars/' + req.file.filename;
  }
  if (!nick || !password) return res.json({ success: false, message: 'Datos incompletos.' });
  try {
    const exists = await User.findByNick(nick);
    if (exists) return res.json({ success: false, message: 'El apodo ya existe.' });
    await User.create({ nick, password, avatar });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Error en el registro.' });
  }
});

// Ruta de login
app.post('/login', async (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) return res.json({ success: false, message: 'Datos incompletos.' });
  try {
    const user = await User.validatePassword(nick, password);
    if (!user) return res.json({ success: false, message: 'Credenciales incorrectas.' });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Error en el login.' });
  }
});

// starting the server
export default app;
