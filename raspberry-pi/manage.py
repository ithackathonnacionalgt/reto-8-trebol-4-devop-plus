#!/usr/bin/env python3
"""
manage.py - Herramienta de Línea de Comandos (CLI) para TODOMIGOB en Raspberry Pi 4
Permite administrar la base de datos de usuarios y despachar notificaciones desde terminal/SSH.
"""

import sys
import os
import json
import argparse

# Compatibilidad de codificación UTF-8 multiplataforma (Windows y Raspberry Pi)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from database import TodoMiGobDB, DEFAULT_CATEGORIES
from mailer import TodoMiGobMailer
from dispatcher import NotificationDispatcher

def main():
    parser = argparse.ArgumentParser(description="Gestor CLI de TODOMIGOB para Raspberry Pi 4")
    parser.add_argument("--db", default=os.getenv("DB_PATH", "todomigob.db"), help="Ruta al archivo SQLite")
    
    subparsers = parser.add_subparsers(dest="command", help="Comandos disponibles")

    # Comando: add-user
    add_parser = subparsers.add_parser("add-user", help="Registrar un usuario (no permite correos repetidos a menos de usar --update)")
    add_parser.add_argument("--name", required=True, help="Nombre del ciudadano")
    add_parser.add_argument("--email", required=True, help="Correo electrónico")
    add_parser.add_argument("--categories", required=True, help="Categorías separadas por coma (ej. health_wellbeing,education_scholarships)")
    add_parser.add_argument("--update", action="store_true", help="Permitir actualizar preferencias si el usuario ya existe")

    # Comando: list-users
    subparsers.add_parser("list-users", help="Listar todos los usuarios y sus preferencias")

    # Comando: list-categories
    subparsers.add_parser("list-categories", help="Listar las categorías oficiales disponibles")

    # Comando: test-email
    test_parser = subparsers.add_parser("test-email", help="Enviar un correo de prueba vía SMTP Gmail")
    test_parser.add_argument("--to", required=True, help="Correo destinatario")

    # Comando: dispatch
    dispatch_parser = subparsers.add_parser("dispatch", help="Procesar un archivo JSON de noticias y enviar notificaciones")
    dispatch_parser.add_argument("--file", required=True, help="Ruta al archivo noticias.json o noticias.preview.json")

    # Comando: stats
    subparsers.add_parser("stats", help="Mostrar estadísticas de usuarios y notificaciones enviadas")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    db = TodoMiGobDB(args.db)
    mailer = TodoMiGobMailer()
    dispatcher = NotificationDispatcher(db, mailer)

    if args.command == "add-user":
        cats = [c.strip() for c in args.categories.split(",") if c.strip()]
        try:
            user = db.register_user(args.name, args.email, cats, allow_update=args.update)
            action_desc = "actualizado" if args.update else "registrado"
            print(f"✅ Usuario {action_desc} exitosamente:")
            print(f"   ID: #{user['id']}")
            print(f"   Nombre: {user['name']}")
            print(f"   Correo: {user['email']}")
            print(f"   Preferencias activadas ({len(user['preferences'])}): {', '.join(user['preferences'])}")
        except Exception as e:
            print(f"❌ Error al registrar usuario: {e}")
            sys.exit(1)

    elif args.command == "list-users":
        users = db.list_all_users()
        print(f"\n📋 Total de usuarios registrados: {len(users)}\n")
        print(f"{'ID':<5} | {'Nombre':<25} | {'Correo':<30} | {'Preferencias'}")
        print("-" * 80)
        for u in users:
            prefs = ", ".join([p["name"] for p in u.get("preferences", [])])
            print(f"{u['id']:<5} | {u['name']:<25} | {u['email']:<30} | {prefs}")
        print()

    elif args.command == "list-categories":
        cats = db.get_categories()
        print("\n🏷️  Categorías Oficiales TODOMIGOB:\n")
        for c in cats:
            print(f"  • [{c['id']}]: {c['name']}")
            if c.get("description"):
                print(f"    {c['description']}")
        print()

    elif args.command == "test-email":
        mock_news = {
            "id": "cli-test-email",
            "categoryId": "procedures_services",
            "source": "TODOMIGOB CLI",
            "originalUrl": "https://todomigob.gob.gt",
            "urgent": False,
            "content": {
                "es": {
                    "title": "Verificación de Notificaciones TODOMIGOB",
                    "summary": "Este correo confirma que tu Raspberry Pi 4 puede enviar alertas oficiales a los ciudadanos mediante Gmail SMTP.",
                    "citizenAction": "No se requiere acción. El sistema está 100% operativo."
                }
            }
        }
        print(f"📧 Enviando correo de prueba a {args.to}...")
        try:
            mailer.send_notification(args.to, "Ciudadano", mock_news)
            print(f"✅ ¡Correo enviado exitosamente a {args.to}!")
        except Exception as e:
            print(f"❌ Error al enviar correo: {e}")
            sys.exit(1)

    elif args.command == "dispatch":
        file_path = args.file
        if not os.path.exists(file_path):
            print(f"❌ El archivo '{file_path}' no existe.")
            sys.exit(1)

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        news_items = data.get("news", []) if isinstance(data, dict) else data
        print(f"🚀 Procesando {len(news_items)} noticias desde {file_path}...")

        results = dispatcher.dispatch_batch(news_items)
        total_sent = sum(r["sent_count"] for r in results)
        total_skipped = sum(r["already_notified_count"] for r in results)
        total_failed = sum(r["failed_count"] for r in results)

        print("\n📊 Resumen del despacho:")
        print(f"   • Envíos exitosos: {total_sent}")
        print(f"   • Omitidos (ya notificados previamente): {total_skipped}")
        print(f"   • Errores: {total_failed}")
        print("✅ Proceso completado.")

    elif args.command == "stats":
        users = db.list_all_users()
        logs = db.get_notification_logs(limit=1000)
        print("\n📈 Estadísticas TODOMIGOB:")
        print(f"   • Usuarios registrados: {len(users)}")
        print(f"   • Total de notificaciones enviadas: {len([l for l in logs if l['status'] == 'SENT'])}")
        print(f"   • Notificaciones fallidas: {len([l for l in logs if l['status'] == 'FAILED'])}")
        print()

if __name__ == "__main__":
    main()
