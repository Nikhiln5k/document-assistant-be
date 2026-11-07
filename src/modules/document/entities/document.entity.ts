import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentStatus {
  Processing = 'processing',
  Processed = 'processed',
  Failed = 'failed',
}

export enum DocumentFileType {
  Pdf = 'pdf',
  Excel = 'excel',
  Word = 'word',
  Image = 'image',
  Text = 'text',
}

@Entity({ name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', type: 'varchar', length: 20 })
  fileType: DocumentFileType;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  // bigint comes back from pg as a string; files here are far below Number.MAX_SAFE_INTEGER.
  @Column({
    name: 'file_size',
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  fileSize: number;

  @Column({ name: 'storage_path', type: 'varchar', length: 500, select: false })
  storagePath: string;

  @Column({ type: 'varchar', length: 20, default: DocumentStatus.Processing })
  status: DocumentStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'is_delete', type: 'integer', default: 0, select: false })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
