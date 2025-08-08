# NestJS DTO Generator

[![npm version](https://badge.fury.io/js/your-package-name.svg)](https://badge.fury.io/js/your-package-name)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sebuah tool CLI yang powerful untuk secara otomatis menghasilkan _Data Transfer Objects_ (DTOs) dari class Entity Anda di proyek NestJS. Ucapkan selamat tinggal pada pembuatan DTO manual yang membosankan dan rawan kesalahan. Cukup hiasi entity Anda, jalankan satu perintah, dan biarkan generator melakukan sisanya.

Generator ini secara cerdas akan membuat DTO untuk operasi `Create`, `Update` (dengan `PartialType`), dan `Response`, lengkap dengan decorator validasi dari `class-validator`.

## Fitur Utama

- **Otomatisasi Penuh**: Generate `Create`, `Update`, dan `Response` DTO dari satu sumber kebenaran (class Entity).
- **Validasi Cerdas**: Secara otomatis menambahkan decorator `class-validator` (`@IsString`, `@IsEmail`, `@IsInt`, `@IsOptional`, dll.) berdasarkan tipe data properti.
- **Konfigurasi Fleksibel**: Kontrol properti mana yang muncul di DTO tertentu menggunakan decorator `@DtoProperty` yang intuitif.
- **Struktur Rapi**: Menempatkan file DTO yang dihasilkan di dalam struktur folder modul yang sudah ada (`src/modules/{namaModul}/dto/`).
- **Integrasi Mulus**: Bekerja dengan baik dengan entity dari berbagai ORM seperti TypeORM.

---

## Instalasi

Install package menggunakan npm atau yarn:

```bash
npm install pinisidev-nestjs-dto-generator --save-dev
```

atau

```bash
yarn add pinisidev-nestjs-dto-generator --dev
```

> **Catatan:** Disarankan untuk menginstalnya sebagai _dev dependency_ karena ini adalah tool untuk development.

## Setup

Untuk kemudahan penggunaan, tambahkan skrip berikut ke dalam file `package.json` proyek NestJS Anda.

**`package.json`**

```json
{
  "scripts": {
    // ... skrip Anda yang lain
    "dto:gen": "generate-dtos --path ."
  }
}
```

Perintah ini akan menjalankan generator dan menganalisis semua file `*.entity.ts` di dalam direktori `src/` proyek Anda.

---

kemudian tambahkan config di root project kalian
**`.dtogenrc.json`**

```json
{
  "suffixes": [".entity", ".schema", ".model", ".data"]
}
```

## Panduan Penggunaan

Penggunaan generator ini sangat mudah dan hanya terdiri dari dua langkah.

### Langkah 1: Hiasi Class Entity Anda

Impor dan gunakan decorator yang disediakan di dalam file entity Anda.

**Contoh: `src/modules/users/entities/user.entity.ts`**

```typescript
import {
  GenerateDto,
  GenerateResponseDto,
  DtoProperty,
} from "your-package-name";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Menandai class ini untuk pembuatan Create/Update DTO
@GenerateDto()
// Menandai class ini untuk pembuatan Response DTO
@GenerateResponseDto()
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @DtoProperty({ type: "email" }) // Menambahkan validasi @IsEmail()
  email: string;

  @Column()
  @DtoProperty({ exclude: ["response"] }) // Sembunyikan properti ini dari Response DTO
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  bio?: string; // Properti opsional akan otomatis mendapatkan @IsOptional()

  @Column()
  @DtoProperty({ scope: ["create"] }) // Properti ini hanya akan muncul di CreateUserDto
  invitationCode: string;
}
```

### Langkah 2: Jalankan Generator

Jalankan skrip yang telah Anda tambahkan di `package.json`.

```bash
npm run dto:gen
```

### Hasil

Generator akan secara otomatis membuat file-file berikut:

`src/modules/users/dto/`
├── `create-user.dto.ts`
├── `update-user.dto.ts`
└── `response-user.dto.ts`

**Contoh Isi `create-user.dto.ts`:**

```typescript
import {
  IsString,
  IsInt,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsDateString,
} from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  passwordHash: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsString()
  invitationCode: string;
}
```

---

## Konfigurasi Decorator

### `@GenerateDto()`

Decorator level class yang menandai sebuah entity untuk diproses oleh generator. Akan menghasilkan DTO untuk operasi `create` dan `update`.

### `@GenerateResponseDto()`

Decorator level class opsional. Jika digunakan, generator akan membuat DTO `Response` tambahan yang ideal untuk data yang dikirim kembali oleh API.

### `@DtoProperty(options?: DtoPropertyOptions)`

Decorator level properti untuk kontrol yang lebih mendalam.

**Opsi:**
| Properti | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `type` | `'email'`, `'password'`, `'url'`, dll. | (Opsional) Memberikan petunjuk untuk validasi yang lebih spesifik. Saat ini mendukung `'email'`. |
| `scope` | `('create' \| 'update')[]` | (Opsional) Daftar DTO di mana properti ini **hanya** akan disertakan. Jika tidak disetel, properti akan disertakan di semua DTO (kecuali di-exclude). |
| `exclude`| `('response')[]` | (Opsional) Daftar DTO di mana properti ini akan **dihilangkan**. Sangat berguna untuk menyembunyikan data sensitif seperti password dari `Response` DTO. |

---

## Lisensi

Didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.
