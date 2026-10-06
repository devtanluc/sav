import type { Session } from "@sav/auth";
import type { Database } from "@sav/db";

export type Context = {
  session: Session | null;
  db: Database;
};
