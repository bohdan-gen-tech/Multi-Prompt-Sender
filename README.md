# Multi Prompt Sender

A Tampermonkey userscript that adds a powerful panel for sending sequences of prompts to multiple AI chat models automatically.

This tool is designed for AI researchers, developers, and power users who need to test and compare responses from various AI models. It automates the tedious process of sending the same prompts across different chats, allowing for efficient, parallel testing and analysis directly within the web interface.

## ✅ Features

<br>

### 🔬 Advanced Test Automation & Control

1.  **Automated Multi-Chat Execution:** Select multiple AI models and the script will automatically navigate to each chat, sending your predefined prompts in sequence.
2.  **Sequential Prompt Chains:** Configure a series of prompts, each with a custom message count and delay. The script executes all prompts for the first model before moving to the next, ensuring complete test cycles per model.
3.  **Dual Execution Modes:** Run a full test across all selected models, or use the **"Run in Opened Chat"** button for instant, focused testing on a single model without reloading the page.
4.  **Live Progress Tracking:** Monitor the testing process in real-time with a clear indicator showing the current model and task being executed.
5.  **Pre-Generation Admin Actions:** For users with appropriate privileges, the script provides powerful tools to manage pre-generated content for each model, including options to **"Restore"** or **"Delete"** it directly before a test run.

<br>

### 🏞️ Standalone Content Generation

1.  **Dedicated Generation Tabs:** Go beyond chat with specialized tabs for **Standalone Photo** and **Standalone Video** generation.
2.  **Multi-Model Batch Generation:** Automate the creation of photos and videos across multiple selected characters in a single, streamlined process.
3.  **Full Generation Control:** The system utilizes the same powerful prompt interface, allowing for custom prompts, specific generation counts (e.g., 16 photos, 4 videos), and delays between tasks.

<br>

### ⚙️ Powerful UI & Workflow Management

1.  **Interactive Control Panel:** A fully draggable and collapsible UI that stays on top of the page for easy access without disrupting your workflow.
2.  **Dynamic Model Parsing:** Automatically parses and lists all available AI models, grouping them into logical categories like **Realistic**, **Anime**, and **Custom Characters**.
3.  **Advanced Model Selection:** Select models individually, by group, or use the "Select All" functionality for maximum flexibility.
4.  **Drag-and-Drop Reordering:** Easily change the execution order of your prompts by simply dragging and dropping them within the UI.
5.  **Import & Export:** Save your complex prompt configurations (including prompts, counts, and delays) to an `.xlsx` file and easily import them back, streamlining repetitive testing sessions.
6.  **Built-in Model Search:** Quickly find specific models in long lists with the integrated search filter.

<br>

### ✨ Convenience & Customization

1.  **State Persistence:** The script remembers your workflow preferences, including the **panel's last position**, its **collapsed/expanded state**, and the **last active tab** (Chat, Photo, or Video).
2.  **Full Custom Character Support:** The script seamlessly integrates with user-created custom characters, automatically handling locked characters by unlocking them during the generation process.

---

## ⚠️ Security & Configuration Notice

For security reasons, the public version of this script has had sensitive information, such as **admin credentials** and potentially some **API endpoints**, removed or replaced with placeholders.

To enable all features (especially the Pre-Generation Admin Actions), you will need to manually edit the script and insert your own valid credentials.

1.  Open the installed script in the Tampermonkey editor.
2.  Navigate to the `APP_CONFIG` section at the top of the code.
3.  Fill in the `adminCreds` object with your own email and password:
    ```javascript
    adminCreds: {
        email: "YOUR_EMAIL_HERE",
        password: "YOUR_PASSWORD_HERE"
    }
    ```
4.  Verify that all API endpoints in `APP_CONFIG.api.endpoints` are correct for your environment.

Without this step, features requiring admin privileges will fail.

---

## 🔗 Installation

1.  Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2.  Click here to [Install the script](https://raw.githubusercontent.com/bohdan-gen-tech/Multi-Prompt-Sender/main/multi-prompt-sender.user.js).
3.  After installation, follow the steps in the **Security & Configuration Notice** above to configure the script.
