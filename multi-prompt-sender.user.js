// ==UserScript==
// @name         Multi Prompt Sender
// @namespace    https://github.com/bohdan-gen-tech
// @version      2025.08.22.1
// @description  Auto prompt/gift sender in chats, with custom character support and generation tools. Won't run in iframe.
// @author       Bohdan S.
// @match        *://*/*
// @icon         https://cdn-icons-png.flaticon.com/512/5962/5962463.png
// @require      https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bohdan-gen-tech/Multi-Prompt-Sender/main/multi-prompt-sender.user.js
// @downloadURL  https://raw.githubusercontent.com/bohdan-gen-tech/Multi-Prompt-Sender/main/multi-prompt-sender.user.js
// ==/UserScript==

(function() {
    'use strict';

    if (window.self !== window.top) {
        return;
    }

    // ===================================================================================
    // --- APPLICATION CONFIGURATION ---
    // All script settings, API endpoints, selectors, and other constants.
    // ===================================================================================
    const APP_CONFIG = {
        api: {
            baseUrl: () => location.origin,
            endpoints: {
                topModels: '/api/PersonModel/top',
                customModels: '/api/PersonModel/get-created-persons',
                login: '/api/?', // add route
                restorePregens: (userId, personId) => `/api/?userId=${userId}&personId=${personId}`, //add valid route
                deletePregens: '/api/?' // add valid route
            },
            adminCreds: {
                email: "", //add creds
                password: "" // ad creds
            }
        },
        storageKeys: {
            position: 'honeyTesterPosition',
            collapsed: 'honeyTesterCollapsed',
            activeTab: 'honeyTesterActiveTab',
            models: 'honeyModels',
            tasks: 'honeyTasks',
            modelSelection: 'honeyModelSelection',
            queue: 'honeyQueue',
            completed: 'honeyCompleted',
            testInProgress: 'honeyTestInProgress',
            photoGenQueue: 'honeyPhotoGenQueue',
            photoGenInProgress: 'honeyPhotoGenInProgress',
            videoGenQueue: 'honeyVideoGenQueue',
            videoGenInProgress: 'honeyVideoGenInProgress',
            giftQueue: 'honeyGiftQueue',
            giftInProgress: 'honeyGiftInProgress',
            preGenAction: 'honeyPreGenAction',
            testCompletedFlag: 'honeyTestCompletedFlag',
            persistAuth: 'persist:auth',
            persistUser: 'persist:user',
        },
        selectors: {
            chat: {
                textarea: '#chat_field',
                unlockPremium: '#unlock_premium',
                unlockChatBtnXpath: "//button[@id='unlock_chat_btn']",
            },
            photoGen: {
                chooseCharBtn: '#choose_character_btn',
                myAiCategoryBtnXpath: "//button[@id='photo_generation_category_myAi_btn']",
                animeCategoryBtn: '#photo_generation_category_anime_btn',
                realisticCategoryBtn: '#photo_generation_category_realistic_btn',
                modelSelectScrollContainer: '._container_25gb1_9',
                modelSelectBtnXpath: (firstName) => `//p[contains(text(),"${firstName}")]/following-sibling::button`,
                confirmSelectBtn: '#photo_generation_choose_character_select_btn',
                promptTextarea: '#photo_generation_prompt_textarea',
                generateBtn: '#generate_image_btn',
                countBtnPrefix: '#images_number_',
            },
            videoGen: {
                generateBtn: '#generate_video_btn',
                countBtnPrefix: '#videos_number_',
            },
            gifts: {
                openGiftListBtnXpath: "//button[@type='button']", // Note: This selector is generic and might need adjustment for the specific website.
                giftItemXpath: (index) => `//div[@role='presentation']//li[${index}]`,
                sendGiftBtn: "#send_gift_btn",
            }
        },
        modelGroups: [
            'Realistic', 'Anime', 'Inclusive Models', 'Custom Characters'
        ],
        inclusiveModels: new Set([
            "Ruby O’Neil", "Emily Harper", "Evelyn Carter",
            "Maya Tanaka", "Sakura Mizuki", "Liora Starleaf",
            "Li Cheng", "Clestia Clair", "Trixie Glimmer"
        ]),
        delays: {
            waitFor: 300,
            scroll: 500,
            general: 200,
            short: 500,
            long: 3000,
            uiUpdate: 500,
            init: 1000
        },
        siteHostname: "get-honey"
    };

    // ===================================================================================
    // --- VISUAL DATA & UI CONSTANTS ---
    // All UI-related strings, class names, icons, and styles.
    // ===================================================================================
    const VISUAL_DATA = {
        icons: {
            import: '📥',
            export: '📤',
            collapse: '−',
            expand: '⊞',
            close: '×',
            add: '+',
            remove: '✕',
            dragHandle: '&#8942;',
            update: '♻️',
            goto: '→',
            detailsOpen: '▶',
            completed: '✔',
        },
        text: {
            panelTitle: 'MultiChat Prompt Sender',
            importTitle: 'Import Prompts',
            exportTitle: 'Export Prompts',
            collapseTitle: 'Collapse',
            expandTitle: 'Expand',
            closeTitle: 'Close',
            parseModels: 'Parse Models',
            addPrompt: '+ Add Prompt',
            tabChats: 'Chats',
            tabGifts: 'Gifts',
            tabPhoto: 'Standalone Photo',
            tabVideo: 'Standalone Video',
            pregenNone: 'None',
            pregenRestore: 'Restore Pre-gens',
            pregenDelete: 'Delete Pre-gens',
            searchPlaceholder: '🔎 Search for model...',
            selectAll: 'Select All',
            updateList: '♻️ Update List',
            updateListTitle: 'Update Model List',
            runSelected: 'Run in selected chat(s)',
            runHere: 'Run in opened chat',
            runGifts: 'Send Gift(s) to selected',
            runHereGifts: 'Send in opened chat',
            runPhotoGen: 'Run Photo Generation',
            runVideoGen: 'Run Video Generation',
            startNewTest: 'Start New Test',
            cancelTest: 'Cancel Test',
            loading: '<em>Loading...</em>',
            dragReorderTitle: 'Drag to reorder',
            promptPlaceholder: 'Chat/Gift Prompt',
            countPlaceholder: '#',
            countTitle: 'Number of messages / Gifts / Generations',
            delayPlaceholder: '⏱',
            delayTitle: 'Delay between tasks/models (in seconds)',
            removePromptTitle: 'Remove this prompt',
            gotoChatTitle: 'Go to chat',
            testCompleted: 'Test completed in chat(s)',
            giftsCompleted: 'Gift sending complete!',
            photoGenCompleted: 'Photo Gen complete!',
            videoGenCompleted: 'Video Gen complete!',
        },
        classes: {
            panel: 'honey-panel',
            header: 'honey-panel-header',
            title: 'honey-panel-header-title',
            controls: 'honey-panel-controls',
            headerBtn: 'honey-panel-header-btn',
            body: 'honey-panel-body',
            btn: 'honey-btn',
            btnRow: 'honey-btn-row',
            runChatsBtn: 'run-chats-btn',
            runHereBtn: 'run-here-btn',
            runGiftsBtn: 'run-gifts-btn',
            runHereGiftsBtn: 'run-here-gifts-btn',
            photoGenBtn: 'photo-gen-btn',
            videoGenBtn: 'video-gen-btn',
            cancelBtn: 'cancel-btn',
            addPromptBtn: 'add-prompt-btn',
            input: 'honey-input',
            listContainer: 'honey-list-container',
            promptsContainer: 'honey-prompts-container',
            row: 'honey-row',
            listToolbar: 'honey-list-toolbar',
            modelTypeLabel: 'honey-model-type-label',
            modelStatusLabel: 'honey-model-status-label',
            summaryLabel: 'summary-label',
            summaryCounter: 'summary-counter',
            groupHeader: 'honey-group-header',
            promptEntry: 'prompt-entry',
            dragging: 'dragging',
            dragHandle: 'drag-handle',
            removePromptBtn: 'remove-prompt-btn',
            taskProgress: 'task-progress-indicator',
            current: 'current',
            completed: 'completed',
            progressIcon: 'progress-icon',
            hidden: 'honey-hidden',
            gotoBtn: 'honey-goto-btn',
            tabContainer: 'honey-tab-container',
            tabBtn: 'honey-tab-btn',
            active: 'active',
            tabContent: 'honey-tab-content',
            radioContainer: 'honey-radio-container',
            promptInput: 'prompt-input',
            countInput: 'count-input',
            delayInput: 'delay-input',
            modelCheckbox: 'model-checkbox',
        },
        styles: () => `
            .honey-panel { position: fixed; bottom: 20px; right: 20px; background-color: #1a1c20; color: #e0e0e0; border: 1px solid #333; border-radius: 8px; padding: 0; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.5); width: 350px; font-family: 'Inter', 'Segoe UI', sans-serif; overflow: hidden; font-size: 11px; }
            .honey-panel-header { display: flex; align-items: center; justify-content: space-between; background: #111; padding: 0 8px 0 12px; margin: 0; border-bottom: 1px solid #444; height: 28px; cursor: move; user-select: none; }
            .honey-panel-header-title { font-weight: bold; font-family: monospace; }
            .honey-panel-controls { display: flex; align-items: center; height: 100%; gap: 4px; }
            .honey-panel-header-btn { border: none; background: transparent; color: #aaa; cursor: pointer; font-size: 16px; line-height: 1; transition: all 0.2s; width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
            .honey-panel-header-btn:hover { color: #fff; background-color: #2f3136; }
            .honey-panel-body { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
            .honey-btn { width: 100%; padding: 7px; cursor: pointer; border-radius: 5px; border: 1px solid transparent; color: #fff; font-size: 11px; font-weight: bold; transition: background-color 0.2s, opacity 0.2s, filter 0.2s;}
            .honey-btn:disabled { background-color: #555 !important; border-color: #555 !important; opacity: 0.6; cursor: not-allowed; font-size: 11px;}
            .honey-btn:not(:disabled):hover { filter: brightness(80%); }
            .honey-btn-row { display: flex; gap: 8px; }
            .honey-btn.run-chats-btn { background-color: #9F48B1; }
            .honey-btn.run-here-btn { background-color: #f0ad4e; }
            .honey-btn.run-gifts-btn { background-color: #2a75bb; }
            .honey-btn.run-here-gifts-btn { background-color: #f0ad4e; }
            .honey-btn.photo-gen-btn { background-color: #9b59b6; }
            .honey-btn.video-gen-btn { background-color: #3498db; }
            .honey-btn.cancel-btn { background-color: #d9534f; }
            .honey-btn.add-prompt-btn { background-color: #5cb85c; margin-top: 2px; padding: 5px; }
            .honey-input { flex: 1; padding: 5px 5px; background: #2c2f33; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; font-size: 11px;}
            .honey-input::placeholder { color: #888; }
            .honey-prompts-container { max-height: 170px; overflow-y: auto; overflow-x: hidden; padding-right: 5px; }
            .honey-list-container { max-height: 220px; overflow-y: auto; background: #25282c; padding: 8px; border-radius: 6px; border: 1px solid #333; }
            .honey-row { display: flex; align-items: center; padding: 3px; border-radius: 4px; transition: background-color 0.2s; }
            .honey-list-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 8px; }
            .honey-row:hover { background-color: #33373c; }
            .honey-row label { margin-left: 6px; cursor: pointer; flex-grow: 1; transition: color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .honey-model-type-label, .honey-model-status-label { font-size: 9px; margin-left: 8px; font-style: italic; color: #888; }
            .honey-model-status-label { font-weight: bold; color: #aaa; }
            details { margin-top: 5px; }
            details summary { cursor: pointer; font-weight: bold; padding: 5px; border-radius: 4px; display: flex; align-items: center; list-style: none; }
            details summary:hover { background-color: #33373c; }
            details summary::before { content: '${VISUAL_DATA.icons.detailsOpen}'; font-size: 9px; margin-right: 8px; transition: transform 0.2s; }
            details[open] > summary::before { transform: rotate(90deg); }
            .summary-label { margin-left: 6px; cursor: pointer; }
            .summary-counter { margin-left: auto; color: #999; padding-right: 5px;}
            .honey-group-header { font-weight: bold; padding: 6px 4px; margin-top: 5px; border-bottom: 1px solid #333; }
            .prompt-entry { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; border-radius: 4px; }
            .prompt-entry.dragging { opacity: 0.4; background: #33373c; }
            .drag-handle { font-size: 14px; font-weight: bold; color: #FFFFFF; cursor: move; padding: 0; opacity: 1; transition: opacity 0.2s; user-select: none; }
            .remove-prompt-btn { background: #d9534f; border: none; color: white; border-radius: 4px; cursor: pointer; width: 20px; height: 27px; font-size: 11px; font-weight: bold; flex-shrink: 0; padding: 5px; margin:0; display:flex; align-items:center; justify-content:center; }
            .task-progress-indicator { text-align: center; font-weight: bold; padding: 4px; background-color: #2c2f33; border-radius: 4px; margin-bottom: 8px; }
            .honey-row.current { background-color: #00aaff22; border-left: 3px solid #00aaff; padding-left: 1px;}
            .honey-row.completed .progress-icon::before { content: '${VISUAL_DATA.icons.completed}'; color: #28a745; margin-right: 6px; font-weight: bold; }
            .honey-row.completed label { color: #777; text-decoration: line-through; }
            .honey-panel .honey-hidden { display: none !important; }
            .honey-goto-btn { display: flex; align-items: center; justify-content: center; text-decoration: none; color: #aaa; background-color: #3a3f44; border: 1px solid #555; border-radius: 4px; width: 20px; height: 20px; margin-left: auto; flex-shrink: 0; transition: all 0.2s; }
            .honey-goto-btn:hover { background-color: #00aaff; color: #fff; }
            .honey-tab-container { display: flex; border: 1px solid #00aaff44; border-radius: 6px; background-color: #111; padding: 2px; box-shadow: 0 0 8px #00aaff22; }
            .honey-tab-btn { flex: 1; padding: 6px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #aaa; cursor: pointer; font-size: 10px; font-weight: bold; transition: all 0.2s; }
            .honey-tab-btn:hover { background: #33373c; color: #fff; }
            .honey-tab-btn.active { color: #fff; border-bottom-color: #00aaff; background: #25282c; }
            .honey-tab-content { display: none; padding-top: 8px; }
            .honey-tab-content.active { display: block; }
            .honey-radio-container { display: flex; justify-content: space-around; background-color: #25282c; border-radius: 6px; padding: 4px; margin-bottom: 8px; border: 1px solid #333;}
            .honey-radio-container label { display: flex; align-items: center; cursor: pointer; font-size: 10px; color: #aaa; flex: 1; justify-content: center; padding: 2px 4px; border-radius: 4px; transition: all 0.2s;}
            .honey-radio-container input { display: none; }
            .honey-radio-container input:checked + label { background-color: #00aaff; color: #fff; font-weight: bold;}
            .honey-radio-container label:hover { background-color: #33373c; }
        `,
    };

    // --- GLOBAL STATE ---
    let testCancelled = false;
    let panelClosedByUser = false;
    let isHandlingRedirect = false;
    let activeTab;
    let draggedItem = null;
    let panelElements;
    let adminTokenCache = null;

    // --- STATE & STORAGE HELPERS ---
    const S = {
        models: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.models) || 'null'),
        saveModels: (m) => sessionStorage.setItem(APP_CONFIG.storageKeys.models, JSON.stringify(m)),
        tasks: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.tasks) || '[]'),
        saveTasks: (t) => sessionStorage.setItem(APP_CONFIG.storageKeys.tasks, JSON.stringify(t)),
        modelSelection: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.modelSelection) || '[]'),
        saveModelSelection: (m) => sessionStorage.setItem(APP_CONFIG.storageKeys.modelSelection, JSON.stringify(m)),
        queue: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.queue) || '[]'),
        saveQueue: (q) => sessionStorage.setItem(APP_CONFIG.storageKeys.queue, JSON.stringify(q)),
        completed: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.completed) || '[]'),
        saveCompleted: (c) => sessionStorage.setItem(APP_CONFIG.storageKeys.completed, JSON.stringify(c)),
        isTesting: () => sessionStorage.getItem(APP_CONFIG.storageKeys.testInProgress) === 'true',
        startTesting: () => sessionStorage.setItem(APP_CONFIG.storageKeys.testInProgress, 'true'),
        clearTestProgress: () => {
            [APP_CONFIG.storageKeys.queue, APP_CONFIG.storageKeys.completed, APP_CONFIG.storageKeys.testInProgress, APP_CONFIG.storageKeys.preGenAction].forEach(k => sessionStorage.removeItem(k));
        },
        photoGenQueue: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.photoGenQueue) || '[]'),
        savePhotoGenQueue: (q) => sessionStorage.setItem(APP_CONFIG.storageKeys.photoGenQueue, JSON.stringify(q)),
        isPhotoGening: () => sessionStorage.getItem(APP_CONFIG.storageKeys.photoGenInProgress) === 'true',
        startPhotoGening: () => sessionStorage.setItem(APP_CONFIG.storageKeys.photoGenInProgress, 'true'),
        clearPhotoGenProgress: () => {
            [APP_CONFIG.storageKeys.photoGenQueue, APP_CONFIG.storageKeys.photoGenInProgress].forEach(k => sessionStorage.removeItem(k));
        },
        videoGenQueue: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.videoGenQueue) || '[]'),
        saveVideoGenQueue: (q) => sessionStorage.setItem(APP_CONFIG.storageKeys.videoGenQueue, JSON.stringify(q)),
        isVideoGening: () => sessionStorage.getItem(APP_CONFIG.storageKeys.videoGenInProgress) === 'true',
        startVideoGening: () => sessionStorage.setItem(APP_CONFIG.storageKeys.videoGenInProgress, 'true'),
        clearVideoGenProgress: () => {
            [APP_CONFIG.storageKeys.videoGenQueue, APP_CONFIG.storageKeys.videoGenInProgress].forEach(k => sessionStorage.removeItem(k));
        },
        giftQueue: () => JSON.parse(sessionStorage.getItem(APP_CONFIG.storageKeys.giftQueue) || '[]'),
        saveGiftQueue: (q) => sessionStorage.setItem(APP_CONFIG.storageKeys.giftQueue, JSON.stringify(q)),
        isGifting: () => sessionStorage.getItem(APP_CONFIG.storageKeys.giftInProgress) === 'true',
        startGifting: () => sessionStorage.setItem(APP_CONFIG.storageKeys.giftInProgress, 'true'),
        clearGiftProgress: () => {
            [APP_CONFIG.storageKeys.giftQueue, APP_CONFIG.storageKeys.giftInProgress].forEach(k => sessionStorage.removeItem(k));
        },
    };

    // --- UTILITY FUNCTIONS ---

    /**
     * @description Removes leading and trailing quotes from a string.
     * @param {string} str The string to unquote.
     * @returns {string} The unquoted string.
     */
    function unquote(str) { return str.replace(/^"|"$/g, ''); }

    /**
     * @description Sets the value of an input element and dispatches an 'input' event,
     * which is necessary for React components to recognize the change.
     * @param {HTMLInputElement} el The input element.
     * @param {string} value The value to set.
     */
    function setNativeValue(el, value) {
        const last = el.value;
        el.value = value;
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(last);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * @description A simple promise-based delay.
     * @param {number} ms The number of milliseconds to wait.
     * @returns {Promise<void>}
     */
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    /**
     * @description Waits for a DOM element to appear.
     * @param {string} sel The CSS selector or XPath expression.
     * @param {boolean} [useXpath=false] Whether to use XPath instead of a CSS selector.
     * @returns {Promise<Element>} A promise that resolves with the found element.
     */
    function waitFor(sel, useXpath = false) {
        return new Promise((res, rej) => {
            const iv = setInterval(() => {
                if (testCancelled) {
                    clearInterval(iv);
                    rej(new Error('Operation cancelled by user.'));
                    return;
                }
                const el = useXpath ? document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : document.querySelector(sel);
                if (el) {
                    clearInterval(iv);
                    res(el);
                }
            }, APP_CONFIG.delays.waitFor);
        });
    }

    /**
     * @description Waits for an element to appear within a scrollable container, scrolling until it's found.
     * @param {string} elementXPath The XPath for the target element.
     * @param {string} scrollContainerSelector The CSS selector for the scrollable container.
     * @param {number} [maxScrolls=20] The maximum number of scroll attempts.
     * @returns {Promise<Element>} A promise that resolves with the found element.
     */
    async function waitForAndScroll(elementXPath, scrollContainerSelector, maxScrolls = 20) {
        const container = await waitFor(scrollContainerSelector);
        if (!container) throw new Error(`Scroll container not found: ${scrollContainerSelector}`);

        for (let i = 0; i < maxScrolls; i++) {
            if (testCancelled) throw new Error('Operation cancelled by user.');
            let element = document.evaluate(elementXPath, container, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (element) {
                return element;
            }
            container.scrollTop += container.clientHeight * 0.8;
            await delay(APP_CONFIG.delays.scroll);
        }
        throw new Error(`Element not found after ${maxScrolls} scrolls: ${elementXPath}`);
    }

    /**
     * @description Waits for a button to become enabled (not disabled).
     * @param {string} selector The CSS selector for the button.
     * @returns {Promise<HTMLButtonElement>} A promise that resolves with the enabled button element.
     */
    async function waitForButtonEnabled(selector) {
        return new Promise((res, rej) => {
            const iv = setInterval(() => {
                if (testCancelled) {
                    clearInterval(iv);
                    rej(new Error('Operation cancelled by user.'));
                    return;
                }
                const btn = document.querySelector(selector);
                if (btn && !btn.disabled) {
                    clearInterval(iv);
                    res(btn);
                }
            }, APP_CONFIG.delays.uiUpdate);
        });
    }

    // --- STYLES ---

    /**
     * @description Injects the script's CSS styles into the page's <head>.
     */
    function injectStyles() {
        document.head.insertAdjacentHTML('beforeend', `<style>${VISUAL_DATA.styles()}</style>`);
    }

    // --- DRAGGABLE & PANEL STATE FUNCTIONS ---

    /**
     * @description Makes the panel draggable by its header.
     * @param {HTMLElement} container The main panel element.
     */
    function makeDraggable(container) {
        const dragHandle = container.querySelector('[data-handle="drag"]');
        if (!dragHandle) return;
        let isDragging = false, offsetX, offsetY;
        const onDragStart = (e) => {
            isDragging = true;
            const coords = e.touches ? e.touches[0] : e;
            offsetX = coords.clientX - container.getBoundingClientRect().left;
            offsetY = coords.clientY - container.getBoundingClientRect().top;
            container.style.transition = 'none';
            document.addEventListener('mousemove', onDragMove); document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd); document.addEventListener('touchend', onDragEnd);
        };
        const onDragMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const coords = e.touches ? e.touches[0] : e;
            container.style.left = `${coords.clientX - offsetX}px`;
            container.style.top = `${coords.clientY - offsetY}px`;
        };
        const onDragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onDragMove); document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd); document.removeEventListener('touchend', onDragEnd);
            localStorage.setItem(APP_CONFIG.storageKeys.position, JSON.stringify({ left: container.offsetLeft, top: container.offsetTop }));
        };
        dragHandle.addEventListener('mousedown', onDragStart); dragHandle.addEventListener('touchstart', onDragStart, { passive: false });
    }

    /**
     * @description Sets the initial position of the panel based on saved localStorage data.
     * @param {HTMLElement} container The main panel element.
     */
    function initializePanelPosition(container) {
        const savedPos = localStorage.getItem(APP_CONFIG.storageKeys.position);
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                container.style.left = `${pos.left}px`;
                container.style.top = `${pos.top}px`;
            } catch (e) { console.error("Failed to apply saved position:", e); }
        } else {
            const rect = container.getBoundingClientRect();
            const initialPos = { left: rect.left, top: rect.top };
            container.style.left = `${initialPos.left}px`;
            container.style.top = `${initialPos.top}px`;
            localStorage.setItem(APP_CONFIG.storageKeys.position, JSON.stringify(initialPos));
        }
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    };

    /**
     * @description Toggles the collapsed/expanded state of the panel body.
     * @param {HTMLButtonElement} button The collapse/expand button.
     * @param {HTMLElement} body The panel body element.
     */
    function handleToggleCollapse(button, body) {
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? 'flex' : 'none';
        // FIX: Swapped icons to correctly reflect the next state.
        button.innerHTML = isCollapsed ? VISUAL_DATA.icons.collapse : VISUAL_DATA.icons.expand;
        button.title = isCollapsed ? VISUAL_DATA.text.collapseTitle : VISUAL_DATA.text.expandTitle;
        localStorage.setItem(APP_CONFIG.storageKeys.collapsed, JSON.stringify(!isCollapsed));
    }


    // --- UI & RENDERING ---

    /**
     * @description Creates the entire panel UI, initializes its elements, and appends it to the page.
     */
    function createPanel() {
        panelElements = {};
        const p = panelElements;
        const C = VISUAL_DATA.classes;
        const T = VISUAL_DATA.text;
        const I = VISUAL_DATA.icons;

        p.panel = document.createElement('div'); p.panel.className = C.panel;
        const isCollapsed = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.collapsed)) || false;
        p.header = document.createElement('div'); p.header.className = C.header; p.header.dataset.handle = 'drag';
        p.header.innerHTML = `
            <span class="${C.title}">${T.panelTitle}</span>
            <div class="${C.controls}">
                <button class="${C.headerBtn}" data-action="import" title="${T.importTitle}">${I.import}</button>
                <button class="${C.headerBtn}" data-action="export" title="${T.exportTitle}">${I.export}</button>
                <button class="${C.headerBtn}" data-action="toggle-collapse" title="${isCollapsed ? T.expandTitle : T.collapseTitle}">${isCollapsed ? I.expand : I.collapse}</button>
                <button class="${C.headerBtn}" data-action="close" title="${T.closeTitle}">${I.close}</button>
            </div>
        `;
        p.body = document.createElement('div'); p.body.className = C.body; p.body.style.display = isCollapsed ? 'none' : 'flex';
        p.parseBtn = document.createElement('button'); p.parseBtn.textContent = T.parseModels; p.parseBtn.className = `${C.btn} ${C.runChatsBtn}`;
        // NEW: Add class for scrolling behavior
        p.promptsContainer = document.createElement('div'); p.promptsContainer.className = C.promptsContainer;
        p.addPromptBtn = document.createElement('button'); p.addPromptBtn.textContent = T.addPrompt; p.addPromptBtn.className = `${C.btn} ${C.addPromptBtn}`;

        p.tabContainer = document.createElement('div'); p.tabContainer.className = C.tabContainer;
        p.chatTabBtn = document.createElement('button'); p.chatTabBtn.className = C.tabBtn; p.chatTabBtn.textContent = T.tabChats;
        p.photoTabBtn = document.createElement('button'); p.photoTabBtn.className = C.tabBtn; p.photoTabBtn.textContent = T.tabPhoto;
        p.videoTabBtn = document.createElement('button'); p.videoTabBtn.className = C.tabBtn; p.videoTabBtn.textContent = T.tabVideo;
        // NEW: Gift tab button
        p.giftTabBtn = document.createElement('button'); p.giftTabBtn.className = C.tabBtn; p.giftTabBtn.textContent = T.tabGifts;
        p.tabContainer.append(p.chatTabBtn, p.photoTabBtn, p.videoTabBtn, p.giftTabBtn);


        p.radioContainer = document.createElement('div');
        p.radioContainer.className = C.radioContainer;
        p.radioContainer.innerHTML = `
            <input type="radio" id="pregen_none" name="pregen_action" value="none" checked>
            <label for="pregen_none">${T.pregenNone}</label>
            <input type="radio" id="pregen_restore" name="pregen_action" value="restore">
            <label for="pregen_restore">${T.pregenRestore}</label>
            <input type="radio" id="pregen_delete" name="pregen_action" value="delete">
            <label for="pregen_delete">${T.pregenDelete}</label>
        `;

        p.searchInput = document.createElement('input'); p.searchInput.className = C.input; p.searchInput.placeholder = T.searchPlaceholder;
        p.listContainer = document.createElement('div'); p.listContainer.className = C.listContainer;

        p.tabContentContainer = document.createElement('div');
        p.chatTabContent = document.createElement('div'); p.chatTabContent.className = C.tabContent;
        p.photoTabContent = document.createElement('div'); p.photoTabContent.className = C.tabContent;
        p.videoTabContent = document.createElement('div'); p.videoTabContent.className = C.tabContent;
        // NEW: Gift tab content
        p.giftTabContent = document.createElement('div'); p.giftTabContent.className = C.tabContent;

        p.testBtn = document.createElement('button'); p.testBtn.textContent = T.runSelected; p.testBtn.className = `${C.btn} ${C.runChatsBtn}`;
        p.runHereBtn = document.createElement('button'); p.runHereBtn.textContent = T.runHere; p.runHereBtn.className = `${C.btn} ${C.runHereBtn}`;
        const chatButtonRow = document.createElement('div'); chatButtonRow.className = C.btnRow;
        chatButtonRow.append(p.testBtn, p.runHereBtn);
        p.chatTabContent.append(p.radioContainer, chatButtonRow);

        // NEW: Gift tab buttons
        p.runGiftsBtn = document.createElement('button'); p.runGiftsBtn.textContent = T.runGifts; p.runGiftsBtn.className = `${C.btn} ${C.runGiftsBtn}`;
        p.runHereGiftsBtn = document.createElement('button'); p.runHereGiftsBtn.textContent = T.runHereGifts; p.runHereGiftsBtn.className = `${C.btn} ${C.runHereGiftsBtn}`;
        const giftButtonRow = document.createElement('div'); giftButtonRow.className = C.btnRow;
        giftButtonRow.append(p.runGiftsBtn, p.runHereGiftsBtn);
        p.giftTabContent.append(giftButtonRow);

        p.photoGenBtn = document.createElement('button'); p.photoGenBtn.textContent = T.runPhotoGen; p.photoGenBtn.className = `${C.btn} ${C.photoGenBtn}`;
        p.photoTabContent.append(p.photoGenBtn);

        p.videoGenBtn = document.createElement('button'); p.videoGenBtn.textContent = T.runVideoGen; p.videoGenBtn.className = `${C.btn} ${C.videoGenBtn}`;
        p.videoTabContent.append(p.videoGenBtn);

        p.tabContentContainer.append(p.chatTabContent, p.photoTabContent, p.videoTabContent, p.giftTabContent);

        p.newTestBtn = document.createElement('button');
        p.newTestBtn.textContent = T.startNewTest;
        p.newTestBtn.className = `${C.btn} ${C.runChatsBtn}`;

        p.cancelBtn = document.createElement('button'); p.cancelBtn.textContent = T.cancelTest; p.cancelBtn.className = `${C.btn} ${C.cancelBtn}`;
        p.taskProgress = document.createElement('div'); p.taskProgress.className = C.taskProgress;
        p.fileInput = document.createElement('input'); p.fileInput.type = 'file'; p.fileInput.accept = ".xlsx, .xls"; p.fileInput.style.display = 'none';

        p.body.append(p.parseBtn, p.promptsContainer, p.addPromptBtn, p.tabContainer, p.searchInput, p.listContainer, p.tabContentContainer, p.taskProgress, p.newTestBtn, p.cancelBtn, p.fileInput);
        p.panel.append(p.header, p.body);
        document.body.append(p.panel);

        attachEventListeners();
    }

    /**
     * @description Attaches all primary event listeners to the panel's buttons and inputs.
     */
    function attachEventListeners() {
        const p = panelElements;

        p.header.querySelector('[data-action="close"]').addEventListener('click', () => { p.panel.remove(); panelClosedByUser = true; });
        const collapseBtn = p.header.querySelector('[data-action="toggle-collapse"]');
        collapseBtn.addEventListener('click', () => handleToggleCollapse(collapseBtn, p.body));
        p.header.querySelector('[data-action="import"]').addEventListener('click', () => p.fileInput.click());
        p.header.querySelector('[data-action="export"]').addEventListener('click', handleExport);
        p.fileInput.addEventListener('change', handleImport);
        p.parseBtn.addEventListener('click', fetchAndRender);
        p.addPromptBtn.addEventListener('click', () => addPromptField());
        p.testBtn.addEventListener('click', () => startTests(false));
        p.runHereBtn.addEventListener('click', () => startTests(true));
        // NEW: Gift button listeners
        p.runGiftsBtn.addEventListener('click', () => startGiftSending(false));
        p.runHereGiftsBtn.addEventListener('click', () => startGiftSending(true));
        p.photoGenBtn.addEventListener('click', startPhotoGeneration);
        p.videoGenBtn.addEventListener('click', startVideoGeneration);
        p.newTestBtn.addEventListener('click', async () => {
            S.clearTestProgress();
            S.clearPhotoGenProgress();
            S.clearVideoGenProgress();
            S.clearGiftProgress();
            adminTokenCache = null;
            await fetchAndRender();
        });
        p.cancelBtn.addEventListener('click', () => {
            testCancelled = true;
            S.clearTestProgress();
            S.clearPhotoGenProgress();
            S.clearVideoGenProgress();
            S.clearGiftProgress();
            S.saveModelSelection([]);
            adminTokenCache = null;
            setPanelState('configured');
            renderPrompts();
            renderList();
        });
        p.searchInput.addEventListener('input', handleSearch);

        const tabs = {
            chat: { btn: p.chatTabBtn, content: p.chatTabContent },
            photo: { btn: p.photoTabBtn, content: p.photoTabContent },
            video: { btn: p.videoTabBtn, content: p.videoTabContent },
            gift: { btn: p.giftTabBtn, content: p.giftTabContent } // NEW: Gift tab object
        };

        /**
         * @description Switches the visible tab in the UI.
         * @param {string} tabName The name of the tab to switch to ('chat', 'photo', 'video', 'gift').
         */
        function switchTab(tabName) {
            if (!tabs[tabName]) tabName = 'chat'; // Fallback to default
            activeTab = tabName;
            localStorage.setItem(APP_CONFIG.storageKeys.activeTab, tabName);
            Object.values(tabs).forEach(tab => {
                tab.btn.classList.remove(VISUAL_DATA.classes.active);
                tab.content.classList.remove(VISUAL_DATA.classes.active);
            });
            tabs[tabName].btn.classList.add(VISUAL_DATA.classes.active);
            tabs[tabName].content.classList.add(VISUAL_DATA.classes.active);
            updatePromptsPlaceholder();
            renderList();
        }

        p.chatTabBtn.addEventListener('click', () => switchTab('chat'));
        p.photoTabBtn.addEventListener('click', () => switchTab('photo'));
        p.videoTabBtn.addEventListener('click', () => switchTab('video'));
        p.giftTabBtn.addEventListener('click', () => switchTab('gift')); // NEW: Gift tab listener

        const lastTab = localStorage.getItem(APP_CONFIG.storageKeys.activeTab) || 'chat';
        switchTab(lastTab);

        attachDragAndDropListeners(p.promptsContainer);
    }

    /**
     * @description Updates the placeholder text for prompt inputs based on the active tab.
     */
    function updatePromptsPlaceholder() {
        const placeholderText = activeTab === 'gift'
            ? 'Gift Index (1-9)'
            : VISUAL_DATA.text.promptPlaceholder;

        panelElements.promptsContainer.querySelectorAll(`.${VISUAL_DATA.classes.promptInput}`).forEach(input => {
            input.placeholder = placeholderText;
        });
    }

    /**
     * @description Attaches drag and drop event listeners to the prompts container.
     * @param {HTMLElement} container The container for prompt entries.
     */
    function attachDragAndDropListeners(container) {
        container.addEventListener('dragstart', e => {
            if (e.target.classList.contains(VISUAL_DATA.classes.dragHandle)) {
                draggedItem = e.target.closest(`.${VISUAL_DATA.classes.promptEntry}`);
                if (draggedItem) {
                    setTimeout(() => {
                        draggedItem.classList.add(VISUAL_DATA.classes.dragging);
                    }, 0);
                }
            } else {
                e.preventDefault();
            }
        });

        container.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove(VISUAL_DATA.classes.dragging);
                draggedItem = null;
            }
        });

        container.addEventListener('dragover', e => {
            e.preventDefault();
            if (!draggedItem) return;

            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        });

        /**
         * @description Helper function to determine where to drop a dragged element.
         * @param {HTMLElement} container The container being dragged over.
         * @param {number} y The vertical coordinate of the mouse.
         * @returns {HTMLElement|null} The element to insert the dragged item before.
         */
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(`.${VISUAL_DATA.classes.promptEntry}:not(.${VISUAL_DATA.classes.dragging})`)];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    }

    /**
     * @description Creates a validated numeric input field.
     * @param {string} placeholder The input's placeholder text.
     * @param {string|number} defaultValue The default value.
     * @param {boolean} allowZero Whether to allow zero as a value.
     * @param {boolean} [isFloat=false] Whether to allow decimal values.
     * @param {number|null} [maxLength=null] The maximum character length.
     * @returns {HTMLInputElement} The created input element.
     */
    function createValidatedInput(placeholder, defaultValue, allowZero, isFloat = false, maxLength = null) {
        const input = document.createElement('input');
        input.className = VISUAL_DATA.classes.input;
        input.type = 'text';
        input.inputMode = isFloat ? 'decimal' : 'numeric';
        input.placeholder = placeholder;
        input.value = defaultValue;
        input.style.minWidth = '25px';
        input.style.flexShrink = '0';
        if (maxLength) input.maxLength = maxLength;
        input.addEventListener('input', (e) => {
            let value = e.target.value;
            if (isFloat) {
                value = value.replace(/[^0-9.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
            } else {
                value = value.replace(/\D/g, '');
                if (!allowZero && value && parseInt(value, 10) === 0) value = '1';
            }
            e.target.value = value;
        });
        return input;
    }

    /**
     * @description Adds a new prompt input field to the UI.
     * @param {string} [prompt=''] The prompt text.
     * @param {string|number} [count=''] The repetition count.
     * @param {string|number} [delay=''] The delay in seconds.
     */
    function addPromptField(prompt = '', count = '', delay = '') {
        const C = VISUAL_DATA.classes;
        const T = VISUAL_DATA.text;
        const I = VISUAL_DATA.icons;

        const entry = document.createElement('div');
        entry.className = C.promptEntry;

        const dragHandle = document.createElement('div');
        dragHandle.className = C.dragHandle;
        dragHandle.innerHTML = I.dragHandle;
        dragHandle.title = T.dragReorderTitle;
        dragHandle.draggable = true;

        const promptInput = document.createElement('input');
        promptInput.className = `${C.input} ${C.promptInput}`;
        // Placeholder is now set dynamically
        promptInput.placeholder = activeTab === 'gift' ? 'Gift Index (1-9)' : T.promptPlaceholder;
        promptInput.value = prompt;
        const countInput = createValidatedInput(T.countPlaceholder, count, false, false, 2);
        countInput.classList.add(C.countInput);
        countInput.style.flex = '0 0 20px';
        countInput.style.textAlign = 'center';
        countInput.title = T.countTitle;
        const delayInput = createValidatedInput(T.delayPlaceholder, delay, true, true, 2);
        delayInput.classList.add(C.delayInput);
        delayInput.style.flex = '0 0 20px';
        delayInput.style.textAlign = 'center';
        delayInput.title = T.delayTitle;
        const removeBtn = document.createElement('button');
        removeBtn.className = `${C.btn} ${C.removePromptBtn}`;
        removeBtn.textContent = I.remove;
        removeBtn.title = T.removePromptTitle;
        removeBtn.onclick = () => {
            // This logic allows removing the last prompt field if it's not the only one.
            if (panelElements.promptsContainer.querySelectorAll(`.${C.promptEntry}`).length > 1) {
                entry.remove();
            } else {
                // If it is the last one, just clear its fields.
                entry.querySelector(`.${C.promptInput}`).value = '';
                entry.querySelector(`.${C.countInput}`).value = '';
                entry.querySelector(`.${C.delayInput}`).value = '';
            }
        };
        entry.append(dragHandle, promptInput, countInput, delayInput, removeBtn);
        panelElements.promptsContainer.append(entry);
    }


    /**
     * @description Renders the list of prompt fields based on data from sessionStorage.
     */
    function renderPrompts() {
        if (!panelElements || !panelElements.promptsContainer) return;
        panelElements.promptsContainer.innerHTML = '';
        const tasks = S.tasks();
        if (tasks.length > 0) { tasks.forEach(task => addPromptField(task.prompt, task.count, task.delay)); }
        else { addPromptField(); }
        updatePromptsPlaceholder();
    }

    /**
     * @description Sets the visibility of different panel sections based on the current state.
     * @param {'initial'|'configured'|'testing'|'completed'} state The current script state.
     */
    function setPanelState(state) {
        const p = panelElements;
        const C = VISUAL_DATA.classes;
        const all = [p.parseBtn, p.promptsContainer, p.addPromptBtn, p.tabContainer, p.searchInput, p.listContainer, p.tabContentContainer, p.taskProgress, p.newTestBtn, p.cancelBtn];
        all.forEach(el => el.classList.add(C.hidden));

        const importBtn = p.header.querySelector('[data-action="import"]');
        const exportBtn = p.header.querySelector('[data-action="export"]');

        if (state === 'initial') {
            p.parseBtn.classList.remove(C.hidden);
            importBtn.style.display = 'none';
            exportBtn.style.display = 'none';
        } else {
            importBtn.style.display = '';
            exportBtn.style.display = '';
        }

        if (state === 'configured') {
            [p.promptsContainer, p.addPromptBtn, p.tabContainer, p.searchInput, p.listContainer, p.tabContentContainer].forEach(el => el.classList.remove(C.hidden));
            const isChatPage = location.pathname.includes('/chat/') || location.pathname.includes('/premium-models/');
            p.runHereBtn.disabled = !isChatPage;
            p.runHereGiftsBtn.disabled = !isChatPage;
        }
        else if (state === 'testing') { [p.taskProgress, p.listContainer, p.cancelBtn].forEach(el => el.classList.remove(C.hidden)); }
        else if (state === 'completed') { [p.listContainer, p.newTestBtn, p.taskProgress].forEach(el => el.classList.remove(C.hidden)); }
    }

    /**
     * @description Renders the list of models, grouped and filtered based on the current state and active tab.
     */
    function renderList() {
        if (!panelElements || !panelElements.listContainer) return;
        const { listContainer } = panelElements;
        listContainer.innerHTML = '';
        let allModels = S.models() || [];

        const isCurrentlyTesting = S.isTesting() || S.isGifting(); // Gifts are a type of test
        const isCurrentlyPhotoGening = S.isPhotoGening();
        const isCurrentlyVideoGening = S.isVideoGening();
        const isProcessing = isCurrentlyTesting || isCurrentlyPhotoGening || isCurrentlyVideoGening;
        const isViewingCompleted = !isProcessing && S.completed().length > 0;
        const shouldShowResults = isProcessing || isViewingCompleted;
        const modelGroupsContainer = document.createElement('div');

        if (!shouldShowResults) {
            renderListToolbar(listContainer, modelGroupsContainer);
        }

        const inclusive = allModels.filter(m => !m.isCustom && APP_CONFIG.inclusiveModels.has(`${m.firstName} ${m.lastName}`));
        const otherModels = allModels.filter(m => !m.isCustom && !APP_CONFIG.inclusiveModels.has(`${m.firstName} ${m.lastName}`));
        const customCharacters = allModels.filter(m => m.isCustom);

        let modelsToRender = {
            'Realistic': otherModels.filter(m => !m.isAnime),
            'Anime': otherModels.filter(m => m.isAnime),
            'Inclusive Models': inclusive,
            'Custom Characters': customCharacters
        };

        // Filter models based on active tab compatibility
        if (activeTab === 'photo') {
            delete modelsToRender['Inclusive Models'];
        } else if (activeTab === 'video') {
            delete modelsToRender['Inclusive Models'];
            delete modelsToRender['Custom Characters'];
        }
        else if (activeTab === 'gift') {
            delete modelsToRender['Custom Characters'];
        }

        if (shouldShowResults) {
            const testRunIds = new Set(S.modelSelection());
            Object.keys(modelsToRender).forEach(groupName => {
                modelsToRender[groupName] = modelsToRender[groupName].filter(m => testRunIds.has(m.id));
            });
        }

        const completedIds = new Set(S.completed());
        let currentId = null;
        if (isCurrentlyTesting) { // Includes gifts
            const match = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
            if (match) currentId = match[1];
        } else if (isCurrentlyPhotoGening || isCurrentlyVideoGening) {
            const queue = isCurrentlyPhotoGening ? S.photoGenQueue() : S.videoGenQueue();
            if (queue.length > 0) currentId = queue[0].id;
        }


        const targetContainer = shouldShowResults ? listContainer : modelGroupsContainer;

        if (shouldShowResults) {
            APP_CONFIG.modelGroups.forEach(groupName => {
                const groupModels = modelsToRender[groupName];
                if (!groupModels || groupModels.length === 0) return;
                const header = document.createElement('div'); header.className = VISUAL_DATA.classes.groupHeader; header.textContent = `${groupName} (${groupModels.length})`;
                targetContainer.append(header);
                groupModels.forEach(m => targetContainer.append(createModelRow(m, completedIds, currentId, true)));
            });
        } else {
            const previouslySelected = new Set(S.modelSelection());
            APP_CONFIG.modelGroups.forEach(groupName => {
                if (!modelsToRender[groupName]) return;
                const groupModels = modelsToRender[groupName];
                if (!groupModels || groupModels.length === 0) return;

                const details = document.createElement('details'); details.className = `group-details-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
                const summary = document.createElement('summary');
                const groupCheckboxId = `group-all-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
                const groupCheckbox = document.createElement('input');
                groupCheckbox.type = 'checkbox';
                groupCheckbox.id = groupCheckboxId;
                groupCheckbox.dataset.group = groupName.toLowerCase().replace(/\s+/g, '-');

                const label = document.createElement('label');
                label.htmlFor = groupCheckboxId;
                label.textContent = groupName;
                label.className = VISUAL_DATA.classes.summaryLabel;

                const counterSpan = document.createElement('span');
                counterSpan.className = VISUAL_DATA.classes.summaryCounter;

                summary.append(groupCheckbox, label, counterSpan);
                details.append(summary);

                let hasCheckedModel = false;
                groupModels.forEach(m => {
                    const modelRow = createModelRow(m);
                    const checkbox = modelRow.querySelector('input');
                    checkbox.dataset.group = groupName.toLowerCase().replace(/\s+/g, '-');
                    if (previouslySelected.has(m.id)) { checkbox.checked = true; hasCheckedModel = true; }
                    details.append(modelRow);
                });
                if (hasCheckedModel) { details.open = true; }
                targetContainer.append(details);
            });
            listContainer.append(modelGroupsContainer);
            addCheckboxLogic();
        }
    }

    /**
     * @description Renders the toolbar above the model list (Select All, Update List).
     * @param {HTMLElement} listContainer The main container for the list.
     * @param {HTMLElement} modelGroupsContainer The container where model groups will be rendered.
     */
        function renderListToolbar(listContainer, modelGroupsContainer) {
        const C = VISUAL_DATA.classes;
        const T = VISUAL_DATA.text;

        const listToolbar = document.createElement('div');
        listToolbar.className = C.listToolbar;

        const selectAllDetails = document.createElement('details');
        selectAllDetails.className = 'select-all-spoiler';
        selectAllDetails.style.position = 'relative';
        selectAllDetails.style.bottom = '2px';
        selectAllDetails.open = true;

        const selectAllSummary = document.createElement('summary');

        const masterCheckbox = document.createElement('input');
        masterCheckbox.type = 'checkbox';
        masterCheckbox.id = 'cb-master-all';
        panelElements.masterCheckbox = masterCheckbox;

        const masterLabel = document.createElement('label');
        masterLabel.htmlFor = 'cb-master-all';
        masterLabel.textContent = T.selectAll;
        masterLabel.className = C.summaryLabel;

        selectAllSummary.append(masterCheckbox, masterLabel);
        selectAllDetails.append(selectAllSummary);

        selectAllDetails.addEventListener('toggle', () => {
            modelGroupsContainer.style.display = selectAllDetails.open ? '' : 'none';
        });

        const updateModelsBtn = document.createElement('button');
        updateModelsBtn.className = C.btn;
        updateModelsBtn.textContent = T.updateList;
        updateModelsBtn.title = T.updateListTitle;

        Object.assign(updateModelsBtn.style, {
            backgroundColor: '#26282C',
            border: '1px solid #444',
            padding: '5px',
            position: 'relative',
            top: '2px',
            width: 'auto'
        });

        const tabContainerWidth = panelElements.tabContainer.offsetWidth;
        if (tabContainerWidth > 0) {
            updateModelsBtn.style.width = `${(tabContainerWidth / 3) - 10}px`;
        }
        updateModelsBtn.addEventListener('click', fetchAndRender);

        listToolbar.append(selectAllDetails, updateModelsBtn);
        listContainer.append(listToolbar);
    }

    /**
     * @description Creates a single row element for a model in the list.
     * @param {object} model The model data object.
     * @param {Set<string>} completedIds A set of IDs of completed models.
     * @param {string|null} currentId The ID of the currently processing model.
     * @param {boolean} [isFlatView=false] Whether to render in a flat list (for results) or grouped list (for selection).
     * @returns {HTMLElement} The created row element.
     */
    function createModelRow(model, completedIds, currentId, isFlatView = false) {
        const fullName = `${model.firstName} ${model.lastName}`;
        const C = VISUAL_DATA.classes;
        const { row, checkbox, label } = createCheckbox(model.id, fullName, C.row, true);

        let group;
        if (model.isCustom) {
            group = 'custom-characters';
            const statusLabel = document.createElement('span');
            statusLabel.className = C.modelStatusLabel;
            statusLabel.textContent = `(${model.isLocked ? 'Locked' : 'Unlocked'})`;
            label.appendChild(statusLabel);
        } else if (APP_CONFIG.inclusiveModels.has(fullName)) {
            group = 'inclusive-models';
            const typeLabel = document.createElement('span');
            typeLabel.className = C.modelTypeLabel;
            typeLabel.textContent = `(${model.isAnime ? 'Anime' : 'Realistic'})`;
            label.appendChild(typeLabel);
        } else {
            group = model.isAnime ? 'anime' : 'realistic';
        }
        checkbox.dataset.group = group;
        checkbox.value = model.id;

        if (isFlatView) {
            checkbox.style.display = 'none';
            const icon = document.createElement('span'); icon.className = C.progressIcon; row.prepend(icon);
            if (completedIds && completedIds.has(model.id)) { row.classList.add(C.completed); }
            if ((S.isTesting() || S.isGifting() || S.isPhotoGening() || S.isVideoGening()) && model.id === currentId) { row.classList.add(C.current); }
        }

        const isViewingCompleted = !(S.isTesting() || S.isGifting() || S.isPhotoGening() || S.isVideoGening()) && S.completed().length > 0;
        if (!isFlatView || isViewingCompleted) {
            const linkBtn = document.createElement('a');
            linkBtn.href = `${APP_CONFIG.api.baseUrl()}/chat/${model.id}`;
            linkBtn.className = C.gotoBtn;
            linkBtn.textContent = VISUAL_DATA.icons.goto;
            linkBtn.title = VISUAL_DATA.text.gotoChatTitle;
            linkBtn.addEventListener('click', (e) => e.stopPropagation());
            row.append(linkBtn);
        }
        return row;
    }

    /**
     * @description Creates a generic checkbox row element.
     * @param {string} id The ID for the checkbox and its label's 'for' attribute.
     * @param {string} labelText The text for the label.
     * @param {string} className The class for the container div.
     * @param {boolean} [isModel=false] A flag to add model-specific classes and data attributes.
     * @returns {{row: HTMLElement, checkbox: HTMLInputElement, label: HTMLLabelElement}} An object containing the created elements.
     */
    function createCheckbox(id, labelText, className, isModel = false) {
        const row = document.createElement('div');
        if (className) row.className = className;
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `cb-${id}`;
        if (isModel) { cb.classList.add(VISUAL_DATA.classes.modelCheckbox); row.dataset.modelName = labelText.toLowerCase(); }
        const lbl = document.createElement('label'); lbl.textContent = labelText; lbl.htmlFor = `cb-${id}`;
        row.append(cb, lbl);
        return { row, checkbox: cb, label: lbl };
    }

    /**
     * @description Updates the (selected/total) counters for each model group.
     */
    function updateGroupCounters() {
        panelElements.listContainer.querySelectorAll('details:not(.select-all-spoiler)').forEach(details => {
            const summary = details.querySelector('summary');
            if (!summary) return;
            const counterSpan = summary.querySelector(`.${VISUAL_DATA.classes.summaryCounter}`);
            if (!counterSpan) return;
            const total = details.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}`).length;
            const selected = details.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}:checked`).length;
            counterSpan.textContent = `(${selected}/${total})`;
        });
    }

    /**
     * @description Adds the logic for master, group, and individual model checkboxes to work together.
     */
    function addCheckboxLogic() {
        const { listContainer, masterCheckbox } = panelElements;
        const modelCheckboxes = Array.from(listContainer.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}`));
        const groupCheckboxes = Array.from(listContainer.querySelectorAll('summary input[type="checkbox"]'));

        const updateAll = () => {
            const selectedCount = modelCheckboxes.filter(cb => cb.checked).length;
            const totalCount = modelCheckboxes.length;

            if (masterCheckbox && totalCount > 0) {
                if (selectedCount === 0) {
                    masterCheckbox.checked = false;
                    masterCheckbox.indeterminate = false;
                } else if (selectedCount === totalCount) {
                    masterCheckbox.checked = true;
                    masterCheckbox.indeterminate = false;
                } else {
                    masterCheckbox.checked = false;
                    masterCheckbox.indeterminate = true;
                }
            }

            const noModelsSelected = selectedCount === 0;
            panelElements.testBtn.disabled = noModelsSelected;
            panelElements.runGiftsBtn.disabled = noModelsSelected;
            panelElements.photoGenBtn.disabled = noModelsSelected;
            panelElements.videoGenBtn.disabled = noModelsSelected;


            groupCheckboxes.forEach(groupCb => {
                if (groupCb === masterCheckbox) return;
                const groupName = groupCb.dataset.group;
                const childCheckboxes = modelCheckboxes.filter(cb => cb.dataset.group === groupName);
                if (childCheckboxes.length > 0) {
                    const selectedInGroup = childCheckboxes.filter(cb => cb.checked).length;
                    if (selectedInGroup === 0) {
                        groupCb.checked = false;
                        groupCb.indeterminate = false;
                    } else if (selectedInGroup === childCheckboxes.length) {
                        groupCb.checked = true;
                        groupCb.indeterminate = false;
                    } else {
                        groupCb.checked = false;
                        groupCb.indeterminate = true;
                    }
                }
            });
            updateGroupCounters();
        };

        if (masterCheckbox) {
            masterCheckbox.addEventListener('change', () => {
                modelCheckboxes.forEach(cb => cb.checked = masterCheckbox.checked);
                updateAll();
            });
        }

        groupCheckboxes.forEach(groupCb => {
            if (groupCb === masterCheckbox) return;
            groupCb.addEventListener('change', () => {
                const groupName = groupCb.dataset.group;
                const childCheckboxes = modelCheckboxes.filter(cb => cb.dataset.group === groupName);
                childCheckboxes.forEach(cb => cb.checked = groupCb.checked);
                updateAll();
            });
        });

        modelCheckboxes.forEach(cb => cb.addEventListener('change', updateAll));

        updateAll();
    }

    /**
     * @description Handles exporting the current prompt list to an XLSX file.
     */
    function handleExport() {
        const data = [];
        const entries = panelElements.promptsContainer.querySelectorAll(`.${VISUAL_DATA.classes.promptEntry}`);

        entries.forEach(entry => {
            const prompt = entry.querySelector(`.${VISUAL_DATA.classes.promptInput}`).value.trim();
            if (prompt) {
                let count = parseInt(entry.querySelector(`.${VISUAL_DATA.classes.countInput}`).value, 10);
                let delay = parseFloat(entry.querySelector(`.${VISUAL_DATA.classes.delayInput}`).value);

                if (isNaN(count) || count <= 0) count = 1;
                if (isNaN(delay) || delay < 0) delay = 0;

                data.push([prompt, count, delay]);
            }
        });

        if (data.length === 0) {
            alert('Please fill in at least one prompt to export.');
            return;
        }

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts');
        XLSX.writeFile(workbook, 'prompts_export.xlsx');
    }

    /**
     * @description Handles importing prompts from a selected XLSX file.
     * @param {Event} event The file input change event.
     */
    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            alert('Invalid file type. Please select an .xlsx or .xls file.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const newTasks = [];
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const prompt = row[0] ? String(row[0]).trim() : '';
                    let count = row[1];
                    let delay = row[2];

                    if (!prompt) continue;

                    if (count === undefined || count === null || String(count).trim() === '') {
                        count = 1;
                    } else {
                        count = parseInt(count, 10);
                        if (isNaN(count) || count <= 0) {
                            throw new Error(`Invalid message count in row ${i + 1}. It must be a whole number greater than 0.`);
                        }
                    }

                    if (delay === undefined || delay === null || String(delay).trim() === '') {
                        delay = 0;
                    } else {
                        delay = parseFloat(delay);
                        if (isNaN(delay) || delay < 0) {
                            throw new Error(`Invalid delay in row ${i + 1}. It must be a number equal to or greater than 0.`);
                        }
                    }
                    newTasks.push({ prompt, count, delay });
                }

                if (newTasks.length === 0) {
                   throw new Error("The file seems to be empty or in an incorrect format. Make sure Column A contains prompts.");
                }

                panelElements.promptsContainer.innerHTML = '';
                newTasks.forEach(task => addPromptField(task.prompt, task.count, task.delay));
                S.saveTasks(newTasks);

            } catch (error) {
                alert(`Import failed: ${error.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            alert('Failed to read the file.');
            event.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * @description Fetches the model list from the API and renders it in the panel.
     */
    async function fetchAndRender() {
        const isCompletedState = panelElements && panelElements.newTestBtn && !panelElements.newTestBtn.classList.contains(VISUAL_DATA.classes.hidden);

        if (!isCompletedState && panelElements && panelElements.listContainer) {
            const currentlySelectedIds = Array.from(
                panelElements.listContainer.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}:checked`)
            ).map(cb => cb.value);
            S.saveModelSelection(currentlySelectedIds);
        }

        const updateBtn = document.querySelector(`.${VISUAL_DATA.classes.listToolbar} button`);
        if (updateBtn) {
            updateBtn.disabled = true;
            updateBtn.textContent = '...';
        }

        setPanelState('configured');
        renderPrompts();
        panelElements.listContainer.innerHTML = VISUAL_DATA.text.loading;
        const raw = localStorage.getItem(APP_CONFIG.storageKeys.persistAuth);
        if (!raw) { panelElements.listContainer.innerHTML = '<span style="color:#ff4d4d">Token not found</span>'; return; }
        const token = unquote(JSON.parse(raw).accessToken);
        try {
            const topModelsUrl = APP_CONFIG.api.baseUrl() + APP_CONFIG.api.endpoints.topModels;
            const customModelsUrl = APP_CONFIG.api.baseUrl() + APP_CONFIG.api.endpoints.customModels;
            const headers = { 'Authorization': 'Bearer ' + token };

            const [topModelsRes, customModelsRes] = await Promise.all([
                fetch(topModelsUrl, { headers }),
                fetch(customModelsUrl, { headers })
            ]);

            if (!topModelsRes.ok) throw new Error(`Top Models API Error: HTTP ${topModelsRes.status}`);
            if (!customModelsRes.ok) throw new Error(`Custom Models API Error: HTTP ${customModelsRes.status}`);

            const topModelsData = await topModelsRes.json();
            const customModelsData = await customModelsRes.json();

            const customModels = customModelsData.map(c => ({
                id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                isLocked: c.isLocked,
                isCustom: true,
                isAnime: false
            }));

            const allModels = [...topModelsData, ...customModels];
            S.saveModels(allModels);
            renderList();

        } catch (e) {
            panelElements.listContainer.innerHTML = `<span style="color:#ff4d4d">API Error: ${e.message}</span>`;
            await delay(APP_CONFIG.delays.long);
            if(S.models() === null) {
                   setPanelState('initial');
                   panelElements.parseBtn.disabled = false;
            }
        }
    }

    /**
     * @description Fetches and caches the admin token for privileged actions.
     * @returns {Promise<string|null>} The admin access token, or null if fetching fails.
     */
    async function getAdminToken() {
        if (adminTokenCache) {
            return adminTokenCache;
        }

        try {
            const response = await fetch(APP_CONFIG.api.baseUrl() + APP_CONFIG.api.endpoints.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(APP_CONFIG.api.adminCreds)
            });
            if (!response.ok) throw new Error(`Admin auth failed: ${response.status}`);
            const data = await response.json();
            adminTokenCache = data.accessToken;
            return adminTokenCache;
        } catch (error) {
            console.error('Failed to get admin token:', error);
            alert('Failed to get admin token. Pre-gen actions will fail.');
            return null;
        }
    }

    /**
     * @description Retrieves the current user's ID from localStorage.
     * @returns {string|null} The user ID, or null if not found.
     */
    function getUserIdFromLocalStorage() {
        try {
            const persistUserRaw = localStorage.getItem(APP_CONFIG.storageKeys.persistUser);
            if (!persistUserRaw) return null;
            const persistUser = JSON.parse(persistUserRaw);
            const userJson = JSON.parse(persistUser.user);
            return userJson.id;
        } catch (error) {
            console.error("Could not parse userId from localStorage", error);
            return null;
        }
    }

    /**
     * @description Executes pre-generation actions (restore or delete) using the admin token.
     * @param {string} personId The ID of the model to perform the action on.
     */
    async function handlePreGenAction(personId) {
        const action = sessionStorage.getItem(APP_CONFIG.storageKeys.preGenAction);
        if (!action || action === 'none') return;

        const adminToken = await getAdminToken();
        if (!adminToken) {
            console.error("[Pre-gen Action] Admin token is missing. Action cannot be performed.");
            alert("Admin token is missing. Pre-gen action will be skipped.");
            return;
        }

        const userId = getUserIdFromLocalStorage();
        if (!userId) {
            alert("Could not find current user's ID.");
            return;
        }

        if (action === 'restore') {
            const url = APP_CONFIG.api.baseUrl() + APP_CONFIG.api.endpoints.restorePregens(userId, personId);
            console.log(`%c[Pre-gen Action] Sending RESTORE request: ${url}`, 'color: #f0ad4e;');
            try {
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                });
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                console.log(`%c[Pre-gen Action] Successfully restored pre-gens for personId: ${personId}`, 'color: #5cb85c;');
            } catch (error) {
                console.error(`Failed to restore pre-gens for ${personId}:`, error);
                alert(`Failed to restore pre-gens for ${personId}.`);
            }
        } else if (action === 'delete') {
            const url = APP_CONFIG.api.baseUrl() + APP_CONFIG.api.endpoints.deletePregens;
            const body = { userId, personId };
            console.log(`%c[Pre-gen Action] Sending DELETE request to ${url} with body:`, 'color: #d9534f;', body);
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                console.log(`%c[Pre-gen Action] Successfully deleted pre-gens for personId: ${personId}`, 'color: #5cb85c;');
            } catch (error) {
                console.error(`Failed to delete pre-gens for ${personId}:`, error);
                alert(`Failed to delete pre-gens for ${personId}.`);
            }
        }
    }

    /**
     * @description Starts the chat testing process.
     * @param {boolean} [runHere=false] If true, runs the test only in the currently open chat.
     */
    async function startTests(runHere = false) {
        testCancelled = false;
        let modelIds;

        if (runHere) {
            const match = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
            if (!match) { return; }
            modelIds = [match[1]];
        } else {
            modelIds = Array.from(panelElements.listContainer.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}:checked`)).map(cb => cb.value);
            if (!modelIds.length) { alert('Please select models to test!'); return; }
        }

        const action = document.querySelector('input[name="pregen_action"]:checked').value;
        sessionStorage.setItem(APP_CONFIG.storageKeys.preGenAction, action);

        if (action !== 'none') {
            const token = await getAdminToken();
            if (!token) {
                alert('Could not get admin token. Aborting test.');
                return;
            }
        }

        const tasks = [];
        panelElements.promptsContainer.querySelectorAll(`.${VISUAL_DATA.classes.promptEntry}`).forEach(entry => {
            const prompt = entry.querySelector(`.${VISUAL_DATA.classes.promptInput}`).value;
            const count = parseInt(entry.querySelector(`.${VISUAL_DATA.classes.countInput}`).value, 10) || 1;
            const delayInSeconds = parseFloat(entry.querySelector(`.${VISUAL_DATA.classes.delayInput}`).value) || 0;
            if (prompt) { tasks.push({ prompt, count, delay: delayInSeconds }); }
        });
        if (!tasks.length) { alert('Please enter at least one prompt!'); return; }

        S.saveTasks(tasks);
        S.saveModelSelection(modelIds);
        S.saveQueue(modelIds);
        S.saveCompleted([]);
        S.startTesting();

        if (runHere) {
            setPanelState('testing');
            initializeProgressBar();
            renderList();
            executeTestForSingleModel();
        } else {
            window.location.href = `${APP_CONFIG.api.baseUrl()}/chat/${modelIds[0]}`;
        }
    }

    /**
     * @description Executes all defined tasks (prompts) for the currently open chat model.
     */
    async function runAllTasksForCurrentModel() {
        if (!S.isTesting()) return;

        const currentIdMatch = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
        if (currentIdMatch) {
            const personId = currentIdMatch[1];
            await handlePreGenAction(personId);
        }

        await handlePageUnlock();

        const tasks = S.tasks();
        const textarea = await waitFor(APP_CONFIG.selectors.chat.textarea);
        if (testCancelled || !textarea) return;

        const totalModels = S.modelSelection().length;
        const completedModels = S.completed().length;
        const queue = S.queue();

        for (let i = 0; i < tasks.length; i++) {
            if (testCancelled) return;
            const task = tasks[i];
            panelElements.taskProgress.textContent = `Model ${completedModels + 1}/${totalModels} | Task ${i + 1}/${tasks.length}`;

            for (let j = 0; j < task.count; j++) {
                if (testCancelled) return;
                setNativeValue(textarea, task.prompt);
                textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

                const isLastRepetition = j === task.count - 1;
                const isLastTask = i === tasks.length - 1;
                const isLastModel = queue.length <= 1;

                if (task.delay > 0 && !(isLastTask && isLastModel && isLastRepetition)) {
                    await delay(task.delay * 1000);
                } else {
                    await delay(APP_CONFIG.delays.general);
                }
            }
        }
    }

    /**
     * @description Finalizes the test when `runHere` mode is used.
     */
    async function executeTestForSingleModel() {
        await runAllTasksForCurrentModel();
        if (testCancelled) return;
        S.saveCompleted(S.modelSelection());
        sessionStorage.removeItem(APP_CONFIG.storageKeys.testInProgress);
        setPanelState('completed');
        renderList();
        panelElements.taskProgress.classList.remove(VISUAL_DATA.classes.hidden);
        panelElements.taskProgress.textContent = VISUAL_DATA.text.testCompleted;
        sessionStorage.setItem(APP_CONFIG.storageKeys.testCompletedFlag, 'true');
    }

    /**
     * @description Main process loop for multi-model chat tests. Runs tasks for the current model and navigates to the next one.
     */
    async function processMultiModelTest() {
        if (!S.isTesting() || testCancelled) return;
        await runAllTasksForCurrentModel();
        if (testCancelled) return;

        const currentIdMatch = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
        if (!currentIdMatch) {
            console.error("Could not determine current model ID to proceed.");
            testCancelled = true;
            return;
        }
        const currentId = currentIdMatch[1];
        const completed = S.completed();
        if (!completed.includes(currentId)) {
            completed.push(currentId);
            S.saveCompleted(completed);
        }

        let queue = S.queue();
        const currentIndexInQueue = queue.indexOf(currentId);
        if (currentIndexInQueue > -1) {
            queue.splice(currentIndexInQueue, 1);
        } else {
            queue = S.modelSelection().filter(id => !S.completed().includes(id));
        }
        S.saveQueue(queue);

        if (queue.length > 0) {
            const tasks = S.tasks();
            const lastTask = tasks[tasks.length - 1];
            const delayInSeconds = lastTask ? (lastTask.delay || 0) : 0;
            setTimeout(() => {
                if (testCancelled) return;
                window.location.href = `${APP_CONFIG.api.baseUrl()}/chat/${queue[0]}`;
            }, delayInSeconds * 1000);
        } else {
            sessionStorage.removeItem(APP_CONFIG.storageKeys.testInProgress);
            setPanelState('completed');
            renderList();
            panelElements.taskProgress.classList.remove(VISUAL_DATA.classes.hidden);
            panelElements.taskProgress.textContent = VISUAL_DATA.text.testCompleted;
            sessionStorage.setItem(APP_CONFIG.storageKeys.testCompletedFlag, 'true');
        }
    }

    /**
     * @description Starts the gift sending process.
     * @param {boolean} [runHere=false] If true, runs only in the currently open chat.
     */
    async function startGiftSending(runHere = false) {
        testCancelled = false;
        let modelIds;

        if (runHere) {
            const match = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
            if (!match) {
                alert("This feature only works on a chat page.");
                return;
            }
            modelIds = [match[1]];
        } else {
            modelIds = Array.from(panelElements.listContainer.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}:checked`)).map(cb => cb.value);
            if (!modelIds.length) {
                alert('Please select models to send gifts to!');
                return;
            }
        }

        const tasks = [];
        let validationFailed = false;
        panelElements.promptsContainer.querySelectorAll(`.${VISUAL_DATA.classes.promptEntry}`).forEach(entry => {
            if (validationFailed) return;
            const promptValue = entry.querySelector(`.${VISUAL_DATA.classes.promptInput}`).value.trim();
            if (!promptValue) return; // Skip empty prompts

            const giftIndex = parseInt(promptValue, 10);
            if (isNaN(giftIndex) || giftIndex < 1 || giftIndex > 9) {
                alert(`Invalid gift index: "${promptValue}". Please enter a number between 1 and 9.`);
                validationFailed = true;
                return;
            }

            const count = parseInt(entry.querySelector(`.${VISUAL_DATA.classes.countInput}`).value, 10) || 1;
            const delayInSeconds = parseFloat(entry.querySelector(`.${VISUAL_DATA.classes.delayInput}`).value) || 0;
            tasks.push({ prompt: giftIndex.toString(), count, delay: delayInSeconds });
        });

        if (validationFailed) return;
        if (!tasks.length) {
            alert('Please enter at least one valid gift index (1-9)!');
            return;
        }

        S.saveTasks(tasks);
        S.saveModelSelection(modelIds);
        S.saveGiftQueue(modelIds);
        S.saveCompleted([]);
        S.startGifting();

        if (runHere) {
            setPanelState('testing');
            initializeProgressBar();
            renderList();
            await processMultiModelGifts(); // Await this to finish for the single model
        } else {
            window.location.href = `${APP_CONFIG.api.baseUrl()}/chat/${modelIds[0]}`;
        }
    }

    /**
     * @description Executes all defined gift tasks for the currently open chat model.
     */
    async function runAllGiftsForCurrentModel() {
        if (!S.isGifting()) return;
        await handlePageUnlock();

        const tasks = S.tasks();
        if (testCancelled) return;

        const totalModels = S.modelSelection().length;
        const completedModels = S.completed().length;
        const queue = S.giftQueue();

        for (let i = 0; i < tasks.length; i++) {
            if (testCancelled) return;
            const task = tasks[i];
            const giftIndex = parseInt(task.prompt, 10);
            panelElements.taskProgress.textContent = `Model ${completedModels + 1}/${totalModels} | Gift #${giftIndex}`;

            for (let j = 0; j < task.count; j++) {
                if (testCancelled) return;
                try {
                    // 1. Open gift list
                    const giftListBtn = await waitFor(APP_CONFIG.selectors.gifts.openGiftListBtnXpath, true);
                    giftListBtn.click();
                    await delay(APP_CONFIG.delays.short);

                    // 2. Select gift
                    const giftItem = await waitFor(APP_CONFIG.selectors.gifts.giftItemXpath(giftIndex), true);
                    giftItem.click();
                    await delay(APP_CONFIG.delays.short);

                    // 3. Send gift
                    const sendBtn = await waitFor(APP_CONFIG.selectors.gifts.sendGiftBtn);
                    sendBtn.click();

                    // Wait a bit for the action to complete
                    await delay(APP_CONFIG.delays.long);

                } catch (e) {
                    console.error(`Failed to send gift ${giftIndex} on repetition ${j+1}:`, e);
                    // Decide whether to stop or continue. For now, we log and continue.
                }

                const isLastRepetition = j === task.count - 1;
                const isLastTask = i === tasks.length - 1;
                const isLastModel = queue.length <= 1;

                // Apply delay if specified, except for the very last action of all
                if (task.delay > 0 && !(isLastTask && isLastModel && isLastRepetition)) {
                    await delay(task.delay * 1000);
                } else {
                    await delay(APP_CONFIG.delays.general);
                }
            }
        }
    }

    /**
     * @description Main process loop for multi-model gift sending. Runs tasks and navigates.
     */
    async function processMultiModelGifts() {
        if (!S.isGifting() || testCancelled) return;
        await runAllGiftsForCurrentModel();
        if (testCancelled) return;

        const currentIdMatch = location.pathname.match(/\/chat\/(.+)$/) || location.pathname.match(/\/premium-models\/(.+)$/);
        if (!currentIdMatch) {
            console.error("Could not determine current model ID to proceed with gifts.");
            testCancelled = true;
            return;
        }
        const currentId = currentIdMatch[1];
        const completed = S.completed();
        if (!completed.includes(currentId)) {
            completed.push(currentId);
            S.saveCompleted(completed);
        }

        let queue = S.giftQueue();
        const currentIndexInQueue = queue.indexOf(currentId);
        if (currentIndexInQueue > -1) {
            queue.splice(currentIndexInQueue, 1);
        } else {
            queue = S.modelSelection().filter(id => !S.completed().includes(id));
        }
        S.saveGiftQueue(queue);

        if (queue.length > 0) {
            const tasks = S.tasks();
            const lastTask = tasks[tasks.length - 1];
            const delayInSeconds = lastTask ? (lastTask.delay || 0) : 0;
            setTimeout(() => {
                if (testCancelled) return;
                window.location.href = `${APP_CONFIG.api.baseUrl()}/chat/${queue[0]}`;
            }, delayInSeconds * 1000);
        } else {
            S.clearGiftProgress();
            setPanelState('completed');
            renderList();
            panelElements.taskProgress.classList.remove(VISUAL_DATA.classes.hidden);
            panelElements.taskProgress.textContent = VISUAL_DATA.text.giftsCompleted;
        }
    }


    /**
     * @description Gets the appropriate button ID for image generation based on the desired count.
     * @param {string} prefix The common prefix for the button IDs.
     * @param {number} count The desired number of images.
     * @returns {string} The full button ID.
     */
    function getImageGenCountButtonId(prefix, count) {
        if (count <= 1) return `${prefix}1`;
        if (count <= 4) return `${prefix}4`;
        if (count <= 16) return `${prefix}16`;
        if (count <= 32) return `${prefix}32`;
        return `${prefix}64`;
    }

    /**
     * @description Gets the appropriate button ID for video generation based on the desired count.
     * @param {string} prefix The common prefix for the button IDs.
     * @param {number} count The desired number of videos.
     * @returns {string} The full button ID.
     */
    function getVideoGenCountButtonId(prefix, count) {
        if (count <= 1) return `${prefix}1`;
        if (count === 2) return `${prefix}2`;
        return `${prefix}4`;
    }

    /**
     * @description Starts the standalone photo or video generation process.
     * @param {'photo'|'video'} genType The type of generation to start.
     */
    function startGeneration(genType) {
        testCancelled = false;
        const allModels = S.models();
        if (!allModels) {
            alert('Please parse models first.');
            return;
        }
        const selectedModelIds = new Set(Array.from(panelElements.listContainer.querySelectorAll(`.${VISUAL_DATA.classes.modelCheckbox}:checked`)).map(cb => cb.value));
        if (selectedModelIds.size === 0) {
            alert(`Please select at least one model for ${genType} generation.`);
            return;
        }

        const tasks = [];
        panelElements.promptsContainer.querySelectorAll(`.${VISUAL_DATA.classes.promptEntry}`).forEach(entry => {
            const prompt = entry.querySelector(`.${VISUAL_DATA.classes.promptInput}`).value.trim();
            if (prompt) {
                const count = parseInt(entry.querySelector(`.${VISUAL_DATA.classes.countInput}`).value, 10) || 1;
                const delay = parseFloat(entry.querySelector(`.${VISUAL_DATA.classes.delayInput}`).value) || 0;
                tasks.push({ prompt, count, delay });
            }
        });
        if (!tasks.length || !tasks.every(t => t.prompt)) {
            alert(`Please enter a prompt for every task field for ${genType} generation.`);
            return;
        }
        S.saveTasks(tasks);

        const modelsToProcess = allModels.filter(m => selectedModelIds.has(m.id));
        S.saveModelSelection(modelsToProcess.map(m => m.id));
        S.saveCompleted([]);

        if (genType === 'photo') {
            S.savePhotoGenQueue(modelsToProcess);
            S.startPhotoGening();
            window.location.href = `${APP_CONFIG.api.baseUrl()}/ai-girlfriend-generator`;
        } else {
            S.saveVideoGenQueue(modelsToProcess);
            S.startVideoGening();
            window.location.href = `${APP_CONFIG.api.baseUrl()}/ai-girlfriend-video-generator`;
        }
    }

    const startPhotoGeneration = () => startGeneration('photo');
    const startVideoGeneration = () => startGeneration('video');

    /**
     * @description Main process loop for standalone generation. Selects character, sets prompt, and triggers generation.
     * @param {object} options Configuration for the generation process.
     */
    async function processGeneration(options) {
        const { getQueue, saveQueue, clearProgress, processName, generateButtonId, getCountButtonId, countButtonPrefix } = options;
        if (!options.isGening() || testCancelled) return;

        const queue = getQueue();
        const finishGeneration = () => {
            sessionStorage.removeItem(`honey${processName.replace(' ','')}InProgress`);
            S.saveCompleted(S.modelSelection());
            setPanelState('completed');
            renderList();
            panelElements.taskProgress.classList.remove(VISUAL_DATA.classes.hidden);
            panelElements.taskProgress.textContent = (processName === 'Photo Gen')
                ? VISUAL_DATA.text.photoGenCompleted
                : VISUAL_DATA.text.videoGenCompleted;
        };

        if (queue.length === 0) {
            finishGeneration();
            return;
        }

        const currentModel = queue[0];
        const totalModels = S.modelSelection().length;
        const completedModels = S.completed().length;
        setPanelState('testing');
        renderList();

        try {
            const S_PHOTO = APP_CONFIG.selectors.photoGen;
            const tasks = S.tasks();
            if (!tasks.length) throw new Error('Could not find tasks in session.');

            const chooseCharBtn = await waitFor(S_PHOTO.chooseCharBtn);
            console.log('Clicking "Choose Character"...');
            chooseCharBtn.click();

            if (currentModel.isCustom) {
                const myAiBtn = await waitFor(S_PHOTO.myAiCategoryBtnXpath, true);
                myAiBtn.click();
            } else {
                const categoryBtnId = currentModel.isAnime ? S_PHOTO.animeCategoryBtn : S_PHOTO.realisticCategoryBtn;
                const categoryBtn = await waitFor(categoryBtnId);
                categoryBtn.click();
            }

            const modelXPath = S_PHOTO.modelSelectBtnXpath(currentModel.firstName);
            const modelButton = await waitForAndScroll(modelXPath, S_PHOTO.modelSelectScrollContainer);

            if (currentModel.isCustom && currentModel.isLocked) {
                console.log(`Unlocking and selecting locked custom model: ${currentModel.firstName}`);
                modelButton.click();
                await delay(APP_CONFIG.delays.uiUpdate);
                modelButton.click();
            } else {
                modelButton.click();
            }

            const selectBtn = await waitFor(S_PHOTO.confirmSelectBtn);
            selectBtn.click();

            for (let i = 0; i < tasks.length; i++) {
                if (testCancelled) break;
                const task = tasks[i];
                panelElements.taskProgress.textContent = `${processName} ${completedModels + 1}/${totalModels}: ${currentModel.firstName} (Prompt ${i + 1}/${tasks.length})`;

                const promptTextarea = await waitFor(S_PHOTO.promptTextarea);
                setNativeValue(promptTextarea, '');
                await delay(APP_CONFIG.delays.short);
                setNativeValue(promptTextarea, task.prompt);

                const countButtonId = getCountButtonId(countButtonPrefix, task.count);
                const numBtn = await waitFor(`${countButtonId}`);
                numBtn.click();

                const generateBtn = await waitForButtonEnabled(`${generateButtonId}`);
                generateBtn.click();
                await waitForButtonEnabled(`${generateButtonId}`);

                const isLastTask = i === tasks.length - 1;
                const isLastModel = queue.length <= 1;
                if (task.delay > 0 && !(isLastTask && isLastModel)) {
                    await delay(task.delay * 1000);
                }
            }

            const completed = S.completed();
            completed.push(currentModel.id);
            S.saveCompleted(completed);

            queue.shift();
            saveQueue(queue);

            if (queue.length > 0 && !testCancelled) {
                window.location.reload();
            } else {
                finishGeneration();
            }
        } catch (error) {
            alert(`An error occurred during ${processName.toLowerCase()} for ${currentModel.firstName}: ${error.message}`);
            console.error(error);
            testCancelled = true;
            clearProgress();
            setPanelState('configured');
            renderList();
        }
    }

    /**
     * @description Handles unlocking a chat page if it's locked behind a paywall/button.
     */
    async function handlePageUnlock() {
        if (isHandlingRedirect) return;
        isHandlingRedirect = true;
        try {
            const S_CHAT = APP_CONFIG.selectors.chat;
            console.log("Checking page state: waiting for unlock button OR chat field...");

            const firstVisibleElement = await Promise.race([
                waitFor(S_CHAT.unlockPremium),
                waitFor(S_CHAT.unlockChatBtnXpath, true),
                waitFor(S_CHAT.textarea)
            ]);

            if (firstVisibleElement.id === 'unlock_premium' || firstVisibleElement.id === 'unlock_chat_btn') {
                const elementId = firstVisibleElement.id || 'unlock_chat_btn';
                console.log(`Unlock button found (${elementId}). Clicking...`);
                firstVisibleElement.click();
                await waitFor(S_CHAT.textarea);
                console.log("Chat unlocked successfully.");
            } else if (firstVisibleElement.id === 'chat_field') {
                console.log("Chat field found directly. Page is already unlocked.");
            }
        } catch (error) {
            console.error("Failed to handle page unlock.", error);
        } finally {
            isHandlingRedirect = false;
        }
    }

    /**
     * @description Filters the model list based on the search input's value.
     * @param {Event} event The input event from the search field.
     */
    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const isSearching = searchTerm.length > 0;

        panelElements.listContainer.querySelectorAll('details').forEach(details => {
            if (details.classList.contains('select-all-spoiler')) return;

            let hasVisibleModel = false;
            details.querySelectorAll(`.${VISUAL_DATA.classes.row}[data-model-name]`).forEach(row => {
                if (row.dataset.modelName.includes(searchTerm)) {
                    row.style.display = 'flex';
                    hasVisibleModel = true;
                } else {
                    row.style.display = 'none';
                }
            });

            if (hasVisibleModel) {
                details.style.display = 'block';
                if (isSearching) {
                    details.open = true;
                }
            } else {
                details.style.display = 'none';
            }
        });
    }

    /**
     * @description Initializes and updates the progress bar text during a test.
     */
    function initializeProgressBar() {
        if (!S.isTesting() && !S.isGifting() && !S.isPhotoGening() && !S.isVideoGening()) return;
        const modelSelection = S.modelSelection();
        const totalModels = modelSelection.length;
        const completedCount = S.completed().length;
        let mode = 'Test';
        if (S.isPhotoGening()) mode = 'Photo Gen';
        if (S.isVideoGening()) mode = 'Video Gen';
        if (S.isGifting()) mode = 'Gift';
        panelElements.taskProgress.textContent = `${mode} ${completedCount + 1}/${totalModels}`;
    }

    /**
     * @description Checks if a redirect is needed (e.g., from a chat page to a generation page).
     */
    function checkProcessState() {
        if (isHandlingRedirect) return;

        const handleRedirect = (path) => {
            isHandlingRedirect = true;
            handlePageUnlock().then(() => {
                window.location.href = `${APP_CONFIG.api.baseUrl()}${path}`;
            });
        };

        if (S.isPhotoGening() && location.pathname.includes('/premium-models/')) {
            handleRedirect('/ai-girlfriend-generator');
        } else if (S.isVideoGening() && location.pathname.includes('/premium-models/')) {
            handleRedirect('/ai-girlfriend-video-generator');
        }
    }

    /**
     * @description The main function to initialize the entire UI and script logic on page load.
     */
    function initializeUI() {
        if (!location.hostname.includes(APP_CONFIG.siteHostname)) return;
        if (document.querySelector(`.${VISUAL_DATA.classes.panel}`) || panelClosedByUser) {
            return;
        }

        injectStyles();
        createPanel();

        const isTesting = S.isTesting();
        const isGifting = S.isGifting();
        const isPhotoGening = S.isPhotoGening();
        const isVideoGening = S.isVideoGening();
        const isViewingCompleted = !isTesting && !isGifting && !isPhotoGening && !isVideoGening && S.completed().length > 0;

        if (isTesting) {
            setPanelState('testing');
            initializeProgressBar();
            processMultiModelTest();
        } else if (isGifting) {
            setPanelState('testing');
            initializeProgressBar();
            processMultiModelGifts();
        } else if (isPhotoGening) {
            renderPrompts();
            if (location.pathname.includes('/ai-girlfriend-generator')) {
                processGeneration({
                    isGening: S.isPhotoGening,
                    getQueue: S.photoGenQueue,
                    saveQueue: S.savePhotoGenQueue,
                    clearProgress: S.clearPhotoGenProgress,
                    processName: 'Photo Gen',
                    getCountButtonId: getImageGenCountButtonId,
                    countButtonPrefix: APP_CONFIG.selectors.photoGen.countBtnPrefix,
                    generateButtonId: APP_CONFIG.selectors.photoGen.generateBtn
                });
            }
        } else if (isVideoGening) {
            renderPrompts();
            if (location.pathname.includes('/ai-girlfriend-video-generator')) {
                 processGeneration({
                    isGening: S.isVideoGening,
                    getQueue: S.videoGenQueue,
                    saveQueue: S.saveVideoGenQueue,
                    clearProgress: S.clearVideoGenProgress,
                    processName: 'Video Gen',
                    getCountButtonId: getVideoGenCountButtonId,
                    countButtonPrefix: APP_CONFIG.selectors.videoGen.countBtnPrefix,
                    generateButtonId: APP_CONFIG.selectors.videoGen.generateBtn
                });
            }
        } else if (isViewingCompleted) {
            setPanelState('completed');
            if (sessionStorage.getItem(APP_CONFIG.storageKeys.testCompletedFlag)) {
                panelElements.taskProgress.classList.remove(VISUAL_DATA.classes.hidden);
                panelElements.taskProgress.textContent = VISUAL_DATA.text.testCompleted;
                sessionStorage.removeItem(APP_CONFIG.storageKeys.testCompletedFlag);
            }
        } else if (S.models()) {
            setPanelState('configured');
            renderPrompts();
        } else {
            setPanelState('initial');
        }
        renderList();

        setInterval(() => {
            if (panelElements && panelElements.runHereBtn && !panelElements.runHereBtn.classList.contains(VISUAL_DATA.classes.hidden)) {
                const isChatPage = location.pathname.includes('/chat/') || location.pathname.includes('/premium-models/');
                panelElements.runHereBtn.disabled = !isChatPage;
                panelElements.runHereGiftsBtn.disabled = !isChatPage;
            }
        }, APP_CONFIG.delays.uiUpdate);

        makeDraggable(panelElements.panel);
        initializePanelPosition(panelElements.panel);
    }

    // --- SCRIPT INITIALIZATION ---
    // An interval checks periodically to initialize the UI, making it compatible with single-page applications.
    setInterval(() => {
        checkProcessState();
        initializeUI();
    }, APP_CONFIG.delays.init);

})();
