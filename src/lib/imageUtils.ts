/**
 * Utilitário para Compressão de Imagens no Cliente (Browser)
 * Usa Canvas API para redimensionar e comprimir imagens antes do upload.
 */

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0.0 a 1.0 (ex: 0.8 para 80%)
    fileType?: string; // 'image/jpeg', 'image/png', 'image/webp'
}

/**
 * Comprime um arquivo de imagem.
 * @param file Arquivo de imagem original
 * @param options Opções de compressão
 * @returns Promise com o arquivo comprimido (Blob/File)
 */
export const compressImage = async (file: File, options: CompressionOptions = {}): Promise<File> => {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        fileType = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calcular novas dimensões mantendo proporção
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                // Criar canvas para redimensionamento
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Converter canvas para Blob/File comprimido
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Image compression failed'));
                            return;
                        }

                        // Criar novo arquivo com o blob comprimido
                        const newFile = new File([blob], file.name, {
                            type: fileType,
                            lastModified: Date.now(),
                        });

                        resolve(newFile);
                    },
                    fileType,
                    quality
                );
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};
