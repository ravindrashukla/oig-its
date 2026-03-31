import type {
  EvidenceItem,
  ChainOfCustody,
  EvidenceFile,
  User,
} from "@/generated/prisma";
import type { PaginatedResponse, QueryFilters } from "@/types";

/** Evidence item with chain of custody and file counts */
export type EvidenceWithCustody = EvidenceItem & {
  chainOfCustody: (ChainOfCustody & {
    fromUser: Pick<User, "id" | "firstName" | "lastName"> | null;
    toUser: Pick<User, "id" | "firstName" | "lastName">;
  })[];
  _count: { files: number; chainOfCustody: number };
};

/** Evidence item with files included */
export type EvidenceWithFiles = EvidenceItem & {
  files: EvidenceFile[];
  chainOfCustody: (ChainOfCustody & {
    fromUser: Pick<User, "id" | "firstName" | "lastName"> | null;
    toUser: Pick<User, "id" | "firstName" | "lastName">;
  })[];
  _count: { files: number; chainOfCustody: number };
};

/** Paginated evidence list response */
export type EvidenceListResponse = PaginatedResponse<EvidenceWithCustody>;

/** Evidence list filters */
export interface EvidenceFilters extends QueryFilters {
  type?: string;
  status?: string;
}
