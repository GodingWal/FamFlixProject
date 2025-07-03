// Helper functions for ML operations

// Function to check if browser supports the required ML features
export const checkBrowserSupport = (): {
  supported: boolean;
  features: {
    webgl: boolean;
    webAssembly: boolean;
    mediaDevices: boolean;
    sharedArrayBuffer: boolean;
  };
} => {
  const hasWebGL = (): boolean => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  };

  const hasWebAssembly = (): boolean => {
    try {
      return typeof WebAssembly === 'object' && 
        typeof WebAssembly.instantiate === 'function';
    } catch (e) {
      return false;
    }
  };

  const hasMediaDevices = (): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const hasSharedArrayBuffer = (): boolean => {
    try {
      return typeof SharedArrayBuffer !== 'undefined';
    } catch (e) {
      return false;
    }
  };

  const features = {
    webgl: hasWebGL(),
    webAssembly: hasWebAssembly(),
    mediaDevices: hasMediaDevices(),
    sharedArrayBuffer: hasSharedArrayBuffer()
  };

  // All required features must be supported
  const supported = features.webgl && features.webAssembly && features.mediaDevices;

  return {
    supported,
    features
  };
};

// Function to preprocess an image for ML models
export const preprocessImage = async (
  imageUrl: string,
  targetWidth = 256,
  targetHeight = 256
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw the image, resizing it to the target dimensions
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

// Function to create blob URL from base64 data
export const base64ToBlob = (base64Data: string, contentType = ''): Blob => {
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteArrays = [];

  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

// Save processed video to device
export const saveVideoToDevice = async (
  videoUrl: string, 
  filename: string = 'processed-video.mp4'
): Promise<boolean> => {
  try {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    
    // Create a link element
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    
    // Append to the document
    document.body.appendChild(a);
    
    // Programmatically click the link
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
    return true;
  } catch (error) {
    console.error('Error saving video:', error);
    return false;
  }
};

// Estimate processing time based on video length and operations
export const estimateProcessingTime = (
  videoLengthSeconds: number,
  operations: { face: boolean, voice: boolean }
): number => {
  // Base processing time in seconds
  let baseTime = 10;
  
  // Add time proportional to video length
  const videoFactor = videoLengthSeconds * 0.5;
  
  // Add time for each operation
  const operationTime = (operations.face ? 20 : 0) + (operations.voice ? 15 : 0);
  
  // Calculate total estimated time in seconds
  const totalEstimatedTime = baseTime + videoFactor + operationTime;
  
  return Math.max(15, Math.min(300, totalEstimatedTime));
};
