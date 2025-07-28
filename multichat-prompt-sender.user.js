// ==UserScript==
// @name         MultiChat Prompt Sender
// @namespace    https://your-namespace.example.com
// @version      2025.07.28.1
// @description  Auto prompt sender in the chats after parsing models for current user
// @author       Bohdan S.
// @match        *://*/*
// @exclude      https://form-v2.charge-auth.com/*
// @exclude      https://pay.google.com/*
// @icon         https://cdn-icons-png.flaticon.com/512/5962/5962463.png
// @require      https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bohdan-gen-tech/MultiChat-Prompt-Sender/main/multichat-prompt-sender.user.js
// @downloadURL  https://raw.githubusercontent.com/bohdan-gen-tech/MultiChat-Prompt-Sender/main/multichat-prompt-sender.user.js
// ==/UserScript==
// ==/UserScript==

(function() {
    'use strict';

    let testCancelled = false;
    let panelClosedByUser = false;

    // --- CONFIGURATION ---
    const config = {
        storageKeys: {
            position: 'honeyTesterPosition',
            collapsed: 'honeyTesterCollapsed',
        }
    };

    // --- STATE & STORAGE HELPERS ---
    const S = {
        models: () => JSON.parse(sessionStorage.getItem('honeyModels') || 'null'),
        saveModels: (m) => sessionStorage.setItem('honeyModels', JSON.stringify(m)),
        tasks: () => JSON.parse(sessionStorage.getItem('honeyTasks') || '[]'),
        saveTasks: (t) => sessionStorage.setItem('honeyTasks', JSON.stringify(t)),
        modelSelection: () => JSON.parse(sessionStorage.getItem('honeyModelSelection') || '[]'),
        saveModelSelection: (m) => sessionStorage.setItem('honeyModelSelection', JSON.stringify(m)),
        queue: () => JSON.parse(sessionStorage.getItem('honeyQueue') || '[]'),
        saveQueue: (q) => sessionStorage.setItem('honeyQueue', JSON.stringify(q)),
        completed: () => JSON.parse(sessionStorage.getItem('honeyCompleted') || '[]'),
        saveCompleted: (c) => sessionStorage.setItem('honeyCompleted', JSON.stringify(c)),
        isTesting: () => sessionStorage.getItem('honeyTestInProgress') === 'true',
        startTesting: () => sessionStorage.setItem('honeyTestInProgress', 'true'),
        clearTestProgress: () => {
            ['honeyQueue', 'honeyCompleted', 'honeyTestInProgress'].forEach(k => sessionStorage.removeItem(k));
        }
    };

    // --- UTILITY FUNCTIONS ---
    function unquote(str) { return str.replace(/^"|"$/g, ''); }
    function setNativeValue(el, value) {
        const last = el.value;
        el.value = value;
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(last);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    function waitFor(sel) {
        return new Promise(res => {
            const iv = setInterval(() => {
                if (testCancelled) { clearInterval(iv); return; }
                const el = document.querySelector(sel);
                if (el) { clearInterval(iv); res(el); }
            }, 300);
        });
    }

    // --- STYLES ---
    function injectStyles() {
        const styles = `
           .honey-panel { position: fixed; bottom: 20px; right: 20px; background-color: #1a1c20; color: #e0e0e0; border: 1px solid #333; border-radius: 8px; padding: 0; z-index: 9999; box-shadow: 0 5px 20px rgba(0,0,0,0.5); width: 350px; font-family: 'Inter', 'Segoe UI', sans-serif; overflow: hidden; font-size: 11px; }
           .honey-panel-header { display: flex; align-items: center; justify-content: space-between; background: #111; padding: 0 8px 0 12px; margin: 0; border-bottom: 1px solid #444; height: 28px; cursor: move; user-select: none; }
           .honey-panel-header-title { font-weight: bold; font-family: monospace; }
           .honey-panel-controls { display: flex; align-items: center; height: 100%; gap: 4px; }
           .honey-panel-header-btn {
                border: none; background: transparent; color: #aaa; cursor: pointer;
                font-size: 16px; line-height: 1; transition: all 0.2s;
                width: 24px; height: 24px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
           .honey-panel-header-btn:hover { color: #fff; background-color: #2f3136; }
           .honey-panel-body { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
           .honey-btn { width: 100%; padding: 7px; cursor: pointer; border-radius: 5px; border: 1px solid #00aaff; background-color: #00aaff; color: #fff; font-size: 11px; font-weight: bold; transition: background-color 0.2s, opacity 0.2s;}
           .honey-btn:disabled { background-color: #555; border-color: #555; opacity: 0.6; cursor: not-allowed; font-size: 11px;}
           .honey-btn:not(:disabled):hover { background-color: #0088cc; }
           .honey-btn.run-here-btn { background-color: #f0ad4e; border-color: #f0ad4e; margin-top: -4px; font-size: 11px;}
           .honey-btn.run-here-btn:hover:not(:disabled) { background-color: #ec971f; }
           .honey-btn.cancel-btn { background-color: #d9534f; border-color: #d9534f; font-size: 11px;}
           .honey-btn.cancel-btn:hover { background-color: #c9302c; }
           .honey-btn.add-prompt-btn { background-color: #5cb85c; border-color: #5cb85c; margin-top: 2px; padding: 5px; font-size: 11px;}
           .honey-btn.add-prompt-btn:hover { background-color: #4cae4c; }
           .honey-input { flex: 1; padding: 5px 5px; background: #2c2f33; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; font-size: 11px;}
           .honey-input::placeholder { color: #888; font-size: 11px;}
           .honey-list-container { max-height: 220px; overflow-y: auto; background: #25282c; padding: 8px; border-radius: 6px; border: 1px solid #333; }
           .honey-row, .honey-master-controls { display: flex; align-items: center; padding: 3px; border-radius: 4px; transition: background-color 0.2s; }
           .honey-row:hover { background-color: #33373c; }
           .honey-row label { margin-left: 6px; cursor: pointer; flex-grow: 1; transition: color 0.2s; }
           details { margin-top: 5px; }
           details summary { cursor: pointer; font-weight: bold; padding: 5px; border-radius: 4px; display: flex; align-items: center; list-style: none; }
           details summary:hover { background-color: #33373c; }
           details summary::before { content: '▶'; font-size: 9px; margin-right: 8px; transition: transform 0.2s; }
           details[open] > summary::before { transform: rotate(90deg); }
           .summary-label { margin-left: 6px; cursor: pointer; }
           .summary-counter { margin-left: auto; color: #999; padding-right: 5px;}
           .honey-group-header { font-weight: bold; padding: 6px 4px; margin-top: 5px; border-bottom: 1px solid #333; }
           .prompt-entry { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
           .remove-prompt-btn { background: #d9534f; border: none; color: white; border-radius: 4px; cursor: pointer; width: 20px; height: 27px; font-size: 11px; font-weight: bold; flex-shrink: 0; padding: 5px 5px; margin:0; display:flex; align-items:center; justify-content:center; }
           .task-progress-indicator { text-align: center; font-weight: bold; padding: 4px; background-color: #2c2f33; border-radius: 4px; margin-bottom: 8px; }
           .honey-row.current { background-color: #00aaff22; border-left: 3px solid #00aaff; padding-left: 1px;}
           .honey-row.completed .progress-icon::before { content: '✔'; color: #28a745; margin-right: 6px; font-weight: bold; }
           .honey-row.completed label { color: #777; text-decoration: line-through; }
           .honey-panel .honey-hidden { display: none !important; }
           .honey-goto-btn { display: flex; align-items: center; justify-content: center; text-decoration: none; color: #aaa; background-color: #3a3f44; border: 1px solid #555; border-radius: 4px; width: 20px; height: 20px; margin-left: auto; flex-shrink: 0; transition: background-color 0.2s, color 0.2s; }
           .honey-goto-btn:hover { background-color: #00aaff; color: #fff; }
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);
    }

    // --- DRAGGABLE & PANEL STATE FUNCTIONS ---
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
            localStorage.setItem(config.storageKeys.position, JSON.stringify({ left: container.offsetLeft, top: container.offsetTop }));
        };
        dragHandle.addEventListener('mousedown', onDragStart); dragHandle.addEventListener('touchstart', onDragStart, { passive: false });
    }

    function initializePanelPosition(container) {
        const savedPos = localStorage.getItem(config.storageKeys.position);
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
            localStorage.setItem(config.storageKeys.position, JSON.stringify(initialPos));
        }
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    };

    function handleToggleCollapse(button, body) {
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? 'flex' : 'none';
        button.textContent = isCollapsed ? '−' : '⊞';
        button.title = isCollapsed ? 'Collapse' : 'Expand';
        localStorage.setItem(config.storageKeys.collapsed, JSON.stringify(!isCollapsed));
    }

    // --- UI & RENDERING ---
    let panelElements;

    function createPanel() {
        panelElements = {};
        const p = panelElements;
        p.panel = document.createElement('div'); p.panel.className = 'honey-panel';
        const isCollapsed = JSON.parse(localStorage.getItem(config.storageKeys.collapsed)) || false;
        p.header = document.createElement('div'); p.header.className = 'honey-panel-header'; p.header.dataset.handle = 'drag';
        p.header.innerHTML = `
           <span class="honey-panel-header-title">MultiChat Prompt Sender</span>
           <div class="honey-panel-controls">
               <button class="honey-panel-header-btn" data-action="import" title="Import Prompts">📥</button>
               <button class="honey-panel-header-btn" data-action="export" title="Export Prompts">📤</button>
               <button class="honey-panel-header-btn" data-action="toggle-collapse" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '⊞' : '−'}</button>
               <button class="honey-panel-header-btn" data-action="close" title="Close">×</button>
           </div>
        `;
        p.body = document.createElement('div'); p.body.className = 'honey-panel-body'; p.body.style.display = isCollapsed ? 'none' : 'flex';
        p.parseBtn = document.createElement('button'); p.parseBtn.textContent = 'Parse Models'; p.parseBtn.className = 'honey-btn';
        p.promptsContainer = document.createElement('div');
        p.addPromptBtn = document.createElement('button'); p.addPromptBtn.textContent = '+ Add Prompt'; p.addPromptBtn.className = 'honey-btn add-prompt-btn';
        p.searchInput = document.createElement('input'); p.searchInput.className = 'honey-input'; p.searchInput.placeholder = '🔎 Search for model...';
        p.listContainer = document.createElement('div'); p.listContainer.className = 'honey-list-container';
        p.testBtn = document.createElement('button'); p.testBtn.textContent = 'Start Test'; p.testBtn.className = 'honey-btn';
        p.runHereBtn = document.createElement('button'); p.runHereBtn.textContent = 'Run in Opened Chat'; p.runHereBtn.className = 'honey-btn run-here-btn';
        p.newTestBtn = document.createElement('button'); p.newTestBtn.textContent = 'Start New Test'; p.newTestBtn.className = 'honey-btn';
        p.cancelBtn = document.createElement('button'); p.cancelBtn.textContent = 'Cancel Test'; p.cancelBtn.className = 'honey-btn cancel-btn';
        p.taskProgress = document.createElement('div'); p.taskProgress.className = 'task-progress-indicator';
        p.fileInput = document.createElement('input'); p.fileInput.type = 'file'; p.fileInput.accept = ".xlsx, .xls"; p.fileInput.style.display = 'none';

        p.body.append(p.parseBtn, p.promptsContainer, p.addPromptBtn, p.searchInput, p.listContainer, p.taskProgress, p.testBtn, p.runHereBtn, p.newTestBtn, p.cancelBtn, p.fileInput);
        p.panel.append(p.header, p.body);
        document.body.append(p.panel);

        p.header.querySelector('[data-action="close"]').addEventListener('click', () => {
            p.panel.remove();
            panelClosedByUser = true;
        });
        const collapseBtn = p.header.querySelector('[data-action="toggle-collapse"]');
        collapseBtn.addEventListener('click', () => handleToggleCollapse(collapseBtn, p.body));
        p.header.querySelector('[data-action="import"]').addEventListener('click', () => p.fileInput.click());
        p.header.querySelector('[data-action="export"]').addEventListener('click', handleExport);
        p.fileInput.addEventListener('change', handleImport);
        p.parseBtn.addEventListener('click', fetchAndRender);
        p.addPromptBtn.addEventListener('click', () => addPromptField());
        p.testBtn.addEventListener('click', () => startTests(false));
        p.runHereBtn.addEventListener('click', () => startTests(true));
        p.newTestBtn.addEventListener('click', () => { S.clearTestProgress(); setPanelState('configured'); renderPrompts(); renderList(); });
        p.cancelBtn.addEventListener('click', () => { testCancelled = true; S.clearTestProgress(); setPanelState('configured'); renderPrompts(); renderList(); });
        p.searchInput.addEventListener('input', handleSearch);
    }

    function createValidatedInput(placeholder, defaultValue, allowZero, isFloat = false, maxLength = null, maxValue = null) {
        const input = document.createElement('input');
        input.className = 'honey-input'; input.type = 'text'; input.inputMode = isFloat ? 'decimal' : 'numeric'; input.placeholder = placeholder; input.value = defaultValue; input.style.minWidth = '25px'; input.style.flexShrink = '0';
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

    function addPromptField(prompt = '', count = '', delay = '') {
        const entry = document.createElement('div');
        entry.className = 'prompt-entry';
        const promptInput = document.createElement('input');
        promptInput.className = 'honey-input prompt-input';
        promptInput.placeholder = 'Chat Prompt';
        promptInput.value = prompt;
        const countInput = createValidatedInput('#', count, false, false, 2);
        countInput.classList.add('count-input');
        countInput.style.flex = '0 0 20px';
        countInput.style.textAlign = 'center';
        countInput.title = 'Number of messages to send';
        const delayInput = createValidatedInput('⏱', delay, true, true, 2);
        delayInput.classList.add('delay-input');
        delayInput.style.flex = '0 0 20px';
        delayInput.style.textAlign = 'center';
        delayInput.title = 'Delay between messages (in seconds)';
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-prompt-btn';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove this prompt';
        removeBtn.style.padding = '0';
        removeBtn.style.margin = '0';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.onclick = () => {
            if (panelElements.promptsContainer.querySelectorAll('.prompt-entry').length > 1) {
                entry.remove();
            }
        };
        entry.append(promptInput, countInput, delayInput, removeBtn);
        panelElements.promptsContainer.append(entry);
    }

    function renderPrompts() {
        panelElements.promptsContainer.innerHTML = '';
        const tasks = S.tasks();
        if (tasks.length > 0) { tasks.forEach(task => addPromptField(task.prompt, task.count, task.delay)); }
        else { addPromptField(); }
    }

    function setPanelState(state) {
        const p = panelElements;
        const all = [p.parseBtn, p.promptsContainer, p.addPromptBtn, p.searchInput, p.listContainer, p.taskProgress, p.testBtn, p.runHereBtn, p.newTestBtn, p.cancelBtn];
        all.forEach(el => el.classList.add('honey-hidden'));

        const importBtn = p.header.querySelector('[data-action="import"]');
        const exportBtn = p.header.querySelector('[data-action="export"]');

        if (state === 'initial') {
            p.parseBtn.classList.remove('honey-hidden');
            importBtn.style.display = 'none';
            exportBtn.style.display = 'none';
        } else {
            importBtn.style.display = '';
            exportBtn.style.display = '';
        }

        if (state === 'configured') {
            [p.promptsContainer, p.addPromptBtn, p.searchInput, p.listContainer, p.testBtn, p.runHereBtn].forEach(el => el.classList.remove('honey-hidden'));
            p.runHereBtn.disabled = !location.pathname.includes('/chat/');
        }
        else if (state === 'testing') { [p.taskProgress, p.listContainer, p.cancelBtn].forEach(el => el.classList.remove('honey-hidden')); }
        else if (state === 'completed') { [p.listContainer, p.newTestBtn].forEach(el => el.classList.remove('honey-hidden')); }
    }

    function renderList() {
        const { listContainer } = panelElements;
        listContainer.innerHTML = '';
        let modelsToRender = S.models() || [];
        const isTesting = S.isTesting();
        const isViewingCompleted = !isTesting && S.completed().length > 0;
        const shouldShowResults = isTesting || isViewingCompleted;

        if (shouldShowResults) {
            const testRunIds = new Set(S.modelSelection());
            modelsToRender = modelsToRender.filter(m => testRunIds.has(m.id));
        }
        const groups = { Realistic: [], Anime: [] };
        modelsToRender.forEach(m => groups[m.isAnime ? 'Anime' : 'Realistic'].push(m));
        const completedIds = new Set(S.completed());
        const currentId = location.pathname.match(/\/chat\/(.+)$/)?.[1];

        if (shouldShowResults) {
            ['Realistic', 'Anime'].forEach(groupName => {
                if (groups[groupName].length === 0) return;
                const header = document.createElement('div'); header.className = 'honey-group-header'; header.textContent = `${groupName} (${groups[groupName].length})`; listContainer.append(header);
                groups[groupName].forEach(m => listContainer.append(createModelRow(m, completedIds, currentId, true)));
            });
        } else {
            const previouslySelected = new Set(S.modelSelection());
            ['Realistic', 'Anime'].forEach(groupName => {
                if (groups[groupName].length === 0) return;
                const details = document.createElement('details'); details.className = `group-details-${groupName.toLowerCase()}`;
                const summary = document.createElement('summary');

                const groupCheckboxId = `group-all-${groupName.toLowerCase()}`;
                const groupCheckbox = document.createElement('input');
                groupCheckbox.type = 'checkbox';
                groupCheckbox.id = groupCheckboxId;
                groupCheckbox.dataset.group = groupName.toLowerCase();

                const label = document.createElement('label');
                label.htmlFor = groupCheckboxId;
                label.textContent = groupName;
                label.className = 'summary-label';

                const counterSpan = document.createElement('span');
                counterSpan.className = 'summary-counter';

                summary.append(groupCheckbox, label, counterSpan);
                details.append(summary);

                let hasCheckedModel = false;
                groups[groupName].forEach(m => {
                    const modelRow = createModelRow(m);
                    const checkbox = modelRow.querySelector('input');
                    checkbox.dataset.group = groupName.toLowerCase();
                    if (previouslySelected.has(m.id)) { checkbox.checked = true; hasCheckedModel = true; }
                    details.append(modelRow);
                });
                if (hasCheckedModel) { details.open = true; }
                listContainer.append(details);
            });
            addCheckboxLogic();
        }
    }

    function createModelRow(model, completedIds, currentId, isFlatView = false) {
        const { row, checkbox } = createCheckbox(model.id, `${model.firstName} ${model.lastName}`, 'honey-row', true);
        checkbox.dataset.group = model.isAnime ? 'anime' : 'realistic';
        checkbox.value = model.id;
        if (isFlatView) {
            checkbox.style.display = 'none';
            const icon = document.createElement('span'); icon.className = 'progress-icon'; row.prepend(icon);
            if (completedIds.has(model.id)) { row.classList.add('completed'); }
            if (S.isTesting() && model.id === currentId) { row.classList.add('current'); }
        }

        const isViewingCompleted = !S.isTesting() && S.completed().length > 0;
        if (!isFlatView || isViewingCompleted) {
            const linkBtn = document.createElement('a');
            linkBtn.href = `${location.origin}/chat/${model.id}`;
            linkBtn.className = 'honey-goto-btn';
            linkBtn.textContent = '→';
            linkBtn.title = 'Go to chat';
            linkBtn.addEventListener('click', (e) => e.stopPropagation());
            row.append(linkBtn);
        }
        return row;
    }

    function createCheckbox(id, labelText, className, isModel = false) {
        const row = document.createElement('div'); row.className = className;
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = `cb-${id}`;
        if (isModel) { cb.classList.add('model-checkbox'); row.dataset.modelName = labelText.toLowerCase(); }
        const lbl = document.createElement('label'); lbl.textContent = labelText; lbl.htmlFor = `cb-${id}`;
        row.append(cb, lbl);
        return { row, checkbox: cb, label: lbl };
    }

    function updateGroupCounters() {
        panelElements.listContainer.querySelectorAll('details').forEach(details => {
            const summary = details.querySelector('summary');
            const counterSpan = summary.querySelector('.summary-counter');
            if (!counterSpan) return;
            const total = details.querySelectorAll('.model-checkbox').length;
            const selected = details.querySelectorAll('.model-checkbox:checked').length;
            counterSpan.textContent = `(${selected}/${total})`;
        });
    }

    function addCheckboxLogic() {
        const container = panelElements.listContainer;
        const modelCheckboxes = Array.from(container.querySelectorAll('.model-checkbox'));
        const groupCheckboxes = Array.from(container.querySelectorAll('summary input[type="checkbox"]'));

        const updateAll = () => {
            panelElements.testBtn.disabled = !modelCheckboxes.some(cb => cb.checked);
            groupCheckboxes.forEach(groupCb => {
                const groupName = groupCb.dataset.group;
                const childCheckboxes = modelCheckboxes.filter(cb => cb.dataset.group === groupName);
                if (childCheckboxes.length > 0) {
                    groupCb.checked = childCheckboxes.every(cb => cb.checked);
                }
            });
            updateGroupCounters();
        };

        groupCheckboxes.forEach(groupCb => {
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

    function handleExport() {
        const data = [];
        const entries = panelElements.promptsContainer.querySelectorAll('.prompt-entry');

        entries.forEach(entry => {
            const prompt = entry.querySelector('.prompt-input').value.trim();
            if (prompt) {
                let count = parseInt(entry.querySelector('.count-input').value, 10);
                let delay = parseFloat(entry.querySelector('.delay-input').value);

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

    async function fetchAndRender() {
        panelElements.parseBtn.disabled = true;
        setPanelState('configured');
        renderPrompts();
        panelElements.listContainer.innerHTML = '<em>Loading...</em>';
        const raw = localStorage.getItem('persist:auth');
        if (!raw) { panelElements.listContainer.innerHTML = '<span style="color:#ff4d4d">Token not found</span>'; return; }
        const token = unquote(JSON.parse(raw).accessToken);
        try {
            const res = await fetch(`${location.origin}/api/PersonModel/top`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            S.saveModels(data);
            renderList();
        } catch (e) {
            panelElements.listContainer.innerHTML = `<span style="color:#ff4d4d">API Error: ${e.message}</span>`;
            await delay(3000);
            S.saveModels(null); S.clearTestProgress(); S.saveTasks([]); S.saveModelSelection([]);
            setPanelState('initial');
            panelElements.parseBtn.disabled = false;
        }
    }

    function startTests(runHere = false) {
        testCancelled = false;
        let modelIds;

        if (runHere) {
            const match = location.pathname.match(/\/chat\/(.+)$/);
            if (!match) { return; }
            modelIds = [match[1]];
        } else {
            modelIds = Array.from(panelElements.listContainer.querySelectorAll('.model-checkbox:checked')).map(cb => cb.value);
            if (!modelIds.length) { alert('Please select models to test!'); return; }
        }

        const tasks = [];
        panelElements.promptsContainer.querySelectorAll('.prompt-entry').forEach(entry => {
            const prompt = entry.querySelector('.prompt-input').value;
            const count = parseInt(entry.querySelector('.count-input').value, 10) || 1;
            const delayInSeconds = parseFloat(entry.querySelector('.delay-input').value) || 0;
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
            window.location.href = `${location.origin}/chat/${modelIds[0]}`;
        }
    }

    async function runAllTasksForCurrentModel() {
        const tasks = S.tasks();
        const textarea = await waitFor('#chat_field');
        if (testCancelled) return;

        const totalModels = S.modelSelection().length;
        const completedModels = S.completed().length;

        for (let i = 0; i < tasks.length; i++) {
            if (testCancelled) return;
            const task = tasks[i];
            panelElements.taskProgress.textContent = `Model ${completedModels + 1}/${totalModels} | Task ${i + 1}/${tasks.length}`;
            for (let j = 0; j < task.count; j++) {
                if (testCancelled) return;
                setNativeValue(textarea, task.prompt);
                textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                await delay(200);
            }
            if (task.delay > 0) await delay(task.delay * 1000);
        }
    }

    async function executeTestForSingleModel() {
        await runAllTasksForCurrentModel();
        if (testCancelled) return;

        S.saveCompleted(S.modelSelection());
        sessionStorage.removeItem('honeyTestInProgress');
        setPanelState('completed');
        renderList();
    }


    // NEW LOGIC: This function controls the multi-model test flow.
    async function processMultiModelTest() {
        if (!S.isTesting() || testCancelled) return;

        // Step 1: Execute all tasks for the current model.
        await runAllTasksForCurrentModel();
        if (testCancelled) return;

        // Step 2: Update state after finishing with the current model.
        const currentIdMatch = location.pathname.match(/\/chat\/(.+)$/);
        if (!currentIdMatch) return;
        const currentId = currentIdMatch[1];

        const completed = S.completed();
        if (!completed.includes(currentId)) {
            completed.push(currentId);
            S.saveCompleted(completed);
        }

        const queue = S.queue();
        if (queue[0] === currentId) {
            queue.shift();
            S.saveQueue(queue);
        }

        // Step 3: Decide what to do next.
        if (queue.length > 0) {
            // If there are more models, navigate to the next one.
            setTimeout(() => {
                if (testCancelled) return;
                window.location.href = `${location.origin}/chat/${queue[0]}`;
            }, 500);
        } else {
            // If no more models, the test is complete.
            sessionStorage.removeItem('honeyTestInProgress');
            setPanelState('completed');
            renderList();
        }
    }


    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const isSearching = searchTerm.length > 0;

        panelElements.listContainer.querySelectorAll('details').forEach(details => {
            let hasVisibleModel = false;
            details.querySelectorAll('.honey-row[data-model-name]').forEach(row => {
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

    function initializeProgressBar() {
        if (!S.isTesting()) return;
        const modelSelection = S.modelSelection();
        const totalModels = modelSelection.length;
        const completedCount = S.completed().length;
        panelElements.taskProgress.textContent = `Model ${completedCount + 1}/${totalModels}`;
    }

    function main() {
        if (document.querySelector('.honey-panel') || panelClosedByUser) {
            return;
        }

        injectStyles();
        createPanel();

        const isTesting = S.isTesting();
        const isViewingCompleted = !isTesting && S.completed().length > 0;

        if (isTesting) {
            setPanelState('testing');
            initializeProgressBar();
            // The new logic is simpler: if a test is running, it must be processing the current model.
            processMultiModelTest();
        } else if (isViewingCompleted) {
            setPanelState('completed');
        } else if (S.models()) {
            setPanelState('configured');
            renderPrompts();
        } else {
            setPanelState('initial');
        }
        renderList();

        setInterval(() => {
            if (panelElements && panelElements.runHereBtn && !panelElements.runHereBtn.classList.contains('honey-hidden')) {
                panelElements.runHereBtn.disabled = !location.pathname.includes('/chat/');
            }
        }, 500);

        makeDraggable(panelElements.panel);
        initializePanelPosition(panelElements.panel);
    }

    setInterval(main, 1000);
})();
