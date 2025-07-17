import app from "./app.js";
import "./database.js";
import http from "http";
import { Server } from "socket.io";
import sockets from "./sockets.js";
import { PORT, DATABASE_URL, NODE_ENV, DEBUG } from "./config.js";

const server = http.createServer(app);
const io = new Server(server);

// Logging para producción
const log = (message) => {
    if (DEBUG) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }
};

// Manejo de errores global
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// Inicializar sockets
try {
    sockets(io);
    log('Sockets inicializados correctamente');
} catch (error) {
    console.error('Error al inicializar sockets:', error);
    process.exit(1);
}

// Iniciar servidor
server.listen(PORT, () => {
    log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    log(`Database URL: ${DATABASE_URL}`);
});

// Manejo de errores del servidor
server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

// Manejo de cierre
process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down...');
    server.close(() => {
        process.exit(0);
    });
});
