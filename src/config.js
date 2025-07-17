export const PORT = process.env.PORT || 8080;
export const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/chat_app";

// Configuración adicional para producción
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const DEBUG = process.env.DEBUG === 'true';