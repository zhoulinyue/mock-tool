declare module 'lowdb' {
  interface LowdbAsync<T> {
    get(collection: string): any;
    defaults(defaults: any): LowdbAsync<T>;
    write(): void;
    value(): T;
  }
  function low(adapter: any): LowdbAsync<any>;
  export = low;
}

declare module 'lowdb/adapters/FileSync' {
  class FileSync {
    constructor(filename: string);
  }
  export = FileSync;
}