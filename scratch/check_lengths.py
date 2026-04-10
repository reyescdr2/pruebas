
re_ansi = r'\033\[[0-9;]*m'
import re

lines = [
    "  PANEL DE ADMINISTRACIÓN CDR - v3.4.4                   ",
    "  1. Generar Key por CORREO (Vinculada)                      ",
    "  2. Generar Key PREMIUM (Ilimitada)                         ",
    "  3. Generar Key SINGLE-USE (Un solo uso)                    ",
    "  4. Gestión de TIEMPO (Keys Temporales)                     ",
    "  5. CONTROL ACCESO (Bloquear/Eliminar)                      ",
    "  6. REINICIO TOTAL (Limpiar Sistema)                        ",
    "  7. VER ESTADO DE KEYS (Uso y Auditoría)                    ",
    "  Q. SALIR DEL SISTEMA                                       "
]

for i, line in enumerate(lines):
    # Strip spaces for pure content length
    content = line.strip()
    print(f"Line {i+1}: '{content}' length={len(content)}")
    print(f"Total line length in code: {len(line)}")
