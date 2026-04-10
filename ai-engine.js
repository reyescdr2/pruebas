/**
 * --- CDR SOBERANA IA: MOTOR UNIFICADO V1000 ---
 * Arquitectura de alto rendimiento basada en BiRefNet (RMBG-1.4).
 * Ejecución 100% Local en el Navegador.
 */

const AIEngine = (() => {
    let segmenter = null;
    let isLoading = false;

    /**
     * Inicialización del cerebro IA
     */
    const init = async (onProgress, token = '') => {
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
            console.log("[CDR IA] Cargando Red Neuronal SOBERANA (Auth Mode)...");
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');
            
            env.allowLocalModels = false;
            env.useBrowserCache = true;
            
            // Inyectamos el token si existe para evitar errores 401
            if (token) {
                console.log("[CDR IA] Usando Token de Autorización HF.");
                env.remoteHost = 'https://huggingface.co/';
                env.remotePathTemplate = '{model}/resolve/{revision}/{file}';
                // El token se pasa en las opciones del pipeline en versiones recientes
            }

            const modelId = 'Xenova/rmbg-1.4';
            
            const pipelineOptions = {
                device: 'webgpu',
                progress_callback: (res) => { if (onProgress) onProgress(res); }
            };

            // Si hay token, lo añadimos a las peticiones (Hugging Face Auth)
            if (token) {
                pipelineOptions.hf_token = token;
            }

            segmenter = await pipeline('image-segmentation', modelId, pipelineOptions).catch(async (err) => {
                console.warn("[CDR IA] WebGPU no disponible o error de red, usando CPU...", err);
                return await pipeline('image-segmentation', modelId, {
                    ...pipelineOptions,
                    device: 'cpu'
                });
            });

            isLoading = false;
            console.log("[CDR IA] Cerebro cargado y listo.");
            return segmenter;
        } catch (e) {
            isLoading = false;
            console.error("[CDR IA] Error fatal al cargar IA:", e);
            throw e;
        }
    };

    /**
     * Procesamiento de imagen (Remoción de fondo diamante)
     */
    const process = async (blob, options = {}) => {
        const { onProgress, strict = true } = options;
        const seg = await init(onProgress);
        const imgUrl = URL.createObjectURL(blob);
        
        try {
            console.log("[CDR IA] Analizando frame...");
            const results = await seg(imgUrl);
            if (!results || !results[0]) throw new Error("IA no pudo segmentar la imagen.");
            
            const result = results[0];
            let mask = result.mask; // RawImage

            const img = new Image();
            img.src = imgUrl;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
            });

            const W = img.width, H = img.height;
            if (mask.width !== W || mask.height !== H) {
                mask = await mask.resize(W, H);
            }

            const mData = mask.data;
            const channels = mask.channels || 1;

            // Detector de inversión de máscara mejorado (V1001)
            // Analiza los bordes para determinar si el fondo es claro u oscuro en la máscara
            const sampleEdges = [
                0, W/2, W-1, // Arriba
                (H/2)*W, (H/2)*W + (W-1), // Centro
                (H-1)*W, (H-1)*W + W/2, H*W-1 // Abajo
            ];
            let edgeSum = 0;
            sampleEdges.forEach(idx => edgeSum += mData[Math.floor(idx) * channels]);
            const isInverted = (edgeSum / sampleEdges.length) > 128;

            console.log(`[CDR IA] Modo Máscara: ${isInverted ? 'INVERTIDA' : 'ESTÁNDAR'} (Score: ${Math.round(edgeSum/sampleEdges.length)})`);

            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, W, H);
            const pixels = imageData.data;

            // Motor de esculpido CDR (V1001: Precision Shave)
            for (let i = 0; i < pixels.length; i += 4) {
                const pixelIdx = i / 4;
                const dataIdx = pixelIdx * channels;
                
                let prob = mData[dataIdx];
                if (isInverted) prob = 255 - prob;

                // Aplicación de Alfa con suavizado de bordes
                let alpha = 0;
                if (prob > 200) {
                    alpha = 255;
                } else if (prob < 30) {
                    alpha = 0;
                } else {
                    // Curva sigma para bordes suaves en cabello/objetos
                    const normalized = (prob - 30) / (200 - 30);
                    alpha = Math.round(normalized * 255);
                }

                pixels[i + 3] = alpha;
            }

            ctx.putImageData(imageData, 0, 0);
            URL.revokeObjectURL(imgUrl);
            return new Promise(r => canvas.toBlob(r, 'image/png'));
        } catch (e) {
            URL.revokeObjectURL(imgUrl);
            console.error("[CDR IA] Error en procesado:", e);
            return blob; // Fallback
        }
    };

    return { process, init };
})();
