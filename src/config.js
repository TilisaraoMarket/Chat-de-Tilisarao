export const PORT = process.env.PORT || 80;
export const DATABASE_URL = process.env.DATABASE_URL || "postgresql://db_bq6z4sey95ev:KKJvbEuh1cmCEslYPncDcSCK@up-de-fra1-postgresql-1.db.run-on-seenode.com:11550/db_bq6z4sey95ev";

// Configuración adicional para producción
export const NODE_ENV = process.env.NODE_ENV || 'production';
export const DEBUG = process.env.DEBUG === 'true';