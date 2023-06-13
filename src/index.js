import {
  newClient,
  awaitMoreInput,
  onMessage,
  changeAvatar,
  changeDisplayname,
} from "matrix-bot-starter";

const client = await newClient();

onMessage(
  client,
  async (
    roomId,
    event,
    sender,
    content,
    body,
    requestEventId,
    isEdit,
    isHtml,
    mentioned
  ) => {
    const isInThread = content["m.relates_to"]?.rel_type === "m.thread";
    const threadId = content["m.relates_to"]?.event_id;

    if (isInThread && threadId) {
      const add = body.match(/\+\d+(\.\d\d?)?/);
      if (add) {
        const amount = parseFloat(add[0]);

        console.log(amount);
      }
    }

    if (isHtml) {
      if (mentioned) {
        let command = mentioned.toLowerCase();

        if (command.includes("picture") || command.includes("avatar")) {
          awaitMoreInput(
            client,
            roomId,
            event,
            true,
            {
              description: "avatar change",
              messageType: "m.image",
              functionToExecute: changeAvatar,
            },
            "Setting new avatar! If your next message is an image, I will update my avatar to that."
          );
        } else if (command.includes("name") || command.includes("handle")) {
          awaitMoreInput(
            client,
            roomId,
            event,
            true,
            {
              description: "display name change",
              messageType: "m.text",
              functionToExecute: changeDisplayname,
            },
            "Setting new display name! I'll set it to the contents of your next message."
          );
        } else {
          client.replyText(roomId, event, "Unknown command");
        }
      }
    }
  }
);

async function shutdown() {
  console.log("shutting down");
  client.stop();
  process.exit();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.once("SIGUSR2", shutdown);
