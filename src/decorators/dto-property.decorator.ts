interface DtoPropertyOptions {
  /** Tipe spesifik untuk validasi, misal 'email', 'password', 'url' */
  type?: string;
  /**
   * Tentukan di DTO mana saja properti ini akan muncul.
   * Jika tidak disetel, akan muncul di semua DTO kecuali ada aturan lain.
   */
  scope?: ("create" | "update" | "patch")[];
  /**
   * Tentukan di DTO mana saja properti ini HARUS DIHILANGKAN.
   * Sangat berguna untuk menyembunyikan password di ResponseDTO.
   */
  exclude?: "response"[];
}

/**
 * Property decorator untuk memberikan metadata tambahan pada properti entity.
 */
export function DtoProperty(options?: DtoPropertyOptions): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
}
