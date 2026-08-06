// Create fileUploadApi.ts
import { api } from './http';

export const uploadFileApi = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', file.entityType);
    formData.append('entityId', file.entityId || '');
    formData.append('isPublic', 'true');

    const res = await api.post('/files', formData);
    return res.data;
};

export const getFileUrlApi = (fileName) => {
    return `/api/files/serve/${fileName}`;
};

export const serveFileApi = async (fileName) => {
    const res = await fetch(`/api/files/serve/${fileName}`, {
        credentials: 'include',
    });
    if (!res.ok) {
        throw new Error(res.statusText || 'Failed to serve file');
    }
    return { data: await res.blob() };
};

export const downloadFileApi = async (fileName, downloadName = null) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('downloadFileApi can only be called in browser environment');
    }

    const response = await serveFileApi(fileName);
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName || fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const deleteFileApi = async (id) => {
    const res = await api.delete(`/files/${id}`);
    return res.data;
};

export const deleteFileByPathApi = async (path) => {
    const res = await api.delete(`/files/path/${path}`);
    return res.data;
};

export const deleteFileByNameApi = async (name) => {
    const res = await api.delete(`/files/${name}`);
    return res.data;
};

export const getAllFilesApi = async () => {
    const res = await api.get('/files');
    return res.data;
};

export const getFileByIdApi = async (id) => {
    const res = await api.get(`/files/${id}`);
    return res.data;
};

export const getFileByPathApi = async (path) => {
    const res = await api.get(`/files/path/${path}`);
    return res.data;
};

export const getFilePreviewUrl = (fileName: string, version?: string | number) => {
    if (fileName?.startsWith('/')) {
        if (version) {
            const separator = fileName.includes('?') ? '&' : '?';
            return `${fileName}${separator}v=${version}`;
        }
        return fileName;
    }
    if (version) {
        return `/api/files/serve/${fileName}?v=${version}`;
    }
    return `/api/files/serve/${fileName}`;
};

