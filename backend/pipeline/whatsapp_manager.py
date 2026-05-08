import pywhatkit
import pyautogui
import time
import logging
from datetime import datetime

logger = logging.getLogger("ADEO-WhatsApp")

class WhatsAppManager:
    def __init__(self):
        self.numbers = ["+919980819172", "+918267838362"]
        logger.info("WhatsApp Manager initialized for recipients: %s", self.numbers)

    def format_message(self, data: dict):
        """
        Formats the health data or returns a simple test message.
        """
        if data.get("is_test"):
            return data.get("message", "Hi")

        now = datetime.now().strftime("%H:%M")
        
        # Pull data from the provided dictionary
        sleep = data.get("sleep", "Optimized 7.5h sleep recommended.")
        activity = data.get("activity", "Target: 45 min Zone 2 Cardio.")
        meals = data.get("meals", "High protein, low carb lunch suggested.")
        rest = data.get("rest", "15 min active recovery at 4 PM.")
        
        message = (
            f"🚀 *ADEO Health Intelligence Update* [{now}]\n\n"
            f"📋 *YOUR DAILY ROUTINE*\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
            f"😴 *Sleep Plan*: {sleep}\n\n"
            f"🏃 *Activity*: {activity}\n\n"
            f"🥗 *Meal Plan*: {meals}\n\n"
            f"🧘 *Rest & Recovery*: {rest}\n\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"💪 _Stay healthy and consistent!_"
        )
        return message

    def send_instant_update(self, data: dict, target_number: str = None):
        """
        Sends the update using Clipboard + Paste for maximum speed and reliability.
        """
        import webbrowser
        import pyperclip
        
        message = self.format_message(data)
        
        # Copy to clipboard for instant pasting
        pyperclip.copy(message)
        
        # Use target_number if provided, else use default list
        numbers_to_send = [target_number] if target_number else ["9980819172", "8267838362"]
        
        for number in numbers_to_send:
            try:
                clean_number = ''.join(filter(str.isdigit, number))
                if len(clean_number) == 10:
                    clean_number = "91" + clean_number
                
                url = f"https://web.whatsapp.com/send?phone={clean_number}"
                
                logger.info("CLIPBOARD DISPATCH to %s", clean_number)
                webbrowser.open(url)
                
                # WAIT: 6 seconds (WhatsApp needs this time to "Start Chat" and focus the box)
                logger.info("Waiting 6 seconds for chat to initialize...")
                time.sleep(6)
                
                # PASTE AND SEND
                pyautogui.hotkey('ctrl', 'v')
                time.sleep(0.5)
                pyautogui.press('enter')
                
                logger.info("Message pasted and sent to %s", clean_number)
                
            except Exception as e:
                logger.error("Failed to send WhatsApp message to %s: %s", number, str(e))

    def simulate_demo(self, data: dict, phone: str = None):
        """
        Wrapper for simulation trigger.
        """
        logger.info("DEMO SIMULATION TRIGGERED for %s", phone)
        self.send_instant_update(data, phone)
