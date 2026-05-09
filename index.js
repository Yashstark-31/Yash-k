import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import TelegramBot from "node-telegram-bot-api"
import P from "pino"
import fs from "fs"
import QRCode from "qrcode"

// PUT YOUR REAL TOKEN
const TELEGRAM_TOKEN = "8609490606:AAHML6QRRKHnJ3FV0vbLoFsl2gwv_GX1efc"
const bot = new TelegramBot(TELEGRAM_TOKEN, {
  polling: true
})

if (!fs.existsSync("./sessions")) {
  fs.mkdirSync("./sessions")
}

// START WHATSAPP

async function startWhatsApp(id) {

  const { state, saveCreds } =
    await useMultiFileAuthState(`./sessions/${id}`)

  const { version } =
    await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" }),
    browser: ["QRBot", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async ({ connection, qr }) => {

    // QR

    if (qr) {

      try {

        const qrImage =
          await QRCode.toBuffer(qr)

        await bot.sendPhoto(
          id,
          qrImage,
          {
            caption:
`📱 SCAN QR

WhatsApp
→ Linked Devices
→ Link Device
→ Scan QR`
          }
        )

      } catch (e) {

        console.log("QR ERROR:", e)

        await bot.sendMessage(
          id,
          "❌ QR Generate Failed"
        )
      }
    }

    // CONNECTED

    if (connection === "open") {

      console.log("CONNECTED")

      await bot.sendMessage(
        id,
        "✅ WhatsApp Connected"
      )
    }

    // CLOSED

    if (connection === "close") {


      setTimeout(() => {
        startWhatsApp(id)
      }, 5000)
    }
  })
}

// START COMMAND

bot.onText(/\/start/, async (msg) => {

  bot.sendMessage(
    msg.chat.id,
`🤖 WhatsApp QR Bot

/add - Generate QR`
  )
})

// ADD COMMAND

bot.onText(/\/add/, async (msg) => {

  const id = String(msg.chat.id)

  bot.sendMessage(
    id,
    "⌛ Generating QR..."
  )

  startWhatsApp(id)
})

console.log("✅ BOT STARTED")
