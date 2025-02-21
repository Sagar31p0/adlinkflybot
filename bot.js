import logging
import re
import requests
import asyncio
import nest_asyncio
from telegram import Update, InputMediaPhoto, InputMediaVideo
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackContext

# Apply fix for nested event loops in Termux
nest_asyncio.apply()

# Telegram Bot Token
BOT_TOKEN = "7943230538:AAHJJVCExBMGJ-oBiSvhf5z4HlWk0rGNP54"

# Terabox Link Generator API
TERABOX_API = "https://teradisk.xyz/admin/gen.php?gen_url=true&terabox_url="

# Logging Setup
logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# Terabox Regex Pattern
TERABOX_REGEX = r"https?:\/\/(?:www\.)?(?:terabox|1024terabox)\.com\/s\/\S+"

# Fancy Fonts
BOLD = lambda text: f"*{text}*"
ITALIC = lambda text: f"_{text}_"
MONOSPACE = lambda text: f"`{text}`"

async def start(update: Update, context: CallbackContext) -> None:
    """Handles /start command"""
    text = f"""
{BOLD("Welcome to the Terabox Link Converter! 🚀")}
{ITALIC("Send me a video URL, and I'll generate a stream link for you.")}
    
🔹 {BOLD("Supported Links:")}
  - Terabox
  - 1024terabox

📥 {BOLD("Just send me a link, and I'll do the rest!")}
"""
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)

async def handle_message(update: Update, context: CallbackContext) -> None:
    """Processes incoming messages (text, images, videos)"""
    message = update.message
    chat_id = message.chat_id
    text = message.text or message.caption or ""

    # Handle Images & Videos
    if message.photo:
        await message.reply_text("🖼️ You sent an image! Currently, I only process video links.")
        return
    elif message.video:
        await message.reply_text("🎥 You sent a video! Currently, I only process video links.")
        return

    # Find Terabox links
    links = re.findall(TERABOX_REGEX, text, re.IGNORECASE)
    
    if not links:
        await message.reply_text("❌ No valid Terabox links found. Please send a correct link.")
        return

    # Send a waiting message
    waiting_message = await message.reply_text("🔄 *Generating stream links...*\nPlease wait a moment ⏳", parse_mode=ParseMode.MARKDOWN)

    # Convert Links
    converted_links = {}
    for link in links:
        try:
            response = requests.get(f"{TERABOX_API}{link}", timeout=10)
            if response.status_code == 200 and response.text.strip():
                converted_links[link] = response.text.strip()
        except Exception as e:
            logger.error(f"Error converting link {link}: {e}")

    if not converted_links:
        await waiting_message.edit_text("❌ *Failed to convert links.*\nPlease try again later.", parse_mode=ParseMode.MARKDOWN)
        return

    # Replace original links with converted ones
    final_text = text
    for original, converted in converted_links.items():
        final_text = final_text.replace(original, f"🔗 {MONOSPACE(converted)}")

    # Edit the waiting message with the final result
    await waiting_message.edit_text(f"✅ *Here are your converted links:*\n{final_text}", parse_mode=ParseMode.MARKDOWN)

async def main():
    """Main function to start the bot"""
    app = Application.builder().token(BOT_TOKEN).build()
    
    # Handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT | filters.PHOTO | filters.VIDEO, handle_message))
    
    # Start the bot
    logger.info("Bot is running... 🚀")
    await app.run_polling()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
