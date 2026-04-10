/**
 * MOTOR SOBERANO: BiRefNet (Local Master)
 * IA Ilimitada ejecutada en el navegador.
 */

const EngineBiRefNet = (() => {
    let segmenter = null;
    let isLoading = false;

    const init = async (onProgress, token) => {
        if (segmenter) return segmenter;
        if (isLoading) {
            return new Promise(resolve => {
                const check = setInterval(() => {
                    if (segmenter) { clearInterval(check); resolve(segmenter); }
                }, 100);
            });
        }

        isLoading = true;
        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            // --- V800 FINAL ATTACK: Usando Xenova/RMBG-1.4 (PÚBLICO Y COMPATIBLE) ---
            const modelId = 'Xenova/rmbg-1.4';
            console.log(`[V800 Master] Intentando carga pública de: ${modelId}`);
            
            segmenter = await pipeline('image-segmentation', modelId, {
                device: 'webgpu',
                // Eliminamos el token para descarga pública directa (Evitar 401)
                progress_callback: (res) => { if (onProgress) onProgress(res); }
            }).catch(async (err) => {
                console.warn("[V800 Master] WebGPU falló, reintentando en CPU...", err);
                return await pipeline('image-segmentation', modelId, {
                    device: 'cpu',
                    progress_callback: (res) => { if (onProgress) onProgress(res); }
                });
            });

            isLoading = false;
            console.log("[V800 Master] IA Lista y Cargada.");
            return segmenter;
        } catch (e) {
            isLoading = false;
            console.error("[V800 Critical Fallback] Error inyectando cerebro pública:", e);
            throw e;
        }
    };

    const process = async (blob, onProgress, strict = false) => {
        const seg = await init(onProgress);
        const imgUrl = URL.createObjectURL(blob);
        
        try {
            console.log("[V900 Forensic] Iniciando Segmentación...");
            const results = await seg(imgUrl);
            if (!results || !results[0]) throw new Error("No se pudo extraer la máscara del sujeto.");
            
            const result = results[0];
            let mask = result.mask; // RawImage
            
            const img = new Image();
            img.src = imgUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Error cargando imagen para compuesto."));
            });

            const W = img.width, H = img.height;
            console.log(`[V900 Forensic] Escaneando: ${W}x${H}`);

            if (mask.width !== W || mask.height !== H) {
                mask = await mask.resize(W, H);
            }

            const mData = mask.data;
            const channels = mask.channels || 1;

            // --- DETECTOR AUTOMÁTICO DE INVERSIÓN (Forensic Pass) ---
            // Si las 4 esquinas son blancas (>200), la máscara está invertida.
            const corners = [0, W - 1, (H - 1) * W, H * W - 1];
            let cornerSum = 0;
            corners.forEach(c => cornerSum += mData[c * channels]);
            const isInverted = (cornerSum / 4) > 200;
            if (isInverted) console.warn("[V900 Forensic] ¡Máscara Invertida Detectada! Corrigiendo...");

            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, W, H);
            const pixels = imageData.data;

            // --- ESCULPIDO ANIME V1250 (Hilo-Fino + Skin Guard) ---
            for (let i = 0; i < pixels.length; i += 4) {
                const pixelIdx = i / 4;
                const dataIdx = pixelIdx * channels;
                const x = pixelIdx % W;
                const y = Math.floor(pixelIdx / W);
                
                let prob = mData[dataIdx];
                if (isInverted) prob = 255 - prob;

                // 1. SKIN-GUARD (Protector de Sujeto Anime)
                const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                const isSkin = (r > 190 && g > 150 && b > 120 && r > b + 20); // Detección de tonos durazno/piel
                const isBright = (r > 240 && g > 240 && b > 240); // Evitar comerse brillos extremos
                
                let alpha = 0;
                
                // Si es piel o brillo y la IA duda (prob > 80), lo protegemos
                if ((isSkin || isBright) && prob > 80) {
                    prob = Math.max(prob, 210); // Forzamos a que se mantenga
                }

                // 2. HALO-SHAVE (Erosión 1px Forense V1300)
                // Si estamos en un borde y hay "vacío" cerca, recortamos agresivamente
                const edgeThreshold = strict ? 220 : 200;
                const shaveFactor = strict ? 0.15 : 0.4; // 0.15 es recorte radical en modo estricto
                
                if (prob < edgeThreshold && prob > 30) {
                    let hasVoid = false;
                    // Escaneo rápido de 4 vecinos (Cruz)
                    if (x > 0 && mData[(pixelIdx - 1) * channels] < 30) hasVoid = true;
                    if (x < W - 1 && mData[(pixelIdx + 1) * channels] < 30) hasVoid = true;
                    if (y > 0 && mData[(pixelIdx - W) * channels] < 30) hasVoid = true;
                    if (y < H - 1 && mData[(pixelIdx + W) * channels] < 30) hasVoid = true;
                    
                    if (hasVoid) {
                        prob = Math.round(prob * shaveFactor); 
                    }
                }

                // Aplicación final con Sigmoide Suave pero afilado
                const upperLimit = strict ? 200 : 180;
                const lowerLimit = strict ? 25 : 15;

                if (prob > upperLimit) {
                    alpha = 255;
                } else if (prob < lowerLimit) {
                    alpha = 0;
                } else {
                    const normalized = prob / 255;
                    const power = strict ? 1.5 : 0.9; // Potencia más alta = bordes más delgados
                    alpha = Math.round(Math.pow(normalized, power) * 255);
                }

                pixels[i + 3] = alpha;
            }

            ctx.putImageData(imageData, 0, 0);
            URL.revokeObjectURL(imgUrl);
            console.log("[V900 Forensic] Limpieza Diamante Finalizada.");
            
            return new Promise(r => canvas.toBlob(r, 'image/png'));
        } catch (e) {
            console.error("[V900 Error]", e);
            URL.revokeObjectURL(imgUrl);
            throw e;
        }
    };

    return { process, init };
})();

