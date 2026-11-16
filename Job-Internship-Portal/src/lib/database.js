import { TablesDB, Storage } from "appwrite";

import { client } from "./appwrite";

const tablesDB = new TablesDB(client);
const storage = new Storage(client);

export { tablesDB, storage };