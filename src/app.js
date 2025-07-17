import express from "express";
import path from "path";
import User from "./models/User.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// static files
app.use(express.static(path.join(import.meta.dirname, "../public")));

// Ruta de registro
app.post('/register', async (req, res) => {
  const { nick, password } = req.body;
  if (!nick || !password) return res.json({ success: false, message: 'Datos incompletos.' });
  try {
    const exists = await User.findByNick(nick);
    if (exists) return res.json({ success: false, message: 'El apodo ya existe.' });
    await User.create({ nick, password });
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
