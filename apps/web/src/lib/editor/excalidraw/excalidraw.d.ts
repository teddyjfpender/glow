/**
 * Type declarations to fix missing types in Excalidraw dependencies
 */

declare module 'browser-fs-access' {
  export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
  }

  export const supported: boolean;
}
