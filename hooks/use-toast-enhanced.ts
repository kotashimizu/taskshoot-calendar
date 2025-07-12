'use client';

import { useToast as useOriginalToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToastEnhanced() {
  const { toast } = useOriginalToast();

  const showSuccess = (
    message: string,
    options?: Omit<ToastOptions, 'variant'>
  ) => {
    logger.info(`Success toast: ${message}`);
    toast({
      title: options?.title || '成功',
      description: message,
      variant: 'default',
      duration: options?.duration || 3000,
    });
  };

  const showError = (
    message: string,
    error?: Error,
    options?: Omit<ToastOptions, 'variant'>
  ) => {
    logger.error(`Error toast: ${message}`, error);
    toast({
      title: options?.title || 'エラー',
      description: message,
      variant: 'destructive',
      duration: options?.duration || 5000,
    });
  };

  const showWarning = (
    message: string,
    options?: Omit<ToastOptions, 'variant'>
  ) => {
    logger.warn(`Warning toast: ${message}`);
    toast({
      title: options?.title || '警告',
      description: message,
      variant: 'default',
      duration: options?.duration || 4000,
    });
  };

  const showInfo = (
    message: string,
    options?: Omit<ToastOptions, 'variant'>
  ) => {
    logger.info(`Info toast: ${message}`);
    toast({
      title: options?.title || '情報',
      description: message,
      variant: 'default',
      duration: options?.duration || 3000,
    });
  };

  return {
    toast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
