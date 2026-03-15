import { toast } from 'sonner';

export { toast };

/**
 * Wraps a promise with loading / success / error toasts.
 * The error message falls back to the Error's message if no custom error string is given.
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error?: string },
): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (e: unknown) =>
      messages.error ?? (e instanceof Error ? e.message : 'An error occurred'),
  });
  return promise;
}
