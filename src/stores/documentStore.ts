import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { PDFDocument } from 'pdf-lib';
import { qrCodeService } from '@/services/qrcode-service';
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator';
import { attestationBuilder } from '@/services/attestation-builder';
import type { QRCodeUIPosition, AttestationData } from '@/types/qrcode';

// Unique ID generation for documents
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const useDocumentStore = defineStore('document', () => {
  // State
  const uploadedDocument = ref<File | null>(null);
  const documentType = ref<'pdf' | 'image' | null>(null);
  const documentId = ref<string>('');
  const documentPreviewUrl = ref<string>('');
  const sealedDocumentUrl = ref<string>('');
  const sealedDocumentBlob = ref<Blob | null>(null);
  const isAuthenticated = ref(false);
  const authProvider = ref<string | null>(null);
  const userName = ref<string | null>(null);
  
  // Getters
  const hasDocument = computed(() => uploadedDocument.value !== null);
  const fileName = computed(() => uploadedDocument.value?.name || '');
  const currentAttestationData = computed((): AttestationData | undefined => {
    if (!isAuthenticated.value || !authProvider.value || !userName.value) {
      return undefined;
    }
    
    try {
      return buildAttestationData();
    } catch (error) {
      console.warn('Could not build attestation data:', error);
      return undefined;
    }
  });
  
  // Actions
  const setDocument = async (file: File) => {
    uploadedDocument.value = file;
    
    // Determine document type
    if (file.type === 'application/pdf') {
      documentType.value = 'pdf';
    } else if (file.type.startsWith('image/')) {
      documentType.value = 'image';
    } else {
      throw new Error('Unsupported file type');
    }
    
    // Create a preview URL
    documentPreviewUrl.value = URL.createObjectURL(file);
  };
  
  const authenticateWith = async (provider: string) => {
    // Simulate authentication with a 1 second delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    isAuthenticated.value = true;
    authProvider.value = provider;
    userName.value = `User (${provider})`;
    
    // Generate a unique document ID
    documentId.value = generateUniqueId();
  };
  
  const sealDocument = async (position: QRCodeUIPosition, sizePercent: number = 20) => {
    if (!uploadedDocument.value || !isAuthenticated.value) {
      throw new Error('Document or authentication missing');
    }

    try {
      // Get document dimensions for pixel calculation
      const documentDimensions = await getDocumentDimensions();
      
      // Calculate exact pixel positioning using our UI calculator
      const pixelCalculation = qrCodeUICalculator.calculateEmbeddingPixels(
        position,
        sizePercent,
        documentDimensions,
        documentType.value as 'pdf' | 'image'
      );

      // Build compact attestation data
      const attestationData = buildAttestationData();

      // Generate QR code using our service with exact dimensions
      const qrResult = await qrCodeService.generateForEmbedding({
        position: pixelCalculation.position,
        sizeInPixels: pixelCalculation.sizeInPixels,
        attestationData
      });

      // Embed using the same QR code that was generated
      if (documentType.value === 'pdf') {
        await sealPdfDocument(qrResult.dataUrl, pixelCalculation.position, pixelCalculation.sizeInPixels);
      } else if (documentType.value === 'image') {
        await sealImageDocument(qrResult.dataUrl, pixelCalculation.position, pixelCalculation.sizeInPixels);
      }

      return documentId.value;
    } catch (error) {
      console.error('Error sealing document:', error);
      throw new Error('Failed to seal document');
    }
  };
  
  // Helper function to get document dimensions
  const getDocumentDimensions = async (): Promise<{ width: number; height: number }> => {
    if (!uploadedDocument.value) {
      throw new Error('No document available');
    }

    if (documentType.value === 'image') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image dimensions'));
        img.src = documentPreviewUrl.value;
      });
    } else if (documentType.value === 'pdf') {
      // For PDFs, we need to get the page dimensions
      const fileArrayBuffer = await uploadedDocument.value.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileArrayBuffer);
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      return { width, height };
    }

    throw new Error('Unsupported document type');
  };

  // Helper function to build attestation data
  const buildAttestationData = (): AttestationData => {
    if (!authProvider.value || !userName.value) {
      throw new Error('Authentication data missing');
    }

    // TODO: Generate actual document hashes (cryptographic, pHash, dHash)
    // For now, using placeholder values
    return attestationBuilder.buildCompactAttestation({
      documentHashes: {
        cryptographic: 'placeholder-crypto-hash',
        pHash: 'placeholder-phash',
        dHash: 'placeholder-dhash'
      },
      identity: {
        provider: authProvider.value,
        identifier: userName.value
      },
      serviceInfo: {
        publicKeyId: 'placeholder-key-id'
      }
    });
  };
  
  const sealPdfDocument = async (
    qrCodeDataUrl: string, 
    position: { x: number; y: number }, 
    size: number
  ) => {
    if (!uploadedDocument.value) return;
    
    // Read the PDF file
    const fileArrayBuffer = await uploadedDocument.value.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileArrayBuffer);
    
    // Convert QR code data URL to image
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    
    // Add QR code to each page of the PDF
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Use the exact position and size calculated by our UI calculator
    firstPage.drawImage(qrImage, {
      x: position.x,
      y: position.y,
      width: size,
      height: size,
    });
    
    // Save the PDF
    const sealedPdfBytes = await pdfDoc.save();
    const sealedPdfBlob = new Blob([sealedPdfBytes], { type: 'application/pdf' });
    
    sealedDocumentBlob.value = sealedPdfBlob;
    sealedDocumentUrl.value = URL.createObjectURL(sealedPdfBlob);
  };
  
  const sealImageDocument = async (
    qrCodeDataUrl: string, 
    position: { x: number; y: number }, 
    size: number
  ) => {
    if (!uploadedDocument.value) return;
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      img.onload = () => {
        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Load QR code image
        const qrImg = new Image();
        qrImg.onload = () => {
          // Use the exact position and size calculated by our UI calculator
          ctx.drawImage(qrImg, position.x, position.y, size, size);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              sealedDocumentBlob.value = blob;
              sealedDocumentUrl.value = URL.createObjectURL(blob);
              resolve();
            } else {
              reject(new Error('Failed to create image blob'));
            }
          }, uploadedDocument.value?.type);
        };
        
        qrImg.onerror = () => reject(new Error('Failed to load QR code image'));
        qrImg.src = qrCodeDataUrl;
      };
      
      img.onerror = () => reject(new Error('Failed to load original image'));
      img.src = documentPreviewUrl.value;
    });
  };
  
  const downloadSealedDocument = () => {
    if (!sealedDocumentUrl.value || !uploadedDocument.value) return;
    
    const a = document.createElement('a');
    a.href = sealedDocumentUrl.value;
    
    // Get original filename and add a suffix
    const originalName = uploadedDocument.value.name;
    const dotIndex = originalName.lastIndexOf('.');
    
    let downloadName;
    if (dotIndex !== -1) {
      // Add 'sealed' before the extension
      downloadName = `${originalName.substring(0, dotIndex)}-sealed${originalName.substring(dotIndex)}`;
    } else {
      downloadName = `${originalName}-sealed`;
    }
    
    a.download = downloadName;
    a.click();
  };
  
  const reset = () => {
    // Clean up object URLs to prevent memory leaks
    if (documentPreviewUrl.value) URL.revokeObjectURL(documentPreviewUrl.value);
    if (sealedDocumentUrl.value) URL.revokeObjectURL(sealedDocumentUrl.value);
    
    // Reset state
    uploadedDocument.value = null;
    documentType.value = null;
    documentId.value = '';
    documentPreviewUrl.value = '';
    sealedDocumentUrl.value = '';
    sealedDocumentBlob.value = null;
    isAuthenticated.value = false;
    authProvider.value = null;
    userName.value = null;
  };
  
  return { 
    // State
    uploadedDocument, 
    documentType,
    documentId,
    documentPreviewUrl,
    sealedDocumentUrl,
    isAuthenticated,
    authProvider,
    userName,
    
    // Getters
    hasDocument,
    fileName,
    currentAttestationData,
    
    // Actions
    setDocument,
    authenticateWith,
    sealDocument,
    downloadSealedDocument,
    reset
  };
});