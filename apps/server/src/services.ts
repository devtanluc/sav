import { createAuth } from "@sav/auth";
import { createDb } from "@sav/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
