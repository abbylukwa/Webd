import { db } from "../src/lib/db";
async function main() {
  await db.setting.update({ where: { id: "singleton" }, data: { pace: 6 } });
  const s = await db.setting.findUnique({ where: { id: "singleton" } });
  console.log("pace restored to", s?.pace);
}
main().then(() => process.exit(0));
