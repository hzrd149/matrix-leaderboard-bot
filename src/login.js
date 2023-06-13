import { MatrixAuth } from "matrix-bot-sdk";

const auth = new MatrixAuth(process.env.HOMESERVER_URL);
export const client = await auth.passwordLogin(
  process.env.BOT_USER,
  process.env.BOT_PASS,
  "nodejs"
);

console.log(
  "Copy this access token to your bot's config: ",
  client.accessToken
);
