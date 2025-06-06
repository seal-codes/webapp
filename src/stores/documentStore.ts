import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

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
  
  const sealDocument = async (position: { x: number, y: number }) => {
    if (!uploadedDocument.value || !isAuthenticated.value) {
      throw new Error('Document or authentication missing');
    }
    
    try {
      // Generate QR code data URL containing verification info
      const verificationUrl = `https://seal.codes/verify/${documentId.value}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H'
      });
      
      // Handle PDF documents
      if (documentType.value === 'pdf') {
        await sealPdfDocument(qrCodeDataUrl, position);
      } 
      // Handle image documents
      else if (documentType.value === 'image') {
        await sealImageDocument(qrCodeDataUrl, position);
      }
      
      return documentId.value;
    } catch (error) {
      console.error('Error sealing document:', error);
      throw new Error('Failed to seal document');
    }
  };
  
  const sealPdfDocument = async (qrCodeDataUrl: string, position: { x: number, y: number }) => {
    if (!uploadedDocument.value) return;
    
    // Read the PDF file
    const fileArrayBuffer = await uploadedDocument.value.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileArrayBuffer);
    
    // Convert QR code data URL to image
    const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
    
    // Add QR code to each page of the PDF
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Calculate position
    const { width, height } = firstPage.getSize();
    const qrSize = 100;
    const qrX = (width * position.x / 100) - (qrSize / 2);
    const qrY = (height * (100 - position.y) / 100) - (qrSize / 2); // Invert Y coordinate
    
    firstPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    
    // Save the PDF
    const sealedPdfBytes = await pdfDoc.save();
    const sealedPdfBlob = new Blob([sealedPdfBytes], { type: 'application/pdf' });
    
    sealedDocumentBlob.value = sealedPdfBlob;
    sealedDocumentUrl.value = URL.createObjectURL(sealedPdfBlob);
  };
  
  const sealImageDocument = async (qrCodeDataUrl: string, position: { x: number, y: number }) => {
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
          // Calculate QR code position
          const qrSize = Math.min(canvas.width, canvas.height) * 0.15; // 15% of smallest dimension
          const qrX = (canvas.width * position.x / 100) - (qrSize / 2);
          const qrY = (canvas.height * position.y / 100) - (qrSize / 2);
          
          // Draw QR code
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          
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
    
    // Actions
    setDocument,
    authenticateWith,
    sealDocument,
    downloadSealedDocument,
    reset
  };
});