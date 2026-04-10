import io
from PIL import Image
from rembg import remove, new_session

class CDR_IA:
    """
    MODULO DE IA SOBERANA CDR - ELIMINACIÓN DE FONDOS
    Versión: 1.0.0
    """
    
    def __init__(self, model_name="u2net"):
        """
        Inicializa la sesión de la IA.
        Modelos disponibles: u2net, u2netp, u2net_human_seg, isnet-general-use
        """
        self.session = new_session(model_name)

    def remove_background(self, input_image_data: bytes) -> bytes:
        """
        Recibe una imagen en bytes y devuelve la imagen procesada en bytes (PNG transparente).
        """
        try:
            # Procesar la imagen usando rembg
            output_image_data = remove(input_image_data, session=self.session)
            return output_image_data
        except Exception as e:
            # En producción, podrías loguear esto
            print(f"[CDR IA ERROR] Fallo en el procesamiento: {e}")
            return input_image_data

    def process_file(self, input_path: str, output_path: str):
        """
        Procesa un archivo físico y guarda el resultado.
        """
        with open(input_path, 'rb') as i:
            input_data = i.read()
            output_data = self.remove_background(input_data)
            
            with open(output_path, 'wb') as o:
                o.write(output_data)

# --- FUNCIÓN REUTILIZABLE SOLICITADA ---
def remove_background(image_bytes: bytes) -> bytes:
    """
    Función de acceso rápido para integración directa.
    remove_background(image) -> image_png
    """
    ia = CDR_IA()
    return ia.remove_background(image_bytes)

# --- EJEMPLO DE USO (DEMO) ---
if __name__ == "__main__":
    # Este bloque solo se ejecuta si se corre el script directamente
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python cdr_ia.py <imagen_entrada> [imagen_salida]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "output_cdr.png"
    
    print(f"[*] CDR IA: Procesando {input_file}...")
    engine = CDR_IA()
    engine.process_file(input_file, output_file)
    print(f"[+] ¡Listo! Imagen guardada en: {output_file}")
