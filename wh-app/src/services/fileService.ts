import apiService from './apiService';

interface UploadFileResponse {
  success: boolean;
  file?: {
    id: number;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
  };
  message?: string;
}

class FileService {
  
  async uploadFile(
    uri: string,
    fileName: string,
    fileType: string,
  ): Promise<UploadFileResponse> {
    try {

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: fileType,
        name: fileName,
      } as any);

      const response = await apiService.uploadFormData(
        '/files/upload',
        formData,
      );

      if (response.success && response.data?.file) {
        return {
          success: true,
          file: response.data.file,
        };
      } else {
        console.error('[FileService] ❌ Upload failed:', response.message);
        return {
          success: false,
          message: response.message || 'Failed to upload file',
        };
      }
    } catch (error) {
      console.error('[FileService] ❌ Error uploading file:', error);
      return {
        success: false,
        message: 'Failed to upload file',
      };
    }
  }

  getSignedUrl(fileUrl: string): string {
    
    return fileUrl;
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  isImage(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  isPDF(fileType: string): boolean {
    return fileType === 'application/pdf';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

export default new FileService();
