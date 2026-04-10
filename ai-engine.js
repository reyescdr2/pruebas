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
    const init = async (onProgress) => {
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
            console.log("[CDR IA] Cargando Red Neuronal SOBERANA...");
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@latest');
            
            env.allowLocalModels = false;
            env.useBrowserCache = true;

            const modelId = 'Xenova/rmbg-1.4';
            
            segmenter = await pipeline('image-segmentation', modelId, {
                device: 'webgpu',
                progress_callback: (res) => { if (onProgress) onProgress(res); }
            }).catch(async (err) => {
                console.warn("[CDR IA] WebGPU no disponible, usando CPU...", err);
                return await pipeline('image-segmentation', modelId, {
                    device: 'cpu',
                    progress_callback: (res) => { if (onProgress) onProgress(res); }
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

            // Detector de inversión de máscara
            const corners = [0, W - 1, (H - 1) * W, H * W - 1];
            let cornerSum = 0;
            corners.forEach(c => cornerSum += mData[c * channels]);
            const isInverted = (cornerSum / 4) > 200;

            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, W, H);
            const pixels = imageData.data;

            // Motor de esculpido CDR (Diamond Shave)
            for (let i = 0; i < pixels.length; i += 4) {
                const pixelIdx = i / 4;
                const dataIdx = pixelIdx * channels;
                
                let prob = mData[dataIdx];
                if (isInverted) prob = 255 - prob;

                // Protecciones de color (Skin Guard)
                const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                const isBright = (r > 240 && g > 240 && b > 240);
                
                if (isBright && prob > 100) prob = Math.max(prob, 230);

                // Sigmoide de transparencia radical
                let alpha = 0;
                const threshold = strict ? 180 : 150;
                
                if (prob > threshold) {
                    alpha = 255;
                } else if (prob < 20) {
                    alpha = 0;
                } else {
                    const normalized = prob / 255;
                    alpha = Math.round(Math.pow(normalized, strict ? 1.8 : 1.2) * 255);
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
