"""
database.py - Gestor de Base de Datos SQLite para TODOMIGOB
Optimizado para Raspberry Pi 4 (bajo consumo de memoria, archivo único, WAL mode).
"""

import sqlite3
import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

# Categorías oficiales TODOMIGOB alineadas con el pipeline de noticias
DEFAULT_CATEGORIES = [
    {"id": "education_scholarships", "name": "Educación y Becas", "description": "Becas, convocatorias estudiantiles y programas de educación."},
    {"id": "health_wellbeing", "name": "Salud y Prevención", "description": "Campañas de vacunación, centros de salud y alertas sanitarias."},
    {"id": "social_programs", "name": "Apoyo Social", "description": "Subsidios, programas de asistencia y transferencias monetarias."},
    {"id": "procedures_services", "name": "Trámites y Documentos", "description": "DPI, pasaportes, licencias, certificaciones y requisitos."},
    {"id": "security_alerts", "name": "Alertas y Emergencias", "description": "Avisos de seguridad, protección civil, clima y emergencias."},
    {"id": "employment_development", "name": "Empleo y Emprendimiento", "description": "Ferias de empleo, capacitaciones y financiamiento productivo."}
]

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

class TodoMiGobDB:
    def __init__(self, db_path: str = "todomigob.db"):
        self.db_path = db_path
        # Asegurar directorio
        dir_name = os.path.dirname(db_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Activar claves foráneas y WAL para máxima concurrencia y velocidad en Raspberry Pi
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def init_db(self):
        """Crea las tablas necesarias e inicializa las categorías oficiales si no existen."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Tabla de Usuarios
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # 2. Tabla de Categorías
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT
            );
            """)

            # 3. Tabla de Preferencias (Relación N:M entre Usuarios y Categorías)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                UNIQUE(user_id, category_id)
            );
            """)

            # 4. Registro de Notificaciones Enviadas (auditoría y control de duplicados)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                news_id TEXT NOT NULL,
                category_id TEXT NOT NULL,
                status TEXT NOT NULL, -- 'SENT', 'FAILED'
                sent_at TEXT NOT NULL,
                error_message TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, news_id)
            );
            """)

            # Índices para búsquedas ultra-rápidas en Raspberry Pi
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notification_logs_user_news ON notification_logs(user_id, news_id);")

            # Insertar categorías base si faltan
            for cat in DEFAULT_CATEGORIES:
                cursor.execute("""
                INSERT INTO categories (id, name, description)
                VALUES (:id, :name, :description)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description;
                """, cat)

            conn.commit()

    def register_user(self, name: str, email: str, preferences: List[str]) -> Dict[str, Any]:
        """
        Registra un usuario nuevo o actualiza sus preferencias si ya existe.
        `preferences`: lista de IDs de categoría (ej. ['health_wellbeing', 'education_scholarships'])
        """
        email = email.strip().lower()
        name = name.strip()
        now = utc_now()

        if not email or "@" not in email:
            raise ValueError("El correo electrónico proporcionado no es válido.")
        if not name:
            raise ValueError("El nombre del usuario no puede estar vacío.")

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Insertar o actualizar usuario
            cursor.execute("""
            INSERT INTO users (name, email, is_active, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                is_active = 1,
                updated_at = excluded.updated_at
            RETURNING id, name, email, is_active, created_at, updated_at;
            """, (name, email, now, now))
            user_row = cursor.fetchone()
            user_id = user_row["id"]

            # Actualizar preferencias: limpiamos anteriores e insertamos las nuevas válidas
            cursor.execute("DELETE FROM user_preferences WHERE user_id = ?;", (user_id,))

            valid_preferences = []
            for cat_id in set(preferences):
                cursor.execute("SELECT id FROM categories WHERE id = ?;", (cat_id,))
                if cursor.fetchone():
                    cursor.execute("""
                    INSERT OR IGNORE INTO user_preferences (user_id, category_id, created_at)
                    VALUES (?, ?, ?);
                    """, (user_id, cat_id, now))
                    valid_preferences.append(cat_id)

            conn.commit()

            return {
                "id": user_id,
                "name": user_row["name"],
                "email": user_row["email"],
                "is_active": bool(user_row["is_active"]),
                "preferences": valid_preferences,
                "updated_at": now
            }

    def get_users_by_category(self, category_id: str) -> List[Dict[str, Any]]:
        """Devuelve todos los usuarios activos que tienen como preferencia una categoría dada."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT u.id, u.name, u.email
            FROM users u
            INNER JOIN user_preferences up ON u.id = up.user_id
            WHERE up.category_id = ? AND u.is_active = 1;
            """, (category_id,))
            rows = cursor.fetchall()
            return [{"id": r["id"], "name": r["name"], "email": r["email"]} for r in rows]

    def has_user_been_notified(self, user_id: int, news_id: str) -> bool:
        """Verifica si un usuario ya recibió la notificación de una noticia específica."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id FROM notification_logs
            WHERE user_id = ? AND news_id = ? AND status = 'SENT';
            """, (user_id, news_id))
            return cursor.fetchone() is not None

    def log_notification(self, user_id: int, news_id: str, category_id: str, status: str, error_message: Optional[str] = None):
        """Registra el resultado del envío de notificación."""
        now = utc_now()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO notification_logs (user_id, news_id, category_id, status, sent_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, news_id) DO UPDATE SET
                status = excluded.status,
                sent_at = excluded.sent_at,
                error_message = excluded.error_message;
            """, (user_id, news_id, category_id, status, now, error_message))
            conn.commit()

    def list_all_users(self) -> List[Dict[str, Any]]:
        """Lista todos los usuarios con sus respectivas preferencias."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, is_active, created_at, updated_at FROM users ORDER BY id DESC;")
            users = [dict(row) for row in cursor.fetchall()]

            for u in users:
                cursor.execute("""
                SELECT c.id, c.name
                FROM user_preferences up
                JOIN categories c ON up.category_id = c.id
                WHERE up.user_id = ?;
                """, (u["id"],))
                prefs = cursor.fetchall()
                u["preferences"] = [{"id": p["id"], "name": p["name"]} for p in prefs]
            return users

    def get_categories(self) -> List[Dict[str, Any]]:
        """Obtiene el catálogo de categorías disponibles."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description FROM categories ORDER BY name ASC;")
            return [dict(row) for row in cursor.fetchall()]

    def get_notification_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Historial de notificaciones enviadas."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT l.id, u.name as user_name, u.email, l.news_id, c.name as category_name, l.status, l.sent_at, l.error_message
            FROM notification_logs l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN categories c ON l.category_id = c.id
            ORDER BY l.id DESC
            LIMIT ?;
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
