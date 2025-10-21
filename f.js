        document.addEventListener('DOMContentLoaded', () => {
            
            const fileInput = document.getElementById('file-input');
            const tocToggle = document.getElementById('toc-toggle');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const settingsToggle = document.getElementById('settings-toggle');
            const settingsPopover = document.getElementById('settings-popover');
            const bookmarkToggle = document.getElementById('bookmark-toggle');
            const notesToggle = document.getElementById('notes-toggle');
            const readAloudBtn = document.getElementById('read-aloud-btn');
            const sidebar = document.getElementById('sidebar');
            const main = document.getElementById('main');
            const tocList = document.getElementById('toc');
            const contentFrame = document.getElementById('content-frame');
            const bookTitle = document.getElementById('book-title');
            const pageProgress = document.getElementById('page-progress');
            const readingTimeEl = document.getElementById('reading-time');
            const uploadArea = document.getElementById('upload-area');
            const loader = document.getElementById('loader');
            const readerUi = document.getElementById('reader-ui');
            const progressBar = document.getElementById('progress-bar');
            const selectionPopover = document.getElementById('text-selection-popover');
            const dictionaryModal = document.getElementById('dictionary-modal');
            const notepadModal = document.getElementById('notepad-modal');
            const fileInfo = document.getElementById('file-info');
            const fullscreenBtn = document.getElementById('fullscreen-btn');
            const tocFilter = document.getElementById('toc-filter');
            const clearHistoryBtn = document.getElementById('clear-history-btn');
            const fontSizeSlider = document.getElementById('font-size-slider');
            const lineHeightSlider = document.getElementById('line-height-slider');
            const toggleImagesCb = document.getElementById('toggle-images-cb');
            const toggleDictionaryCb = document.getElementById('toggle-dictionary-cb');

          
            let book = null;
            let manifest = {};
            let spine = [];
            let toc = [];
            let currentSpineIndex = 0;
            let rootPath = '';
            let currentBookTitle = 'EPUB Reader';
            let currentBookNotes = '';
            let currentBookBookmarks = [];
            let history = [];
            
            
            let readerSettings = {
                theme: 'light',
                fontSize: 100,
                lineHeight: 1.7,
                imagesVisible: true,
                dictionaryEnabled: true
            };

            
            loadSettings();
            loadHistory();

           
            if (fileInput) fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
            if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
            if (tocFilter) tocFilter.addEventListener('input', () => filterToc(tocFilter.value));
            
            tocToggle.addEventListener('click', toggleSidebar);
            prevBtn.addEventListener('click', prevPage);
            nextBtn.addEventListener('click', nextPage);
            settingsToggle.addEventListener('click', toggleSettings);
            bookmarkToggle.addEventListener('click', toggleBookmark);
            notesToggle.addEventListener('click', toggleNotepad);
            readAloudBtn.addEventListener('click', toggleReadAloud);
            clearHistoryBtn.addEventListener('click', clearHistory);
            
            document.addEventListener('click', (e) => {
                if (!settingsPopover.contains(e.target) && !settingsToggle.contains(e.target) && settingsPopover.style.display === 'block') {
                    settingsPopover.style.display = 'none';
                }
                if (!selectionPopover.contains(e.target)) {
                    selectionPopover.style.display = 'none';
                }
            });
            
            settingsPopover.addEventListener('click', (e) => {
                const button = e.target.closest('.btn-setting');
                if (button) {
                    applySetting(button.dataset.setting, button.dataset.value);
                }
            });

            fontSizeSlider.addEventListener('input', (e) => applySetting('fontSize', e.target.value));
            lineHeightSlider.addEventListener('input', (e) => applySetting('lineHeight', e.target.value));
            toggleImagesCb.addEventListener('change', (e) => applySetting('imagesVisible', e.target.checked));
            toggleDictionaryCb.addEventListener('change', (e) => applySetting('dictionaryEnabled', e.target.checked));
            
            document.querySelectorAll('.sidebar-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(tab.dataset.tab).classList.add('active');
                });
            });

            function applySetting(setting, value) {
                readerSettings[setting] = value;
                saveSettings();
                updateUIForSettings();
            }

            function updateUIForSettings() {
                document.body.className = `${readerSettings.theme}-theme`;

                settingsPopover.querySelectorAll('.btn-setting[data-setting="theme"]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === readerSettings.theme);
                });

                fontSizeSlider.value = readerSettings.fontSize;
                lineHeightSlider.value = readerSettings.lineHeight;
                toggleImagesCb.checked = readerSettings.imagesVisible;
                toggleDictionaryCb.checked = readerSettings.dictionaryEnabled;

                applyReaderStyles();
            }
            
            function loadSettings() {
                const savedSettings = localStorage.getItem('epubReaderSettings');
                if (savedSettings) {
                    readerSettings = {...readerSettings, ...JSON.parse(savedSettings)};
                }
                updateUIForSettings();
            }
            
            function saveSettings() {
                localStorage.setItem('epubReaderSettings', JSON.stringify(readerSettings));
            }
            
            function toggleSettings() {
                settingsPopover.style.display = settingsPopover.style.display === 'block' ? 'none' : 'block';
            }

            function toggleSidebar() {
                sidebar.classList.toggle('open');
                main.classList.toggle('sidebar-open');
            }
            
            tocList.addEventListener('click', (e) => {
                let target = e.target.closest('li');
                if (target && target.dataset.src) {
                    const src = target.dataset.src;
                    const pathParts = src.split('#');
                    const spineIndex = spine.findIndex(item => item.path.endsWith(pathParts[0]));
                    
                    if (spineIndex !== -1) {
                        loadSpineItem(spineIndex);
                        if (pathParts[1]) {
                            setTimeout(() => scrollToAnchor(pathParts[1]), 200);
                        }
                    }
                    if (sidebar.classList.contains('open')) {
                        toggleSidebar();
                    }
                }
            });
            
            function scrollToAnchor(anchor) {
                const iframeDoc = contentFrame.contentDocument || contentFrame.contentWindow.document;
                const element = iframeDoc.getElementById(anchor) || iframeDoc.getElementsByName(anchor)[0];
                if (element) element.scrollIntoView();
            }
            
            ['dragover', 'dragenter'].forEach(eventName => {
                document.body.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
            });

            ['dragleave', 'dragend', 'drop'].forEach(eventName => {
                document.body.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                });
            });
            
            document.body.addEventListener('drop', (e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            function handleFile(file) {
                if (file && file.name.endsWith('.epub')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const fileData = event.target.result;
                        addToHistory(file.name, file.size, fileData);
                        loadBook(fileData, file.name);
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Please select a valid .epub file.');
                }
            }

            async function loadBook(fileData, fileName) {
                resetReader(true);
                uploadArea.style.display = 'none';
                loader.style.display = 'flex';
                
                try {
                    const base64Data = fileData.substring(fileData.indexOf(',') + 1);
                    book = await JSZip.loadAsync(base64Data, {base64: true});
                    
                    const containerXml = await book.file("META-INF/container.xml").async("string");
                    const parser = new DOMParser();
                    const containerDoc = parser.parseFromString(containerXml, "application/xml");
                    const opfPath = containerDoc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                    rootPath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

                    const opfXml = await book.file(opfPath).async("string");
                    const opfDoc = parser.parseFromString(opfXml, "application/xml");
                    
                    parseMetadata(opfDoc);
                    fileInfo.textContent = fileName;
                    parseManifest(opfDoc);
                    parseSpine(opfDoc);
                    await parseToc(opfDoc);
                    
                    loadNotes();
                    loadBookmarks();

                    renderToc();
                    if (spine.length > 0) {
                        const savedPosition = localStorage.getItem(`epubPos-${currentBookTitle}`);
                        currentSpineIndex = (savedPosition && savedPosition < spine.length) ? parseInt(savedPosition, 10) : 0;
                        
                        await loadSpineItem(currentSpineIndex);
                        enableControls();
                        loader.style.display = 'none';
                        readerUi.style.display = 'block';
                    }
                } catch (error) {
                    console.error("Error loading EPUB:", error);
                    alert("Failed to load EPUB file. It might be corrupted or in an unsupported format.");
                    resetReader();
                }
            }
            
            function resetReader(openingFile = false) {
                book = null;
                manifest = {};
                spine = [];
                toc = [];
                currentSpineIndex = 0;
                rootPath = '';
                tocList.innerHTML = '';
                bookTitle.textContent = 'EPUB Reader';
                pageProgress.textContent = '';
                readingTimeEl.textContent = '';
                contentFrame.srcdoc = '';
                
                if (!openingFile) {
                   uploadArea.style.display = 'flex';
                   readerUi.style.display = 'none';
                }
                loader.style.display = 'none';
                disableControls();
                fileInfo.textContent = '';
            }

            function parseMetadata(opfDoc) {
                const titleElement = opfDoc.querySelector("metadata > dc\\:title");
                if (titleElement) {
                    currentBookTitle = titleElement.textContent;
                    bookTitle.textContent = currentBookTitle;
                }
            }

            function parseManifest(opfDoc) {
                Array.from(opfDoc.getElementsByTagName("item")).forEach(item => {
                    manifest[item.id] = {
                        href: item.getAttribute("href"),
                        mediaType: item.getAttribute("media-type"),
                        properties: item.getAttribute("properties")
                    };
                });
            }

            function parseSpine(opfDoc) {
                Array.from(opfDoc.getElementsByTagName("itemref")).forEach(item => {
                    const idref = item.getAttribute("idref");
                    if (manifest[idref]) {
                        spine.push({
                            id: idref,
                            path: resolvePath(manifest[idref].href, rootPath)
                        });
                    }
                });
            }

            async function parseToc(opfDoc) {
                const ncxId = opfDoc.querySelector("spine")?.getAttribute("toc");
                let navPath;
                
                const navItem = Object.values(manifest).find(item => item.properties === 'nav');
                if (navItem) {
                    navPath = resolvePath(navItem.href, rootPath);
                    const navHtml = await book.file(navPath).async("string");
                    const navDoc = new DOMParser().parseFromString(navHtml, "text/html");
                    const navLinks = navDoc.querySelectorAll("nav[epub\\:type='toc'] ol a");
                    toc = Array.from(navLinks).map(link => ({
                        label: link.textContent.trim(),
                        src: resolvePath(link.getAttribute("href"), navPath.substring(0, navPath.lastIndexOf('/') + 1))
                    }));
                } else if (ncxId && manifest[ncxId] && manifest[ncxId].mediaType === "application/x-dtbncx+xml") {
                    navPath = resolvePath(manifest[ncxId].href, rootPath);
                    const ncxXml = await book.file(navPath).async("string");
                    const ncxDoc = new DOMParser().parseFromString(ncxXml, "application/xml");
                    toc = Array.from(ncxDoc.getElementsByTagName("navPoint")).map(navPoint => ({
                        label: navPoint.getElementsByTagName("text")[0].textContent,
                        src: resolvePath(navPoint.getElementsByTagName("content")[0].getAttribute("src"), navPath.substring(0, navPath.lastIndexOf('/') + 1))
                    }));
                }
            }

            function renderToc() {
                tocList.innerHTML = toc.map(item => `<li data-src="${item.src}">${item.label}</li>`).join('');
            }

            async function loadSpineItem(index) {
                if (index < 0 || index >= spine.length) return;
                
                currentSpineIndex = index;
                const item = spine[index];
                
                try {
                    const htmlString = await book.file(item.path).async("string");
                    const processedHtml = await inlineResources(htmlString, item.path);
                    
                    return new Promise(resolve => {
                        contentFrame.onload = () => {
                            const iframeDoc = contentFrame.contentDocument || contentFrame.contentWindow.document;
                            const iframeWin = contentFrame.contentWindow;
                            
                            applyReaderStyles();
                            updateReadingTime();
                            
                            const currentBasePath = spine[currentSpineIndex].path.substring(0, spine[currentSpineIndex].path.lastIndexOf('/') + 1);
                            
                            iframeDoc.addEventListener('click', (e) => {
                                let target = e.target.closest('a');
                                if (target && target.getAttribute('href')) {
                                    e.preventDefault();
                                    handleLinkClick(target.getAttribute('href'), currentBasePath);
                                }
                            });
                            
                            iframeDoc.addEventListener('mouseup', (e) => {
                                const selection = iframeWin.getSelection().toString().trim();
                                if (selection.length > 0) {
                                    selectionPopover.style.display = 'block';
                                    const rect = contentFrame.getBoundingClientRect();
                                    selectionPopover.style.left = `${e.clientX + rect.left + window.scrollX}px`;
                                    selectionPopover.style.top = `${e.clientY + rect.top + window.scrollY - 40}px`;
                                } else {
                                    selectionPopover.style.display = 'none';
                                }
                            });
                            
                            iframeDoc.addEventListener('dblclick', (e) => {
                                if (!readerSettings.dictionaryEnabled) return;
                                const selection = iframeWin.getSelection();
                                let word = selection.toString().trim().toLowerCase();
                                if (word.length > 0 && word.split(' ').length === 1) {
                                    fetchDefinition(word);
                                }
                            });
                            resolve();
                        };
                        contentFrame.srcdoc = processedHtml;
                    });

                } catch (error) {
                    console.error("Error loading spine item:", item.path, error);
                    contentFrame.srcdoc = `<p>Error loading chapter.</p>`;
                } finally {
                    updateNavState();
                    localStorage.setItem(`epubPos-${currentBookTitle}`, currentSpineIndex);
                }
            }
            
            function applyReaderStyles() {
                const iframeDoc = contentFrame.contentDocument || contentFrame.contentWindow.document;
                if (!iframeDoc || !iframeDoc.head) return;
                
                let style = iframeDoc.getElementById('reader-settings-style');
                if (!style) {
                    style = iframeDoc.createElement('style');
                    style.id = 'reader-settings-style';
                    iframeDoc.head.appendChild(style);
                }
                
                const themeColors = {
                    light: { bg: '#ffffff', fg: '#0a0a0a' },
                    sepia: { bg: '#fbf0d9', fg: '#5b4636' },
                    dark: { bg: '#1a1a1a', fg: '#fafafa' }
                };
                const currentTheme = themeColors[readerSettings.theme];

                style.textContent = `
                    body { 
                        margin: 0 auto; 
                        padding: 2rem 3rem !important;
                        line-height: ${readerSettings.lineHeight};
                        font-size: ${readerSettings.fontSize}%;
                        font-family: ${readerSettings.fontFamily || 'sans-serif'} !important;
                        color: ${currentTheme.fg} !important;
                        background-color: ${currentTheme.bg} !important;
                        box-sizing: border-box;
                        transition: color 0.3s, background-color 0.3s;
                    }
                    @media (max-width: 768px) {
                        body { padding: 1.5rem 1rem !important; }
                    }
                    ::selection { background: #b3d4fc; }
                    img, svg, video { 
                        max-width: 100%; 
                        height: auto;
                        display: ${readerSettings.imagesVisible ? 'block' : 'none'};
                    }
                    a { color: var(--primary); text-decoration: none; }
                    a:hover { text-decoration: underline; }
                `;
            }
            
            function handleLinkClick(href, base) {
                const resolvedPath = resolvePath(href, base);
                const pathParts = resolvedPath.split('#');
                const spineIndex = spine.findIndex(item => item.path === pathParts[0]);

                if (spineIndex !== -1) {
                    loadSpineItem(spineIndex);
                    if (pathParts[1]) {
                        setTimeout(() => scrollToAnchor(pathParts[1]), 200);
                    }
                }
            }
            
            async function inlineResources(htmlString, htmlPath) {
                const basePath = htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1);
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlString, 'text/html');

                for (const link of doc.querySelectorAll('link[href][rel="stylesheet"]')) {
                    const path = resolvePath(link.getAttribute('href'), basePath);
                    try {
                        const style = doc.createElement('style');
                        style.textContent = await book.file(path).async("string");
                        link.parentNode.replaceChild(style, link);
                    } catch (e) { console.warn("Could not load CSS:", path, e); }
                }

                for (const img of doc.querySelectorAll('img[src], image[href]')) {
                    const attr = img.hasAttribute('src') ? 'src' : 'href';
                    const path = resolvePath(img.getAttribute(attr), basePath);
                    try {
                        const file = book.file(path);
                        if (file) img.setAttribute(attr, await blobToDataURL(await file.async("blob")));
                    } catch (e) { console.warn("Could not load image:", path, e); }
                }
                return doc.documentElement.outerHTML;
            }

            function resolvePath(path, base) {
                if (path.startsWith('/') || path.includes(':')) return path.startsWith('/') ? path.substring(1) : path;
                const parts = base.split('/').filter(p => p);
                path.split('/').forEach(part => {
                    if (part === '..') parts.pop();
                    else if (part !== '.') parts.push(part);
                });
                return parts.join('/');
            }

            function blobToDataURL(blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            function prevPage() {
                if (currentSpineIndex > 0) loadSpineItem(currentSpineIndex - 1);
            }

            function nextPage() {
                if (currentSpineIndex < spine.length - 1) loadSpineItem(currentSpineIndex + 1);
            }
            
            function updateNavState() {
                prevBtn.disabled = currentSpineIndex === 0;
                nextBtn.disabled = currentSpineIndex === spine.length - 1;
                
                pageProgress.textContent = `Page ${currentSpineIndex + 1} of ${spine.length}`;
                progressBar.style.width = `${((currentSpineIndex + 1) / spine.length) * 100}%`;
                
                updateActiveToc();
                updateBookmarkButton();
            }
            
            function toggleFullscreen() {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    });
                } else {
                    document.exitFullscreen();
                }
            }

            function filterToc(query) {
                const q = query.trim().toLowerCase();
                document.querySelectorAll('#toc li').forEach(li => {
                    const txt = li.textContent.trim().toLowerCase();
                    li.style.display = txt.includes(q) ? '' : 'none';
                });
            }

            function updateActiveToc() {
                const currentPath = spine[currentSpineIndex].path;
                let bestMatch = null;
                tocList.querySelectorAll('li').forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.src && currentPath.endsWith(item.dataset.src.split('#')[0])) {
                        bestMatch = item;
                    }
                });
                if (bestMatch) bestMatch.classList.add('active');
            }
            
            function enableControls() {
                tocToggle.disabled = false;
                bookmarkToggle.disabled = false;
                notesToggle.disabled = false;
                readAloudBtn.disabled = false;
                if(fullscreenBtn) fullscreenBtn.disabled = false;
                updateNavState();
            }

            function disableControls() {
                tocToggle.disabled = true;
                bookmarkToggle.disabled = true;
                notesToggle.disabled = true;
                readAloudBtn.disabled = true;
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                if(fullscreenBtn) fullscreenBtn.disabled = true;
            }
            
            document.addEventListener('keydown', (e) => {
                if (!book) return;
                const activeEl = document.activeElement;
                if (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT') return;
                
                const keyMap = { 'ArrowLeft': prevPage, 'ArrowRight': nextPage, 'h': prevPage, 'l': nextPage };
                if(keyMap[e.key]) keyMap[e.key]();

                if (e.key === 'k' || e.key === 'j') {
                    contentFrame.contentWindow.scrollBy(0, e.key === 'k' ? -50 : 50);
                }
            });
            
            selectionPopover.addEventListener('click', () => {
                const selectedText = contentFrame.contentWindow.getSelection().toString();
                const chapterTitle = toc.find(item => spine[currentSpineIndex].path.endsWith(item.src.split('#')[0]))?.label || `Chapter ${currentSpineIndex + 1}`;
                
                const citation = `\n\n--- (From "${chapterTitle}")\n"${selectedText}"`;
                notepadModal.querySelector('textarea').value += citation;
                saveNotes();
                
                contentFrame.contentWindow.getSelection().removeAllRanges();
                selectionPopover.style.display = 'none';
                
                if (notepadModal.style.display !== 'flex') {
                    toggleNotepad();
                }
            });
            
            async function fetchDefinition(word) {
                document.getElementById('dictionary-modal-word').textContent = word;
                document.getElementById('dictionary-modal-content').innerHTML = '<i>Loading...</i>';
                dictionaryModal.style.display = 'block';
                try {
                    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                    if (!response.ok) throw new Error('No definition found.');
                    
                    const data = await response.json();
                    const entry = data[0];
                    let html = '';
                    
                    entry.meanings.forEach(meaning => {
                        html += `<h4>${meaning.partOfSpeech}</h4>`;
                        meaning.definitions.forEach((def, index) => {
                            html += `<p><b>${index + 1}.</b> ${def.definition}</p>`;
                            if (def.example) html += `<p><i>"${def.example}"</i></p>`;
                        });
                    });
                    document.getElementById('dictionary-modal-content').innerHTML = html;
                    
                } catch (error) {
                    document.getElementById('dictionary-modal-content').textContent = 'No definition found for this word.';
                }
            }
            
            document.getElementById('dictionary-modal-close').addEventListener('click', () => {
                dictionaryModal.style.display = 'none';
            });
            
            function toggleNotepad() {
                notepadModal.style.display = notepadModal.style.display === 'flex' ? 'none' : 'flex';
                notesToggle.classList.toggle('active', notepadModal.style.display === 'flex');
            }
            
            function loadNotes() {
                currentBookNotes = localStorage.getItem(`epubNotes-${currentBookTitle}`) || '';
                notepadModal.querySelector('textarea').value = currentBookNotes;
            }
            
            function saveNotes() {
                currentBookNotes = notepadModal.querySelector('textarea').value;
                localStorage.setItem(`epubNotes-${currentBookTitle}`, currentBookNotes);
            }
            
            notepadModal.querySelector('textarea').addEventListener('keyup', saveNotes);
            document.getElementById('notepad-close').addEventListener('click', toggleNotepad);
            
            function toggleBookmark() {
                const existingIndex = currentBookBookmarks.findIndex(b => b.spineIndex === currentSpineIndex);
                if (existingIndex > -1) {
                    currentBookBookmarks.splice(existingIndex, 1);
                } else {
                    const chapter = toc.find(item => spine[currentSpineIndex].path.endsWith(item.src.split('#')[0]));
                    currentBookBookmarks.push({
                        spineIndex: currentSpineIndex,
                        title: chapter ? chapter.label : `Page ${currentSpineIndex + 1}`,
                        date: new Date().toLocaleDateString()
                    });
                }
                saveBookmarks();
                renderBookmarks();
                updateBookmarkButton();
            }
            
            function loadBookmarks() {
                currentBookBookmarks = JSON.parse(localStorage.getItem(`epubBookmarks-${currentBookTitle}`)) || [];
                renderBookmarks();
            }
            
            function saveBookmarks() {
                localStorage.setItem(`epubBookmarks-${currentBookTitle}`, JSON.stringify(currentBookBookmarks));
            }
            
            function renderBookmarks() {
                const list = document.getElementById('bookmarks-list');
                const emptyMsg = document.querySelector('.bookmarks-empty');
                if (currentBookBookmarks.length === 0) {
                    list.innerHTML = '';
                    emptyMsg.style.display = 'block';
                    return;
                }
                emptyMsg.style.display = 'none';
                list.innerHTML = currentBookBookmarks.map((bookmark, index) => `
                    <li data-index="${index}">
                        <div>
                            <div class="item-title">${bookmark.title}</div>
                            <div class="item-meta">${bookmark.date}</div>
                        </div>
                        <i class="fa-solid fa-trash item-remove"></i>
                    </li>
                `).join('');
            }
            
            document.getElementById('bookmarks-list').addEventListener('click', (e) => {
                const target = e.target;
                const li = target.closest('li');
                if (!li) return;
                
                const index = parseInt(li.dataset.index, 10);
                if (target.classList.contains('item-remove')) {
                    currentBookBookmarks.splice(index, 1);
                    saveBookmarks();
                    renderBookmarks();
                    updateBookmarkButton();
                } else {
                    loadSpineItem(currentBookBookmarks[index].spineIndex);
                    if (sidebar.classList.contains('open')) toggleSidebar();
                }
            });
            
            function updateBookmarkButton() {
                const isBookmarked = currentBookBookmarks.some(b => b.spineIndex === currentSpineIndex);
                bookmarkToggle.innerHTML = isBookmarked ? '<i class="fa-solid fa-bookmark"></i>' : '<i class="fa-regular fa-bookmark"></i>';
                bookmarkToggle.classList.toggle('active', isBookmarked);
            }
            
            function loadHistory() {
                history = JSON.parse(localStorage.getItem('epubHistory')) || [];
                renderHistory();
            }

            function saveHistory() {
                localStorage.setItem('epubHistory', JSON.stringify(history.slice(0, 20))); 
            }
            
            function addToHistory(name, size, data) {
                history = history.filter(item => item.name !== name); 
                history.unshift({ name, size, data, lastOpened: Date.now() });
                saveHistory();
                renderHistory();
            }

            function renderHistory() {
                const list = document.getElementById('history-list');
                const emptyMsg = document.querySelector('.history-empty');
                 if (history.length === 0) {
                    list.innerHTML = '';
                    emptyMsg.style.display = 'block';
                    return;
                }
                emptyMsg.style.display = 'none';
                list.innerHTML = history.map((item, index) => `
                    <li data-index="${index}">
                        <div>
                            <div class="item-title">${item.name}</div>
                            <div class="item-meta">${Math.round(item.size / 1024)} KB - ${new Date(item.lastOpened).toLocaleDateString()}</div>
                        </div>
                    </li>
                `).join('');
            }

            document.getElementById('history-list').addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (li) {
                    const index = parseInt(li.dataset.index, 10);
                    const book = history[index];
                    loadBook(book.data, book.name);
                    if (sidebar.classList.contains('open')) toggleSidebar();
                }
            });

            function clearHistory() {
                if (confirm('Are you sure you want to clear your reading history?')) {
                    history = [];
                    saveHistory();
                    renderHistory();
                }
            }

            function updateReadingTime() {
                try {
                    const text = contentFrame.contentDocument.body.innerText;
                    const wordCount = text.trim().split(/\s+/).length;
                    const wpm = 200;
                    const time = Math.ceil(wordCount / wpm);
                    readingTimeEl.textContent = `~${time} min read`;
                } catch(e) {
                    readingTimeEl.textContent = '';
                }
            }
            
            function toggleReadAloud() {
                const synth = window.speechSynthesis;
                if (synth.speaking) {
                    synth.cancel();
                    readAloudBtn.classList.remove('active');
                    return;
                }
                try {
                    const text = contentFrame.contentWindow.document.body.innerText || '';
                    const utter = new SpeechSynthesisUtterance(text.replace(/(\r\n|\n|\r)/gm, " ").slice(0, 30000));
                    synth.speak(utter);
                    readAloudBtn.classList.add('active');
                    utter.onend = () => readAloudBtn.classList.remove('active');
                } catch (e) { console.warn(e); }
            }

            makeDraggable(document.getElementById('notepad-modal'));
            function makeDraggable(element) {
                let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
                const header = element.querySelector("#notepad-header");
                if (header) {
                    header.onmousedown = dragMouseDown;
                } else {
                    element.onmousedown = dragMouseDown;
                }
                function dragMouseDown(e) {
                    e = e || window.event;
                    e.preventDefault();
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    document.onmouseup = closeDragElement;
                    document.onmousemove = elementDrag;
                }
                function elementDrag(e) {
                    e = e || window.event;
                    e.preventDefault();
                    pos1 = pos3 - e.clientX;
                    pos2 = pos4 - e.clientY;
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    element.style.top = (element.offsetTop - pos2) + "px";
                    element.style.left = (element.offsetLeft - pos1) + "px";
                }
                function closeDragElement() {
                    document.onmouseup = null;
                    document.onmousemove = null;
                }
            }
        });
