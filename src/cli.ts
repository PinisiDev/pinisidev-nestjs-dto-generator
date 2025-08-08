#!/usr/bin/env node

import { Project, ClassDeclaration, PropertyDeclaration } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

// Fungsi utama yang membungkus semua logika
async function run() {
  // 1. Impor yargs secara dinamis di dalam fungsi async
  const { default: yargs } = await import("yargs");
  const { hideBin } = await import("yargs/helpers");

  // 2. Setup Yargs untuk argumen CLI
  const argv = await yargs(hideBin(process.argv))
    .option("path", {
      alias: "p",
      description: "Path ke direktori root proyek NestJS",
      type: "string",
      demandOption: true,
    })
    .help()
    .alias("help", "h").argv;

  const projectPath = path.resolve(process.cwd(), argv.path);
  console.log(`Menganalisis proyek di: ${projectPath}`);

  // Inisialisasi ts-morph
  const project = new Project();
  project.addSourceFilesAtPaths(`${projectPath}/src/**/*.entity.ts`);

  const sourceFiles = project.getSourceFiles();

  if (sourceFiles.length === 0) {
    console.log(
      "Tidak ada file *.entity.ts yang ditemukan. Pastikan file entity Anda sudah ada."
    );
    return;
  }
  console.log(`Menemukan ${sourceFiles.length} file entity.`);

  for (const sourceFile of sourceFiles) {
    // Cari class yang memiliki decorator @GenerateDto()
    const classWithDecorator = sourceFile
      .getClasses()
      .find((c) => c.getDecorator("GenerateDto") !== undefined);

    if (classWithDecorator) {
      console.log(`Memproses entity: ${classWithDecorator.getName()}`);
      await generateDtosForClass(classWithDecorator, project);
    }
  }

  await project.save();
  console.log("Pembuatan DTO selesai!");
}

// --- FUNGSI-FUNGSI HELPER ---
// (Tidak ada perubahan di sini, hanya dipindahkan agar rapi)

async function generateDtosForClass(
  classDeclaration: ClassDeclaration,
  project: Project
) {
  const className = classDeclaration.getName()!;
  const modulePath = path.dirname(
    classDeclaration.getSourceFile().getFilePath()
  );
  // Asumsi struktur folder: src/modules/{moduleName}/entities/{entityName}.entity.ts
  const dtoPath = path.join(modulePath, "..", "dto");

  if (!fs.existsSync(dtoPath)) {
    fs.mkdirSync(dtoPath, { recursive: true });
  }

  const allProperties = classDeclaration.getProperties();

  // 1. Generate CreateDTO
  const createProperties = allProperties.filter(
    (p) => !isExcluded(p, "create")
  );
  await generateDtoFile(
    project,
    dtoPath,
    className,
    "Create",
    createProperties
  );

  // 2. Generate UpdateDTO/PatchDTO
  await generatePartialDtoFile(project, dtoPath, className, "Update");

  // 3. Generate ResponseDTO
  if (classDeclaration.getDecorator("GenerateResponseDto")) {
    const responseProperties = allProperties.filter(
      (p) => !isExcluded(p, "response")
    );
    await generateDtoFile(
      project,
      dtoPath,
      className,
      "Response",
      responseProperties,
      { isResponseDto: true }
    );
  }
}

async function generateDtoFile(
  project: Project,
  dtoPath: string,
  className: string,
  dtoType: "Create" | "Response",
  properties: PropertyDeclaration[],
  options: { isResponseDto?: boolean } = {}
) {
  const singularName = className.toLowerCase();
  let content = `import { IsString, IsInt, IsOptional, IsEmail, IsBoolean, IsDateString } from 'class-validator';\n\n`;
  content += `export class ${dtoType}${className}Dto {\n`;

  properties.forEach((prop) => {
    if (!options.isResponseDto) {
      const validationDecorators = getPropertyValidation(prop);
      if (validationDecorators) {
        content += `  ${validationDecorators}\n`;
      }
    }
    content += `  ${prop.getText()}\n\n`;
  });

  content += `}\n`;
  project.createSourceFile(
    path.join(dtoPath, `${dtoType.toLowerCase()}-${singularName}.dto.ts`),
    content,
    { overwrite: true }
  );
}

async function generatePartialDtoFile(
  project: Project,
  dtoPath: string,
  className: string,
  dtoType: "Update" | "Patch"
) {
  const singularName = className.toLowerCase();
  let content = `import { PartialType } from '@nestjs/mapped-types';\n`;
  content += `import { Create${className}Dto } from './create-${singularName}.dto';\n\n`;
  content += `export class ${dtoType}${className}Dto extends PartialType(Create${className}Dto) {}\n`;

  project.createSourceFile(
    path.join(dtoPath, `${dtoType.toLowerCase()}-${singularName}.dto.ts`),
    content,
    { overwrite: true }
  );
}

function isExcluded(
  prop: PropertyDeclaration,
  dtoType: "create" | "response"
): boolean {
  if (
    dtoType === "create" &&
    (prop.getName() === "id" ||
      prop
        .getDecorators()
        .some((d) => d.getName() === "PrimaryGeneratedColumn"))
  ) {
    return true;
  }

  const decorator = prop.getDecorator("DtoProperty");
  if (!decorator) return false;

  const optionsText = decorator.getArguments()[0]?.getText();
  if (!optionsText) return false;

  if (
    optionsText.includes(`exclude:`) &&
    optionsText.includes(`'${dtoType}'`)
  ) {
    return true;
  }

  if (optionsText.includes("scope:")) {
    if (!optionsText.includes(`'${dtoType}'`)) {
      return true;
    }
  }

  return false;
}

function getPropertyValidation(prop: PropertyDeclaration): string {
  const type = prop
    .getType()
    .getText()
    .replace(/ \| null \| undefined/g, "");
  const isOptional = prop.hasQuestionToken() || prop.getType().isNullable();

  let validators: string[] = [];

  if (isOptional) {
    validators.push("@IsOptional()");
  }

  switch (type) {
    case "string":
      const dtoPropDecorator = prop.getDecorator("DtoProperty");
      const options = dtoPropDecorator?.getArguments()[0]?.getText();
      if (options?.includes(`type: 'email'`)) {
        validators.push("@IsEmail()");
      } else {
        validators.push("@IsString()");
      }
      break;
    case "number":
      validators.push("@IsInt()");
      break;
    case "boolean":
      validators.push("@IsBoolean()");
      break;
    case "Date":
      validators.push("@IsDateString()");
      break;
    default:
      break;
  }

  if (validators.length === 0) {
    return "";
  }

  if (validators.length === 1 && validators[0] === "@IsOptional()") {
    // Jangan tambahkan @IsOptional() jika tidak ada validator lain
    const nonValidationTypes = ["string", "number", "boolean", "Date"];
    if (!nonValidationTypes.includes(type)) return "";
  }

  return validators.join("\n  ");
}

// Panggil fungsi pembungkus `run` dan tangani error
run().catch((error) => {
  console.error("Terjadi kesalahan fatal saat menjalankan generator:", error);
  process.exit(1);
});
