// Minimal typings for the part of better-sqlite3 used by lib/sync.ts (the package ships none).
declare module "better-sqlite3" {
  export default class Database {
    constructor(filename: string, options?: { readonly?: boolean; fileMustExist?: boolean });
    backup(destination: string): Promise<unknown>;
    close(): void;
  }
}
