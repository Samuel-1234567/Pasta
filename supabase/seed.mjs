/**
 * Dev seed: 2 auth users + profiles, 5 decks (split across users), 5 cards per deck.
 * Uses @supabase/supabase-js (Auth admin + PostgREST) + @faker-js/faker.
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY
 * Optional: SEED_USER_PASSWORD (default: DevSeedPassword123!)
 *
 * Run: npm run db:seed
 */

import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";

faker.seed(42_001);

const PROFILE_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
];

const SEED_EMAILS = [
  "seed.user.1@example.com",
  "seed.user.2@example.com",
];

const DECK_IDS = [
  "aaaaaaaa-aaaa-aaaa-aaaa-000000000001",
  "aaaaaaaa-aaaa-aaaa-aaaa-000000000002",
  "aaaaaaaa-aaaa-aaaa-aaaa-000000000003",
  "bbbbbbbb-bbbb-bbbb-bbbb-000000000001",
  "bbbbbbbb-bbbb-bbbb-bbbb-000000000002",
];

/** First 3 decks → user 0, last 2 → user 1 */
const DECK_PROFILE_INDEX = [0, 0, 0, 1, 1];

function cardId(deckIndex, position) {
  const n = deckIndex * 10 + position + 1;
  return `cccccccc-cccc-cccc-cccc-${String(n).padStart(12, "0")}`;
}

function dieFromSupabase(label, error) {
  console.error(label, error?.message ?? error);
  if (error?.details) console.error("details:", error.details);
  if (error?.hint) console.error("hint:", error.hint);
  process.exit(1);
}

/** deleteUser when the row is missing should not fail the seed */
function ignorableDeleteUserError(error) {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes("not found") ||
    m.includes("no rows") ||
    m.includes("user not found")
  );
}

async function main() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seedPassword =
    process.env.SEED_USER_PASSWORD ?? "DevSeedPassword123!";

  if (!supabaseUrl || !serviceRole) {
    console.error(
      "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: delCards } = await supabase
    .from("cards")
    .delete()
    .in("deck_id", DECK_IDS);
  if (delCards) dieFromSupabase("delete cards:", delCards);

  const { error: delDecks } = await supabase
    .from("decks")
    .delete()
    .in("id", DECK_IDS);
  if (delDecks) dieFromSupabase("delete decks:", delDecks);

  for (const id of PROFILE_IDS) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error && !ignorableDeleteUserError(error)) {
      dieFromSupabase(`delete auth user ${id}:`, error);
    }
  }

  const { error: delProfiles } = await supabase
    .from("profiles")
    .delete()
    .in("id", PROFILE_IDS);
  if (delProfiles) dieFromSupabase("delete profiles:", delProfiles);

  for (let i = 0; i < PROFILE_IDS.length; i++) {
    const { data, error } = await supabase.auth.admin.createUser({
      id: PROFILE_IDS[i],
      email: SEED_EMAILS[i],
      password: seedPassword,
      email_confirm: true,
      user_metadata: { seed_user: true },
    });
    if (error) dieFromSupabase(`create auth user ${SEED_EMAILS[i]}:`, error);
    if (!data?.user) dieFromSupabase(`create auth user ${SEED_EMAILS[i]}:`, new Error("no user returned"));
  }

  const profiles = PROFILE_IDS.map((id, i) => ({
    id,
    email: SEED_EMAILS[i],
    phone: i === 0 ? faker.phone.number() : null,
  }));

  const { error: upProfiles } = await supabase
    .from("profiles")
    .upsert(profiles, { onConflict: "id" });
  if (upProfiles) dieFromSupabase("upsert profiles:", upProfiles);

  const deckRows = DECK_IDS.map((id, d) => ({
    id,
    profile_id: profiles[DECK_PROFILE_INDEX[d]].id,
    name: `${faker.commerce.department()} — ${faker.word.words({ count: { min: 2, max: 4 } })}`,
    is_public: faker.datatype.boolean(),
  }));

  const { error: insDecks } = await supabase.from("decks").insert(deckRows);
  if (insDecks) dieFromSupabase("insert decks:", insDecks);

  const cardRows = [];
  for (let d = 0; d < DECK_IDS.length; d++) {
    const deckId = DECK_IDS[d];
    for (let pos = 0; pos < 5; pos++) {
      const front = faker.lorem
        .sentence({ min: 3, max: 8 })
        .replace(/\.$/, "");
      const back = faker.lorem.sentences({ min: 1, max: 2 });
      cardRows.push({
        id: cardId(d, pos),
        deck_id: deckId,
        front,
        back,
        position: pos,
      });
    }
  }

  const { error: insCards } = await supabase.from("cards").insert(cardRows);
  if (insCards) dieFromSupabase("insert cards:", insCards);

  console.log(
    `Seeded ${PROFILE_IDS.length} auth users + profiles, ${DECK_IDS.length} decks, ${cardRows.length} cards.`,
  );
  console.log(
    `Sign in: ${SEED_EMAILS.join(" / ")} — password from SEED_USER_PASSWORD or default DevSeedPassword123!`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
